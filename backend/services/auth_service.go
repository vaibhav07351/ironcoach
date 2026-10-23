package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type AuthService struct {
	users    *repositories.UserRepository
	trainers *repositories.TrainerRepository
}

func NewAuthService() *AuthService {
	return &AuthService{
		users:    repositories.NewUserRepository(),
		trainers: repositories.NewTrainerRepository(),
	}
}

type GoogleAuthRequest struct {
	IDToken string `json:"id_token" binding:"required"`
	Role    string `json:"role"` // trainer | client; used only on first signup
	// Timezone is the device's IANA zone (optional). Invalid values are ignored.
	Timezone string `json:"timezone"`
	// AcceptTerms confirms the user is 18 or older and accepts the terms and privacy policy.
	// Required to create an account.
	AcceptTerms bool `json:"accept_terms"`
}

type AuthResponse struct {
	Token string            `json:"token"`
	User  models.PublicUser `json:"user"`
}

func (s *AuthService) AuthenticateGoogle(req GoogleAuthRequest) (*AuthResponse, error) {
	info, err := VerifyGoogleIDToken(req.IDToken)
	if err != nil {
		return nil, err
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role != models.RoleTrainer && role != models.RoleClient {
		role = ""
	}
	timezone := strings.TrimSpace(req.Timezone)
	if !validTimezone(timezone) {
		timezone = ""
	}

	existing, findErr := s.users.FindByGoogleSub(info.Sub)
	if findErr != nil && !errors.Is(findErr, mongo.ErrNoDocuments) {
		return nil, findErr
	}
	found := findErr == nil && existing.ID != ""

	// Same email must not exist under a different Google subject / role path.
	if !found {
		byEmail, emailErr := s.users.FindByEmail(info.Email)
		if emailErr != nil && !errors.Is(emailErr, mongo.ErrNoDocuments) {
			return nil, emailErr
		}
		if emailErr == nil && byEmail.ID != "" {
			// The same email under a different Google account (e.g. a deleted and re-created
			// Gmail address) must not take over the existing user.
			if byEmail.GoogleSub != "" && byEmail.GoogleSub != info.Sub {
				return nil, ErrConflict("account_conflict", "this email is linked to a different Google account; contact support")
			}
			existing = byEmail
			found = true
		}
	}

	var user models.User
	if found {
		user = existing
		if role != "" && role != user.Role {
			return nil, errRoleMismatch(user.Role)
		}
		// Refresh profile fields from Google (and backfill google_sub for pre-SSO accounts).
		update := map[string]interface{}{
			"email":      info.Email,
			"name":       info.Name,
			"picture":    info.Picture,
			"google_sub": info.Sub,
		}
		if timezone != "" {
			update["timezone"] = timezone
			user.Timezone = timezone
		}
		if user.TermsAcceptedAt == nil && req.AcceptTerms {
			update["terms_accepted_at"] = time.Now().UTC()
		}
		if err := s.users.Update(user.ID, update); err != nil {
			return nil, err
		}
		user.Email = info.Email
		user.Name = info.Name
		user.Picture = info.Picture
		user.GoogleSub = info.Sub
	} else {
		if role == "" {
			return nil, &Error{Kind: KindValidation, Code: "role_required", Message: "role is required for new users (trainer or client)"}
		}
		if !req.AcceptTerms {
			return nil, &Error{Kind: KindValidation, Code: "terms_required", Message: "confirm you are 18 or older and accept the terms to create an account"}
		}
		now := time.Now()
		acceptedAt := now.UTC()
		onboardingDone := role != models.RoleTrainer // clients skip trainer category gate
		user, err = s.users.UpsertByGoogleSub(models.User{
			GoogleSub:       info.Sub,
			Email:           info.Email,
			Name:            info.Name,
			Picture:         info.Picture,
			Role:            role,
			Timezone:        timezone,
			OnboardingDone:  &onboardingDone,
			TermsAcceptedAt: &acceptedAt,
			CreatedAt:       now,
			UpdatedAt:       now,
		})
		if err != nil {
			return nil, err
		}

		// Upsert can return an existing doc if google_sub already existed; never flip role.
		if user.Role != "" && user.Role != role {
			return nil, errRoleMismatch(user.Role)
		}
	}

	if user.Role == models.RoleTrainer && user.TrainerID != user.ID {
		if err := s.ensureTrainerProfile(user); err != nil {
			return nil, err
		}
		if user, err = s.users.FindByID(user.ID); err != nil {
			return nil, err
		}
	}

	token, err := issueToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  toPublicUser(user),
	}, nil
}

