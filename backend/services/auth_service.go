package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"strings"
	"time"
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
	Role    string `json:"role"` // trainer | client — used only on first signup
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

	existing, findErr := s.users.FindByGoogleSub(info.Sub)
	found := findErr == nil && existing.ID != ""

	// Same email must not exist under a different Google subject / role path.
	if !found {
		byEmail, emailErr := s.users.FindByEmail(info.Email)
		if emailErr == nil && byEmail.ID != "" {
			existing = byEmail
			found = true
			// Backfill google_sub if this account predates SSO linkage.
			if existing.GoogleSub == "" {
				_ = s.users.Update(existing.ID, map[string]interface{}{
					"google_sub": info.Sub,
				})
				existing.GoogleSub = info.Sub
			}
		}
	}

	var user models.User
	if found {
		user = existing
		if role != "" && role != user.Role {
			return nil, errRoleMismatch(user.Role)
		}
		_ = s.users.Update(user.ID, map[string]interface{}{
			"email":      info.Email,
			"name":       info.Name,
			"picture":    info.Picture,
			"google_sub": info.Sub,
		})
		user.Email = info.Email
		user.Name = info.Name
		user.Picture = info.Picture
		user.GoogleSub = info.Sub
	} else {
		if role == "" {
			return nil, errors.New("role is required for new users (trainer or client)")
		}
		now := time.Now()
		onboardingDone := role != models.RoleTrainer // clients skip trainer category gate
		user, err = s.users.UpsertByGoogleSub(models.User{
			GoogleSub:      info.Sub,
			Email:          info.Email,
			Name:           info.Name,
			Picture:        info.Picture,
			Role:           role,
			OnboardingDone: &onboardingDone,
			CreatedAt:      now,
			UpdatedAt:      now,
		})
		if err != nil {
			return nil, err
		}

		// Upsert can return an existing doc if google_sub already existed; never flip role.
		if user.Role != "" && user.Role != role {
			return nil, errRoleMismatch(user.Role)
		}

		if role == models.RoleTrainer {
			if linkErr := s.ensureTrainerProfile(user); linkErr != nil {
				return nil, linkErr
			}
			user, _ = s.users.FindByID(user.ID)
		}
	}

	token, err := utils.GenerateAuthJWT(utils.Claims{
		Email:     user.Email,
		UserID:    user.ID,
		Role:      user.Role,
		TrainerID: user.TrainerID,
		TraineeID: user.TraineeID,
	})
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &AuthResponse{
		Token: token,
		User:  toPublicUser(user),
	}, nil
}

func errRoleMismatch(existingRole string) error {
	switch existingRole {
	case models.RoleTrainer:
		return errors.New("this Google account is already registered as a trainer; sign in as a trainer")
	case models.RoleClient:
		return errors.New("this Google account is already registered as a client; sign in as a client")
	default:
		return errors.New("this Google account is already registered with a different role")
	}
}

func (s *AuthService) ensureTrainerProfile(user models.User) error {
	trainer, err := s.trainers.FindByEmail(user.Email)
	if err == nil && trainer.Email != "" {
		return s.users.Update(user.ID, map[string]interface{}{
			"trainer_id": trainer.Email,
		})
	}

	newTrainer := models.Trainer{
		Name:             user.Name,
		Email:            user.Email,
		Password:         "", // Google SSO — no password
		ImageURL:         user.Picture,
		PhoneNumber:      "0000000000",
		Gender:           "other",
		DateOfBirth:      "2000-01-01",
		Experience:       0,
		TrainerType:      "personal",
		Expertises:       []string{models.ExpertiseOther},
		DiscoveryVisible: true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	// Reuse RegisterTrainer seeding via repository + category seed
	ts := NewTrainerService()
	if err := ts.RegisterTrainer(newTrainer); err != nil {
		// If already exists from race, just link
		if !strings.Contains(err.Error(), "already exists") {
			return err
		}
	}

	return s.users.Update(user.ID, map[string]interface{}{
		"trainer_id": user.Email,
	})
}

func (s *AuthService) GetMe(userID string) (models.PublicUser, error) {
	user, err := s.users.FindByID(userID)
	if err != nil || user.ID == "" {
		return models.PublicUser{}, errors.New("user not found")
	}
	return toPublicUser(user), nil
}

func toPublicUser(user models.User) models.PublicUser {
	// Legacy trainers (onboarding_done unset) are treated as done so existing accounts are not gated.
	needsOnboarding := user.Role == models.RoleTrainer &&
		(user.TrainerID == "" || (user.OnboardingDone != nil && !*user.OnboardingDone))
	needsInvite := user.Role == models.RoleClient && user.TraineeID == ""
	needsInterests := user.Role == models.RoleClient && len(user.Interests) == 0
	return models.PublicUser{
		ID:              user.ID,
		Email:           user.Email,
		Name:            user.Name,
		Picture:         user.Picture,
		Role:            user.Role,
		TrainerID:       user.TrainerID,
		TraineeID:       user.TraineeID,
		Interests:       user.Interests,
		NeedsOnboarding: needsOnboarding,
		NeedsInvite:     needsInvite,
		NeedsInterests:  needsInterests,
	}
}

// CompleteTrainerExpertise saves coaching categories and marks trainer onboarding done.
func (s *AuthService) CompleteTrainerExpertise(userID string, expertises []string) (models.PublicUser, error) {
	normalized, ok := models.NormalizeExpertises(expertises)
	if !ok || len(normalized) == 0 {
		return models.PublicUser{}, errors.New("invalid expertise code")
	}
	user, err := s.users.FindByID(userID)
	if err != nil || user.ID == "" {
		return models.PublicUser{}, errors.New("user not found")
	}
	if user.Role != models.RoleTrainer {
		return models.PublicUser{}, errors.New("trainers only")
	}
	if user.TrainerID == "" {
		return models.PublicUser{}, errors.New("trainer profile not linked")
	}

	if err := s.trainers.UpdateTrainer(user.TrainerID, map[string]interface{}{
		"expertises": normalized,
	}); err != nil {
		return models.PublicUser{}, err
	}

	done := true
	if err := s.users.Update(userID, map[string]interface{}{
		"onboarding_done": done,
	}); err != nil {
		return models.PublicUser{}, err
	}
	user.OnboardingDone = &done
	return toPublicUser(user), nil
}

// UpdateClientInterests saves validated interest codes for a client user.
func (s *AuthService) UpdateClientInterests(userID string, interests []string) (models.PublicUser, error) {
	normalized, ok := models.NormalizeExpertises(interests)
	if !ok {
		return models.PublicUser{}, errors.New("invalid interest code")
	}
	user, err := s.users.FindByID(userID)
	if err != nil || user.ID == "" {
		return models.PublicUser{}, errors.New("user not found")
	}
	if user.Role != models.RoleClient {
		return models.PublicUser{}, errors.New("clients only")
	}
	if err := s.users.Update(userID, map[string]interface{}{
		"interests": normalized,
	}); err != nil {
		return models.PublicUser{}, err
	}
	user.Interests = normalized
	return toPublicUser(user), nil
}
