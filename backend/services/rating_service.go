package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"math"

	"go.mongodb.org/mongo-driver/bson"
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

// Upsert saves the caller's score for their linked coach (clients) or one of their own clients
// (trainers), then recomputes the target's average. Rating again replaces the previous score.
func (s *RatingService) Upsert(p Principal, toKind, toID string, score float64) (models.Rating, error) {
	if !validHalfStar(score) {
		return models.Rating{}, ErrValidation("score must be between 0.5 and 5 in half-star steps")
	}

	switch toKind {
	case models.RatingToTrainer:
		if !p.IsClient() {
			return models.Rating{}, ErrForbidden("only clients can rate trainers")
		}
		if p.TrainerKey == "" || p.TrainerKey != toID {
			return models.Rating{}, ErrForbidden("you can only rate your linked coach")
		}
		if _, err := s.trainers.FindByUserID(toID); err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return models.Rating{}, ErrNotFound("coach")
			}
			return models.Rating{}, err
		}
	case models.RatingToClient:
		if !p.IsTrainer() {
			return models.Rating{}, ErrForbidden("only trainers can rate clients")
		}
		if _, err := NewAccessService().AuthorizeTrainee(p, toID); err != nil {
			return models.Rating{}, err
		}
	default:
		return models.Rating{}, ErrValidation("to_kind must be trainer or client")
	}

	saved, err := s.ratings.Upsert(models.Rating{
		FromUserID: p.UserID,
		FromRole:   p.Role,
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
		_, err := s.trainers.UpdateByUserID(toID, bson.M{
			"rating":       rounded,
			"rating_count": count,
		})
		return err
	}
	// A matched-but-unchanged average (same score again) is a success, not an error.
	_, err = s.trainees.UpdateFields(toID, bson.M{
		"rating":       rounded,
		"rating_count": count,
	})
	return err
}