func errRoleMismatch(existingRole string) error {
	msg := "this Google account is already registered with a different role"
	switch existingRole {
	case models.RoleTrainer:
		msg = "this Google account is already registered as a trainer; sign in as a trainer"
	case models.RoleClient:
		msg = "this Google account is already registered as a client; sign in as a client"
	}
	return ErrConflict("role_mismatch", msg)
}

// ensureTrainerProfile makes sure a trainer account has a profile keyed by its user id and that
// users.trainer_id points at the trainer themselves. Safe to call on every trainer sign-in.
func (s *AuthService) ensureTrainerProfile(user models.User) error {
	_, err := s.trainers.FindByUserID(user.ID)
	switch {
	case err == nil:
	case errors.Is(err, mongo.ErrNoDocuments):
		newTrainer := models.Trainer{
			UserID:      user.ID,
			Name:        user.Name,
			Email:       user.Email,
			ImageURL:    user.Picture,
			TrainerType: "personal",
		}
		// A conflict means a concurrent sign-in of the same user created it first.
		if err := NewTrainerService().RegisterTrainer(newTrainer); err != nil && !IsKind(err, KindConflict) {
			return err
		}
	default:
		return err
	}

	if user.TrainerID == user.ID {
		return nil
	}
	return s.users.Update(user.ID, map[string]interface{}{"trainer_id": user.ID})
}

func (s *AuthService) GetMe(userID string) (models.PublicUser, error) {
	user, err := s.users.FindByID(userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.PublicUser{}, ErrNotFound("account")
		}
		return models.PublicUser{}, err
	}
	return toPublicUser(user), nil
}

func toPublicUser(user models.User) models.PublicUser {
	// New trainers get onboarding_done=false until they pick their coaching categories.
	needsOnboarding := user.Role == models.RoleTrainer &&
		(user.TrainerID == "" || (user.OnboardingDone != nil && !*user.OnboardingDone))
	needsInvite := user.Role == models.RoleClient && user.TraineeID == ""
	needsInterests := user.Role == models.RoleClient && len(user.Interests) == 0
	timezone := user.Timezone
	if timezone == "" {
		timezone = DefaultTimezone
	}
	return models.PublicUser{
		ID:              user.ID,
		Email:           user.Email,
		Name:            user.Name,
		Picture:         user.Picture,
		Role:            user.Role,
		TrainerID:       user.TrainerID,
		TraineeID:       user.TraineeID,
		Interests:       user.Interests,
		Timezone:        timezone,
		NeedsOnboarding: needsOnboarding,
		NeedsInvite:     needsInvite,
		NeedsInterests:  needsInterests,
	}
}

// CompleteTrainerExpertise saves coaching categories and marks trainer onboarding done.
func (s *AuthService) CompleteTrainerExpertise(p Principal, expertises []string) (models.PublicUser, error) {
	normalized, ok := models.NormalizeExpertises(expertises)
	if !ok || len(normalized) == 0 {
		return models.PublicUser{}, ErrValidation("invalid expertise code")
	}
	if !p.IsTrainer() {
		return models.PublicUser{}, ErrForbidden("trainers only")
	}
	found, err := s.trainers.UpdateByUserID(p.UserID, bson.M{"expertises": normalized})
	if err != nil {
		return models.PublicUser{}, err
	}
	if !found {
		return models.PublicUser{}, ErrNotFound("trainer profile")
	}
	if err := s.users.Update(p.UserID, map[string]interface{}{"onboarding_done": true}); err != nil {
		return models.PublicUser{}, err
	}
	return s.GetMe(p.UserID)
}

