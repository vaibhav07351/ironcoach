package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Principal is the authenticated caller, loaded from the database on every request so that
// links, unlinks and account deletion take effect immediately (JWT claims can be up to 7 days old).
type Principal struct {
	UserID string
	Email  string
	Role   string
	// TrainerKey identifies the trainer in trainee/invite/request/rating records: the trainer's
	// user id. For a trainer it is their own id; for a client, their coach's id (may be empty).
	TrainerKey string
	// TraineeID is the client's linked trainee record (empty for trainers and unlinked clients).
	TraineeID string
	// Timezone is the user's IANA zone (DefaultTimezone when unknown).
	Timezone string
}

func (p Principal) IsTrainer() bool { return p.Role == models.RoleTrainer }
func (p Principal) IsClient() bool  { return p.Role == models.RoleClient }

// Location returns the caller's time zone for "today", weeks and streaks.
func (p Principal) Location() *time.Location { return loadLocation(p.Timezone) }

// AccessService resolves callers and makes record-level authorization decisions.
type AccessService struct {
	users    *repositories.UserRepository
	trainees *repositories.TraineeRepository
}

func NewAccessService() *AccessService {
	return &AccessService{
		users:    repositories.NewUserRepository(),
		trainees: repositories.NewTraineeRepository(),
	}
}

// ResolvePrincipal loads the current state of a user. A deleted account yields an
// unauthorized error so its still-valid tokens stop working at once.
func (s *AccessService) ResolvePrincipal(userID string) (Principal, error) {
	user, err := s.users.FindByID(userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Principal{}, ErrUnauthorized("account_not_found", "account not found, please sign in again")
		}
		return Principal{}, err
	}
	return principalFromUser(user), nil
}

func principalFromUser(user models.User) Principal {
	p := Principal{
		UserID:     user.ID,
		Email:      user.Email,
		Role:       user.Role,
		TrainerKey: user.TrainerID,
		TraineeID:  user.TraineeID,
		Timezone:   user.Timezone,
	}
	if p.Timezone == "" {
		p.Timezone = DefaultTimezone
	}
	// A trainer's key is always their own user id.
	if p.IsTrainer() {
		p.TrainerKey = user.ID
	}
	return p
}

// AuthorizeTrainee loads a trainee record and checks the caller may access it: the owning
// trainer, or the client account linked to it.
func (s *AccessService) AuthorizeTrainee(p Principal, traineeID string) (models.Trainee, error) {
	if !primitive.IsValidObjectID(traineeID) {
		return models.Trainee{}, ErrNotFound("client")
	}
	trainee, err := s.trainees.GetTraineeByID(traineeID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Trainee{}, ErrNotFound("client")
		}
		return models.Trainee{}, err
	}
	if !canAccessTrainee(p, trainee) {
		return models.Trainee{}, ErrForbidden("you do not have access to this client")
	}
	return trainee, nil
}

// canAccessTrainee is the pure authorization rule, kept separate so it can be unit tested.
func canAccessTrainee(p Principal, t models.Trainee) bool {
	switch p.Role {
	case models.RoleTrainer:
		return p.TrainerKey != "" && t.TrainerID == p.TrainerKey
	case models.RoleClient:
		return p.TraineeID != "" && p.TraineeID == t.ID && t.UserID == p.UserID
	default:
		return false
	}
}
