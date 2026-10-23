package services

import (
	"crypto/rand"
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

const (
	inviteAlphabet  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	inviteCodeLen   = 6
	inviteValidity  = 7 * 24 * time.Hour
	inviteCreateTry = 3
)

type InviteService struct {
	invites  *repositories.InviteRepository
	trainees *repositories.TraineeRepository
	users    *repositories.UserRepository
	requests *repositories.CoachRequestRepository
	access   *AccessService
}

func NewInviteService() *InviteService {
	return &InviteService{
		invites:  repositories.NewInviteRepository(),
		trainees: repositories.NewTraineeRepository(),
		users:    repositories.NewUserRepository(),
		requests: repositories.NewCoachRequestRepository(),
		access:   NewAccessService(),
	}
}

func generateInviteCode() (string, error) {
	code := make([]byte, inviteCodeLen)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(inviteAlphabet))))
		if err != nil {
			return "", err
		}
		code[i] = inviteAlphabet[n.Int64()]
	}
	return string(code), nil
}

// CreateInvite creates a single-use, 7-day invite for one of the trainer's clients. Any earlier
// open invite for that client stops working.
func (s *InviteService) CreateInvite(p Principal, traineeID string) (models.Invite, error) {
	trainee, err := s.access.AuthorizeTrainee(p, traineeID)
	if err != nil {
		return models.Invite{}, err
	}
	if !p.IsTrainer() {
		return models.Invite{}, ErrForbidden("only trainers can create invites")
	}
	if trainee.UserID != "" {
		return models.Invite{}, ErrConflict("already_linked", "this client has already joined the app")
	}

	if err := s.invites.InvalidateOpenForTrainee(traineeID); err != nil {
		return models.Invite{}, err
	}

	// A unique index on code rejects the (very unlikely) collision; retry with a new code.
	for attempt := 0; attempt < inviteCreateTry; attempt++ {
		code, err := generateInviteCode()
		if err != nil {
			return models.Invite{}, err
		}
		now := time.Now()
		invite, err := s.invites.Create(models.Invite{
			Code:      code,
			TraineeID: traineeID,
			TrainerID: p.TrainerKey,
			ExpiresAt: now.Add(inviteValidity),
			CreatedAt: now,
		})
		if err == nil {
			return invite, nil
		}
		if !mongo.IsDuplicateKeyError(err) {
			return models.Invite{}, err
		}
	}
	return models.Invite{}, errors.New("could not generate a unique invite code")
}

type RedeemResult struct {
	Token string            `json:"token"`
	User  models.PublicUser `json:"user"`
}

// RedeemInvite links the calling client to the trainee on the invite. It is a sequence of
// conditional writes (claim invite, then trainee, then user); if a later step fails the earlier
// ones are undone, so a failure never burns the invite or leaves a half-link.
func (s *InviteService) RedeemInvite(p Principal, code string, shareConsent bool) (*RedeemResult, error) {
	if !p.IsClient() {
		return nil, ErrForbidden("only clients can redeem invites")
	}
	if !shareConsent {
		return nil, errConsentRequired()
	}
	if p.TraineeID != "" {
		return nil, ErrConflict("already_linked", "you are already linked to a coach; leave your current coach first")
	}

	normalized := strings.ToUpper(strings.TrimSpace(code))
	if !validInviteCode(normalized) {
		return nil, ErrValidation("invite code must be 6 letters or digits")
	}

	invite, err := s.invites.ClaimByCode(normalized, p.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrValidation("invalid or expired invite code")
		}
		return nil, err
	}

	claimed, err := s.trainees.ClaimForUser(invite.TraineeID, p.UserID, p.Email)
	if err != nil || !claimed {
		s.releaseInvite(invite.ID, p.UserID)
		if err != nil {
			return nil, err
		}
		return nil, ErrConflict("already_linked", "this invite is no longer valid; ask your coach for a new one")
	}

	linked, err := s.users.LinkTrainee(p.UserID, invite.TraineeID, invite.TrainerID)
	if err != nil || !linked {
		if relErr := s.trainees.ReleaseUser(invite.TraineeID, p.UserID); relErr != nil {
			slog.Error("redeem rollback: release trainee failed", "trainee_id", invite.TraineeID, "user_id", p.UserID, "err", relErr)
		}
		s.releaseInvite(invite.ID, p.UserID)
		if err != nil {
			return nil, err
		}
		return nil, ErrConflict("already_linked", "you are already linked to a coach")
	}

	if err := recordShareConsent(s.users, p.UserID); err != nil {
		slog.Warn("record share consent failed", "user_id", p.UserID, "err", err)
	}
	if err := s.requests.CloseOtherPendingForClient(p.UserID, ""); err != nil {
		slog.Warn("close pending coach requests failed", "user_id", p.UserID, "err", err)
	}

	user, err := s.users.FindByID(p.UserID)
	if err != nil {
		return nil, err
	}
	token, err := issueToken(user)
	if err != nil {
		return nil, err
	}
	return &RedeemResult{Token: token, User: toPublicUser(user)}, nil
}

func (s *InviteService) releaseInvite(inviteID, userID string) {
	if err := s.invites.Release(inviteID, userID); err != nil {
		slog.Error("redeem rollback: release invite failed", "invite_id", inviteID, "user_id", userID, "err", err)
	}
}

func validInviteCode(code string) bool {
	if len(code) != inviteCodeLen {
		return false
	}
	for _, r := range code {
		if !strings.ContainsRune(inviteAlphabet, r) {
			return false
		}
	}
	return true
}

// issueToken signs a session token for a user. Claims other than user_id are informational:
// the server re-reads role and links from the database on every request.
func issueToken(user models.User) (string, error) {
	token, err := utils.GenerateAuthJWT(utils.Claims{
		Email:     user.Email,
		UserID:    user.ID,
		Role:      user.Role,
		TrainerID: user.TrainerID,
		TraineeID: user.TraineeID,
	})
	if err != nil {
		return "", errors.New("failed to generate token")
	}
	return token, nil
}