// UpdateClientInterests saves validated interest codes for a client user.
func (s *AuthService) UpdateClientInterests(p Principal, interests []string) (models.PublicUser, error) {
	normalized, ok := models.NormalizeExpertises(interests)
	if !ok {
		return models.PublicUser{}, ErrValidation("invalid interest code")
	}
	if !p.IsClient() {
		return models.PublicUser{}, ErrForbidden("clients only")
	}
	if err := s.users.Update(p.UserID, map[string]interface{}{"interests": normalized}); err != nil {
		return models.PublicUser{}, err
	}
	return s.GetMe(p.UserID)
}

// UpdateSettings changes user preferences; currently the time zone used for days and streaks.
func (s *AuthService) UpdateSettings(p Principal, timezone string) (models.PublicUser, error) {
	if !validTimezone(timezone) {
		return models.PublicUser{}, ErrValidation("timezone must be an IANA zone such as Asia/Kolkata")
	}
	if err := s.users.Update(p.UserID, map[string]interface{}{"timezone": timezone}); err != nil {
		return models.PublicUser{}, err
	}
	return s.GetMe(p.UserID)
}

// TrainerOnboardingInput is the basic profile a new trainer fills in after Google sign-up.
type TrainerOnboardingInput struct {
	PhoneNumber string   `json:"phone_number" binding:"required,len=10,numeric"`
	Speciality  string   `json:"speciality"`
	Expertises  []string `json:"expertises"`
	Bio         string   `json:"bio"`
	TrainerType string   `json:"trainer_type"`
	HourlyRate  float64  `json:"hourly_rate"`
	Name        string   `json:"name"`
}

// CompleteTrainerOnboarding saves the trainer's basic profile and returns the updated profile.
func (s *AuthService) CompleteTrainerOnboarding(p Principal, in TrainerOnboardingInput) (models.Trainer, error) {
	if !p.IsTrainer() {
		return models.Trainer{}, ErrForbidden("trainers only")
	}
	for _, t := range []struct {
		field string
		v     string
		max   int
	}{
		{"name", in.Name, 80}, {"speciality", in.Speciality, 120}, {"bio", in.Bio, 2000}, {"trainer_type", in.TrainerType, 40},
	} {
		if err := validateText(t.field, t.v, false, t.max); err != nil {
			return models.Trainer{}, err
		}
	}
	if err := validateNumber("hourly_rate", in.HourlyRate, 0, 100000); err != nil {
		return models.Trainer{}, err
	}

	update := bson.M{
		"phone_number": in.PhoneNumber,
		"speciality":   in.Speciality,
		"bio":          in.Bio,
	}
	if len(in.Expertises) > 0 {
		normalized, ok := models.NormalizeExpertises(in.Expertises)
		if !ok {
			return models.Trainer{}, ErrValidation("invalid expertise code")
		}
		update["expertises"] = normalized
	}
	if in.Name != "" {
		update["name"] = in.Name
	}
	if in.TrainerType != "" {
		if !models.TrainerTypes[in.TrainerType] {
			return models.Trainer{}, ErrValidation("trainer_type must be personal, group, online or rehabilitation")
		}
		update["trainer_type"] = in.TrainerType
	}
	if in.HourlyRate > 0 {
		update["hourly_rate"] = in.HourlyRate
	}

	found, err := s.trainers.UpdateByUserID(p.UserID, update)
	if err != nil {
		return models.Trainer{}, err
	}
	if !found {
		return models.Trainer{}, ErrNotFound("trainer profile")
	}
	return s.trainers.FindByUserID(p.UserID)
}
