package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CoachRequestService struct {
	requests *repositories.CoachRequestRepository
	users    *repositories.UserRepository
	trainees *repositories.TraineeRepository
	trainers *repositories.TrainerRepository
	catalog  *CategoryService
}

func NewCoachRequestService() *CoachRequestService {
	return &CoachRequestService{
		requests: repositories.NewCoachRequestRepository(),
		users:    repositories.NewUserRepository(),
		trainees: repositories.NewTraineeRepository(),
		trainers: repositories.NewTrainerRepository(),
		catalog:  NewCategoryService(),
	}
}

func (s *CoachRequestService) Create(clientUserID, trainerEmail string) (models.CoachRequest, error) {
	user, err := s.users.FindByID(clientUserID)
	if err != nil || user.ID == "" {
		return models.CoachRequest{}, errors.New("user not found")
	}
	if user.Role != models.RoleClient {
		return models.CoachRequest{}, errors.New("only clients can request a coach")
	}
	if user.TraineeID != "" {
		return models.CoachRequest{}, errors.New("already linked to a trainer")
	}

	trainer, err := s.trainers.FindByEmail(trainerEmail)
	if err != nil || trainer.Email == "" {
		return models.CoachRequest{}, errors.New("trainer not found")
	}
	if !trainer.DiscoveryVisible {
		return models.CoachRequest{}, errors.New("trainer is not accepting discovery requests")
	}

	existing, err := s.requests.FindPendingByClientAndTrainer(clientUserID, trainerEmail)
	if err == nil && existing.ID != "" {
		return existing, nil
	}
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return models.CoachRequest{}, err
	}

	return s.requests.Create(models.CoachRequest{
		ClientUserID: clientUserID,
		ClientName:   user.Name,
		ClientEmail:  user.Email,
		TrainerEmail: trainerEmail,
	})
}

func (s *CoachRequestService) ListPending(trainerEmail string) ([]models.CoachRequest, error) {
	return s.requests.ListPendingForTrainer(trainerEmail)
}

func (s *CoachRequestService) CountPending(trainerEmail string) (int64, error) {
	return s.requests.CountPendingForTrainer(trainerEmail)
}

type CoachRequestResolveResult struct {
	Token string            `json:"token,omitempty"`
	User  models.PublicUser `json:"user,omitempty"`
}

func (s *CoachRequestService) Reject(trainerEmail, requestID string) error {
	req, err := s.requests.FindByID(requestID)
	if err != nil || req.ID == "" {
		return errors.New("request not found")
	}
	if req.TrainerEmail != trainerEmail {
		return errors.New("forbidden")
	}
	if req.Status != models.CoachRequestPending {
		return errors.New("request is not pending")
	}
	return s.requests.UpdateStatus(requestID, models.CoachRequestRejected)
}

func (s *CoachRequestService) Accept(trainerEmail, requestID string) (*CoachRequestResolveResult, error) {
	req, err := s.requests.FindByID(requestID)
	if err != nil || req.ID == "" {
		return nil, errors.New("request not found")
	}
	if req.TrainerEmail != trainerEmail {
		return nil, errors.New("forbidden")
	}
	if req.Status != models.CoachRequestPending {
		return nil, errors.New("request is not pending")
	}

	user, err := s.users.FindByID(req.ClientUserID)
	if err != nil || user.ID == "" {
		return nil, errors.New("client user not found")
	}
	if user.TraineeID != "" {
		_ = s.requests.UpdateStatus(requestID, models.CoachRequestRejected)
		return nil, errors.New("client already linked to a trainer")
	}

	now := time.Now()
	traineeID := primitive.NewObjectID().Hex()
	trainee := models.Trainee{
		ID:           traineeID,
		Name:         user.Name,
		Email:        user.Email,
		UserID:       user.ID,
		PhoneNumber:  "0000000000",
		DOB:          "2000-01-01",
		Gender:       "other",
		TrainerID:    trainerEmail,
		ActiveStatus: true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	id, err := s.trainees.CreateTrainee(trainee)
	if err != nil {
		return nil, err
	}
	_ = s.catalog.SeedDefaultCatalog(id)

	if err := s.users.Update(user.ID, map[string]interface{}{
		"trainee_id": id,
		"trainer_id": trainerEmail,
	}); err != nil {
		return nil, err
	}

	if err := s.requests.UpdateStatus(requestID, models.CoachRequestAccepted); err != nil {
		return nil, err
	}

	user.TraineeID = id
	user.TrainerID = trainerEmail
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

	return &CoachRequestResolveResult{
		Token: token,
		User:  toPublicUser(user),
	}, nil
}
