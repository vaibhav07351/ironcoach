package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

const (
	maxPendingRequestsPerClient = 5
	declinedRequestCooldown     = 7 * 24 * time.Hour
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

// Create sends a coaching request from an unlinked client. Repeating an open request returns
// it unchanged; a client may have at most 5 open requests and must wait 7 days before asking a
// coach who declined them again.
func (s *CoachRequestService) Create(p Principal, trainerKey string, shareConsent bool) (models.CoachRequest, error) {
	if !p.IsClient() {
		return models.CoachRequest{}, ErrForbidden("only clients can request a coach")
	}
	if !shareConsent {
		return models.CoachRequest{}, errConsentRequired()
	}
	if p.TraineeID != "" {
		return models.CoachRequest{}, ErrConflict("already_linked", "you are already linked to a coach")
	}

	trainer, err := s.trainers.FindByUserID(trainerKey)
	if err != nil {
		if !errors.Is(err, mongo.ErrNoDocuments) {
			return models.CoachRequest{}, err
		}
		return models.CoachRequest{}, ErrNotFound("coach")
	}
	if !trainer.DiscoveryVisible {
		return models.CoachRequest{}, ErrConflict("not_accepting", "this coach is not accepting new clients right now")
	}

	latest, err := s.requests.LatestForClientAndTrainer(p.UserID, trainerKey)
	switch {
	case err == nil && latest.Status == models.CoachRequestPending:
		return latest, nil
	case err == nil && latest.Status == models.CoachRequestRejected && latest.ResolvedAt != nil &&
		time.Since(*latest.ResolvedAt) < declinedRequestCooldown:
		return models.CoachRequest{}, ErrConflict("recently_declined", "this coach declined your request recently; try again later")
	case err != nil && !errors.Is(err, mongo.ErrNoDocuments):
		return models.CoachRequest{}, err
	}

	pending, err := s.requests.CountPendingForClient(p.UserID)
	if err != nil {
		return models.CoachRequest{}, err
	}
	if pending >= maxPendingRequestsPerClient {
		return models.CoachRequest{}, ErrConflict("too_many_requests", "you have too many open requests; wait for a reply or cancel one")
	}

	user, err := s.users.FindByID(p.UserID)
	if err != nil {
		return models.CoachRequest{}, err
	}
	if err := recordShareConsent(s.users, p.UserID); err != nil {
		return models.CoachRequest{}, err
	}
	return s.requests.Create(models.CoachRequest{
		ClientUserID: p.UserID,
		ClientName:   user.Name,
		ClientEmail:  user.Email,
		TrainerID:    trainerKey,
		TrainerName:  trainer.Name,
	})
}

// ListPending lists open requests for the calling trainer (newest first, max 100).
func (s *CoachRequestService) ListPending(p Principal) ([]models.CoachRequest, error) {
	return s.requests.ListPendingForTrainer(p.TrainerKey)
}

func (s *CoachRequestService) CountPending(p Principal) (int64, error) {
	return s.requests.CountPendingForTrainer(p.TrainerKey)
}

// ListMine lists the calling client's own requests (newest first, max 50).
func (s *CoachRequestService) ListMine(p Principal) ([]models.CoachRequest, error) {
	return s.requests.ListForClient(p.UserID, 50)
}

// Cancel withdraws one of the calling client's pending requests.
func (s *CoachRequestService) Cancel(p Principal, requestID string) error {
	ok, err := s.requests.CancelForClient(requestID, p.UserID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrNotFound("open request")
	}
	return nil
}

// Reject declines a pending request owned by the calling trainer.
func (s *CoachRequestService) Reject(p Principal, requestID string) error {
	if _, err := s.requests.Resolve(requestID, p.TrainerKey, models.CoachRequestRejected); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrNotFound("open request")
		}
		return err
	}
	return nil
}

// Accept turns a pending request into a client record linked to the requesting account.
// The request is claimed atomically first, so a double tap cannot create two clients; the
// account link is conditional, so two coaches accepting at once link the client only once.
func (s *CoachRequestService) Accept(p Principal, requestID string) (models.PublicUser, error) {
	req, err := s.requests.Resolve(requestID, p.TrainerKey, models.CoachRequestAccepted)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.PublicUser{}, ErrNotFound("open request")
		}
		return models.PublicUser{}, err
	}

	user, err := s.users.FindByID(req.ClientUserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			s.cancelRequest(req.ID)
			return models.PublicUser{}, ErrConflict("client_gone", "this client has deleted their account")
		}
		s.reopenRequest(req.ID)
		return models.PublicUser{}, err
	}
	if user.TraineeID != "" {
		s.cancelRequest(req.ID)
		return models.PublicUser{}, ErrConflict("already_linked", "this client has already joined another coach")
	}

	now := time.Now().UTC()
	traineeID, err := s.trainees.CreateTrainee(models.Trainee{
		Name:         user.Name,
		Email:        user.Email,
		UserID:       user.ID,
		TrainerID:    p.TrainerKey,
		ActiveStatus: true,
		CreatedAt:    now,
		UpdatedAt:    now,
	})
	if err != nil {
		s.reopenRequest(req.ID)
		return models.PublicUser{}, err
	}

	linked, err := s.users.LinkTrainee(user.ID, traineeID, p.TrainerKey)
	if err != nil || !linked {
		if delErr := s.trainees.DeleteTrainee(traineeID); delErr != nil {
			slog.Error("accept rollback: delete trainee failed", "trainee_id", traineeID, "err", delErr)
		}
		if err != nil {
			s.reopenRequest(req.ID)
			return models.PublicUser{}, err
		}
		s.cancelRequest(req.ID)
		return models.PublicUser{}, ErrConflict("already_linked", "this client has already joined another coach")
	}

	if err := s.catalog.SeedDefaultCatalog(traineeID); err != nil {
		slog.Warn("seed default catalog failed", "trainee_id", traineeID, "err", err)
	}
	if err := s.requests.CloseOtherPendingForClient(user.ID, req.ID); err != nil {
		slog.Warn("close other pending requests failed", "user_id", user.ID, "err", err)
	}

	user.TraineeID = traineeID
	user.TrainerID = p.TrainerKey
	return toPublicUser(user), nil
}

func (s *CoachRequestService) cancelRequest(id string) {
	if err := s.requests.UpdateStatus(id, models.CoachRequestCancelled); err != nil {
		slog.Error("cancel coach request failed", "request_id", id, "err", err)
	}
}

func (s *CoachRequestService) reopenRequest(id string) {
	if err := s.requests.Reopen(id); err != nil {
		slog.Error("reopen coach request failed", "request_id", id, "err", err)
	}
}
