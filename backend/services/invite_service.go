package services

import (
	"crypto/rand"
	"errors"
	"fmt"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"math/big"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

type InviteService struct {
	invites  *repositories.InviteRepository
	trainees *repositories.TraineeRepository
	users    *repositories.UserRepository
}

func NewInviteService() *InviteService {
	return &InviteService{
		invites:  repositories.NewInviteRepository(),
		trainees: repositories.NewTraineeRepository(),
		users:    repositories.NewUserRepository(),
	}
}

func generateInviteCode() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	for i := 0; i < 6; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		code[i] = alphabet[n.Int64()]
	}
	return string(code), nil
}

// CreateInvite creates a single-use invite for a trainee (trainer only).
func (s *InviteService) CreateInvite(trainerEmail, traineeID string) (models.Invite, error) {
	trainee, err := s.trainees.GetTraineeByID(traineeID)
	if err != nil {
		return models.Invite{}, errors.New("trainee not found")
	}
	if trainee.TrainerID != trainerEmail {
		return models.Invite{}, errors.New("forbidden: trainee does not belong to this trainer")
	}
	if trainee.UserID != "" {
		return models.Invite{}, errors.New("trainee already linked to a client account")
	}

	_ = s.invites.InvalidateOpenForTrainee(traineeID)

	code, err := generateInviteCode()
	if err != nil {
		return models.Invite{}, err
	}

	invite := models.Invite{
		Code:      code,
		TraineeID: traineeID,
		TrainerID: trainerEmail,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}
	return s.invites.Create(invite)
}

type RedeemResult struct {
	Token string            `json:"token"`
	User  models.PublicUser `json:"user"`
}

// RedeemInvite links a client user to the trainee on the invite.
func (s *InviteService) RedeemInvite(userID, code string) (*RedeemResult, error) {
	user, err := s.users.FindByID(userID)
	if err != nil || user.ID == "" {
		return nil, errors.New("user not found")
	}
	if user.Role != models.RoleClient {
		return nil, errors.New("only clients can redeem invites")
	}
	if user.TraineeID != "" {
		return nil, errors.New("already linked to a trainee")
	}

	normalized := strings.ToUpper(strings.TrimSpace(code))
	invite, err := s.invites.FindActiveByCode(normalized)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) || invite.ID == "" {
			return nil, errors.New("invalid or expired invite code")
		}
		return nil, err
	}

	trainee, err := s.trainees.GetTraineeByID(invite.TraineeID)
	if err != nil {
		return nil, errors.New("trainee not found")
	}
	if trainee.UserID != "" {
		return nil, errors.New("trainee already linked")
	}

	if err := s.invites.MarkUsed(invite.ID, userID); err != nil {
		return nil, fmt.Errorf("failed to mark invite used: %w", err)
	}

	update := map[string]interface{}{
		"user_id":       userID,
		"email":         user.Email,
		"active_status": true,
		"updated_at":    time.Now(),
	}
	if err := s.trainees.UpdateTrainee(invite.TraineeID, update); err != nil {
		return nil, err
	}

	if err := s.users.Update(userID, map[string]interface{}{
		"trainee_id": invite.TraineeID,
		"trainer_id": invite.TrainerID,
	}); err != nil {
		return nil, err
	}

	user.TraineeID = invite.TraineeID
	user.TrainerID = invite.TrainerID

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

	return &RedeemResult{
		Token: token,
		User:  toPublicUser(user),
	}, nil
}
