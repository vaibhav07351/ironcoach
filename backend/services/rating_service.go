package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"math"

	"go.mongodb.org/mongo-driver/mongo"
)

type RatingService struct {
	ratings  *repositories.RatingRepository
	users    *repositories.UserRepository
	trainers *repositories.TrainerRepository
	trainees *repositories.TraineeRepository
}

func NewRatingService() *RatingService {
	return &RatingService{
		ratings:  repositories.NewRatingRepository(),
		users:    repositories.NewUserRepository(),
		trainers: repositories.NewTrainerRepository(),
		trainees: repositories.NewTraineeRepository(),
	}
}

func validHalfStar(score float64) bool {
	if score < 0.5 || score > 5 {
		return false
	}
	scaled := score * 2
	return math.Abs(scaled-math.Round(scaled)) < 1e-9
}

func (s *RatingService) Upsert(userID, role string, toKind, toID string, score float64) (models.Rating, error) {
	if userID == "" {
		return models.Rating{}, errors.New("unauthorized")
	}
	if !validHalfStar(score) {
		return models.Rating{}, errors.New("score must be between 0.5 and 5 in half-star steps")
	}
	if toKind != models.RatingToTrainer && toKind != models.RatingToClient {
		return models.Rating{}, errors.New("invalid to_kind")
	}
	if toID == "" {
		return models.Rating{}, errors.New("to_id required")
	}

	user, err := s.users.FindByID(userID)
	if err != nil || user.ID == "" {
		return models.Rating{}, errors.New("user not found")
	}

	if toKind == models.RatingToTrainer {
		if role != models.RoleClient && user.Role != models.RoleClient {
			return models.Rating{}, errors.New("only clients can rate trainers")
		}
		if user.TrainerID == "" || user.TrainerID != toID {
			return models.Rating{}, errors.New("you can only rate your linked coach")
		}
		if _, err := s.trainers.FindByEmail(toID); err != nil {
			return models.Rating{}, errors.New("trainer not found")
		}
	} else {
		if role != models.RoleTrainer && user.Role != models.RoleTrainer {
			return models.Rating{}, errors.New("only trainers can rate clients")
		}
		trainee, err := s.trainees.GetTraineeByID(toID)
		if err != nil || trainee.ID == "" {
			return models.Rating{}, errors.New("client not found")
		}
		trainerEmail := user.Email
		if user.TrainerID != "" {
			trainerEmail = user.TrainerID
		}
		if trainee.TrainerID != trainerEmail {
			return models.Rating{}, errors.New("you can only rate your own clients")
		}
	}

	fromRole := user.Role
	if fromRole == "" {
		fromRole = role
	}

	saved, err := s.ratings.Upsert(models.Rating{
		FromUserID: userID,
		FromRole:   fromRole,
		ToKind:     toKind,
		ToID:       toID,
		Score:      score,
	})
	if err != nil {
		return models.Rating{}, err
	}

	if err := s.recomputeAverage(toKind, toID); err != nil {
		return models.Rating{}, err
	}
	return saved, nil
}

func (s *RatingService) Mine(userID, toKind, toID string) (*models.Rating, error) {
	if userID == "" || toKind == "" || toID == "" {
		return nil, errors.New("missing parameters")
	}
	rating, err := s.ratings.FindMine(userID, toKind, toID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &rating, nil
}

type MineRatingResult struct {
	Score       *float64 `json:"score"`
	Average     float64  `json:"average"`
	RatingCount int      `json:"rating_count"`
}

func (s *RatingService) MineWithAverage(userID, toKind, toID string) (MineRatingResult, error) {
	result := MineRatingResult{}
	rating, err := s.Mine(userID, toKind, toID)
	if err != nil {
		return result, err
	}
	if rating != nil {
		score := rating.Score
		result.Score = &score
	}
	avg, count, err := s.ratings.AverageForTarget(toKind, toID)
	if err != nil {
		return result, err
	}
	result.Average = math.Round(avg*20) / 20
	result.RatingCount = count
	return result, nil
}

func (s *RatingService) recomputeAverage(toKind, toID string) error {
	avg, count, err := s.ratings.AverageForTarget(toKind, toID)
	if err != nil {
		return err
	}
	// Round average to nearest 0.05 for display stability
	rounded := math.Round(avg*20) / 20
	if toKind == models.RatingToTrainer {
		return s.trainers.UpdateTrainer(toID, map[string]interface{}{
			"rating":       rounded,
			"rating_count": count,
		})
	}
	return s.trainees.UpdateTrainee(toID, map[string]interface{}{
		"rating":       rounded,
		"rating_count": count,
	})
}
