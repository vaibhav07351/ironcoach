package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// AccountService handles account deletion and a client leaving their coach.
type AccountService struct {
	users     *repositories.UserRepository
	trainers  *repositories.TrainerRepository
	trainees  *repositories.TraineeRepository
	requests  *repositories.CoachRequestRepository
	ratings   *repositories.RatingRepository
	ratingSvc *RatingService
	images    *ImageService
	cleaner   *dataCleaner
}

func NewAccountService() *AccountService {
	return &AccountService{
		users:     repositories.NewUserRepository(),
		trainers:  repositories.NewTrainerRepository(),
		trainees:  repositories.NewTraineeRepository(),
		requests:  repositories.NewCoachRequestRepository(),
		ratings:   repositories.NewRatingRepository(),
		ratingSvc: NewRatingService(),
		images:    NewImageService(),
		cleaner:   newDataCleaner(),
	}
}

// DeleteAccount permanently deletes the caller's account (Play Store account deletion).
//
//   - Trainer: their profile, every client record and all client data, invites, requests and
//     ratings. Linked client accounts are unlinked, not deleted.
//   - Client: their login, requests and the ratings they gave. Their link on the coach's client
//     record is removed; the coach keeps their own record of the client (disclosed in the
//     privacy policy).
//
// The user document is deleted last and every step is idempotent, so a failure part-way can be
// retried by calling this again with the same (still valid) session.
func (s *AccountService) DeleteAccount(p Principal) error {
	switch p.Role {
	case models.RoleTrainer:
		if err := s.deleteTrainerData(p); err != nil {
			return err
		}
	case models.RoleClient:
		if err := s.deleteClientData(p); err != nil {
			return err
		}
	default:
		return ErrForbidden("unknown account type")
	}
	return s.users.Delete(p.UserID)
}

func (s *AccountService) deleteTrainerData(p Principal) error {
	key := p.TrainerKey
	traineeIDs, err := s.trainees.GetTraineeIDsByTrainer(key)
	if err != nil {
		return err
	}
	if err := s.cleaner.deleteTrainees(traineeIDs); err != nil {
		return err
	}
	if err := s.requests.DeleteForTrainer(key); err != nil {
		return err
	}
	if err := s.ratings.DeleteForTargets(models.RatingToTrainer, []string{key}); err != nil {
		return err
	}
	if _, err := s.ratings.DeleteFromUser(p.UserID); err != nil {
		return err
	}

	trainer, err := s.trainers.FindByUserID(p.UserID)
	switch {
	case err == nil:
		s.images.DeleteImages([]string{trainer.ImageURL})
	case !errors.Is(err, mongo.ErrNoDocuments):
		return err
	}
	return s.trainers.DeleteByUserID(p.UserID)
}

func (s *AccountService) deleteClientData(p Principal) error {
	if err := s.trainees.ReleaseAllForUser(p.UserID); err != nil {
		return err
	}
	if err := s.requests.DeleteForClient(p.UserID); err != nil {
		return err
	}
	ratedTrainers, err := s.ratings.DeleteFromUser(p.UserID)
	if err != nil {
		return err
	}
	for _, trainerKey := range ratedTrainers {
		if err := s.ratingSvc.recomputeAverage(models.RatingToTrainer, trainerKey); err != nil {
			slog.Warn("recompute trainer rating failed", "trainer", trainerKey, "err", err)
		}
	}
	return nil
}

// LeaveCoach unlinks the calling client from their coach. The coach keeps the client record
// (marked inactive); the client can then join another coach.
func (s *AccountService) LeaveCoach(p Principal) error {
	if !p.IsClient() {
		return ErrForbidden("only clients can leave a coach")
	}
	if p.TraineeID == "" {
		return ErrConflict("not_linked", "you are not linked to a coach")
	}
	// Release the client record first: if unlinking the user then fails, access is already
	// gone (the record no longer points at this user) and a retry completes the unlink.
	if err := s.trainees.ReleaseUser(p.TraineeID, p.UserID); err != nil {
		return err
	}
	if _, err := s.trainees.UpdateFields(p.TraineeID, bson.M{"active_status": false}); err != nil {
		slog.Warn("mark trainee inactive failed", "trainee_id", p.TraineeID, "err", err)
	}
	return s.users.UnlinkTrainee(p.UserID)
}
