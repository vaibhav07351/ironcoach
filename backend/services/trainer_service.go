package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"math"
	"sort"
	"time"
)

type TrainerService struct {
	repository     *repositories.TrainerRepository
	categoryRepo   *repositories.CategoryRepository
	exerciseRepo   *repositories.ExerciseRepository
	traineeRepo    *repositories.TraineeRepository
	workoutLogRepo *repositories.WorkoutLogRepository
	dietEntryRepo  *repositories.DietEntryRepository
	progressRepo   *repositories.ProgressRepository
}

// constructor for TrainerService
func NewTrainerService() *TrainerService {
	return &TrainerService{
		repository:     repositories.NewTrainerRepository(),
		categoryRepo:   repositories.NewCategoryRepository(),
		exerciseRepo:   repositories.NewExerciseRepository(),
		traineeRepo:    repositories.NewTraineeRepository(),
		workoutLogRepo: repositories.NewWorkoutLogRepository(),
		dietEntryRepo:  repositories.NewDietEntryRepository(),
		progressRepo:   repositories.NewProgressRepository(),
	}
}

// Register a new Trainer
func (s *TrainerService) RegisterTrainer(trainer models.Trainer) error {

	existingTrainer, _ := s.repository.FindByEmail(trainer.Email)
	if existingTrainer.Email != "" {
		return errors.New("trainer with this email already exists")
	}

	// Hash password when provided (legacy); Google SSO trainers may have empty password
	if trainer.Password != "" {
		hashedPassword, err := utils.HashPassword(trainer.Password)
		if err != nil {
			return err
		}
		trainer.Password = hashedPassword
	}
	trainer.CreatedAt = time.Now()
	trainer.UpdatedAt = time.Now()
  trainer.DiscoveryVisible = true
	if len(trainer.Expertises) == 0 {
		trainer.Expertises = []string{models.ExpertiseOther}
	}

	//save trainer to database
	if err := s.repository.CreateTrainer(trainer); err != nil {
		return err
	}

	// Categories/exercises are seeded per trainee (client catalog), not per trainer.
	return nil
}

func (s *TrainerService) LoginTrainer(email, password string) (token string, err error) {

	//Find Trainer by email
	trainer, err := s.repository.FindByEmail(email)
	if err != nil || trainer.Email == "" {
		err = errors.New("invalid email or password")
		return
	}

	//verify password
	if !utils.CheckPassword(trainer.Password, password) {
		err = errors.New("invalid email or password")
		return
	}

	// Generate JWT token with role claims (legacy email/password path)
	token, err = utils.GenerateAuthJWT(utils.Claims{
		Email:     trainer.Email,
		Role:      models.RoleTrainer,
		TrainerID: trainer.Email,
	})
	if err != nil {
		err = errors.New("failed to generate token")
		return
	}

	return
}

func (s *TrainerService) GetTrainers() ([]models.Trainer, error) {
	return s.repository.GetTrainers()
}

func (s *TrainerService) GetTrainerByID(id string) (models.Trainer, error) {
	return s.repository.GetTrainerByID(id)
}

// DeleteTrainerCascade performs cascading delete of trainer and all associated data
func (s *TrainerService) DeleteTrainerCascade(trainerEmail string) error {
	// Step 1: Get all trainee IDs for this trainer
	traineeIDs, err := s.traineeRepo.GetTraineeIDsByTrainer(trainerEmail)
	if err != nil {
		return err
	}

	// Step 3: Delete all trainee-related data first
	if len(traineeIDs) > 0 {
		// Delete workout logs
		if err := s.workoutLogRepo.DeleteWorkoutLogsByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete diet entries
		if err := s.dietEntryRepo.DeleteDietEntriesByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete progress entries
		if err := s.progressRepo.DeleteProgressByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete trainees
		if err := s.traineeRepo.DeleteTraineesByTrainer(trainerEmail); err != nil {
			return err
		}
	}

	// Step 4: Delete trainee-scoped categories/exercises
	for _, traineeID := range traineeIDs {
		categories, err := s.categoryRepo.GetCategoriesByTrainee(traineeID)
		if err != nil {
			return err
		}
		for _, category := range categories {
			if err := s.exerciseRepo.DeleteExercisesByCategoryID(category.ID.Hex()); err != nil {
				return err
			}
		}
		if err := s.categoryRepo.DeleteCategoriesByTrainee(traineeID); err != nil {
			return err
		}
	}

	// Also clean legacy trainer-scoped categories if any remain.
	if err := s.categoryRepo.DeleteCategoriesByTrainer(trainerEmail); err != nil {
		return err
	}

	// Step 6: Finally, delete the trainer
	if err := s.repository.DeleteTrainer(trainerEmail); err != nil {
		return err
	}

	return nil
}

func (s *TrainerService) UpdateDiscoveryProfile(email string, update map[string]interface{}) error {
	if email == "" {
		return errors.New("unauthorized")
	}
	return s.repository.UpdateTrainer(email, update)
}

func (s *TrainerService) DiscoverTrainers(lat, lng float64, limit int, clientInterests []string) ([]models.DiscoverTrainer, error) {
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	const minMatchFill = 8

	trainers, err := s.repository.FindDiscoveryVisible()
	if err != nil {
		return nil, err
	}

	interests, _ := models.NormalizeExpertises(clientInterests)
	hasCoords := lat != 0 || lng != 0

	type ranked struct {
		item  models.DiscoverTrainer
		match bool
	}
	rankedItems := make([]ranked, 0, len(trainers))
	for _, t := range trainers {
		expertises := models.EffectiveExpertises(t.Expertises)
		item := models.DiscoverTrainer{
			Name:        t.Name,
			Email:       t.Email,
			ImageURL:    t.ImageURL,
			Headline:    t.Headline,
			Bio:         t.Bio,
			Speciality:  t.Speciality,
			Expertises:  expertises,
			Experience:  t.Experience,
			HourlyRate:  t.HourlyRate,
			TrainerType: t.TrainerType,
			City:        t.City,
			Area:        t.Area,
			Latitude:    t.Latitude,
			Longitude:   t.Longitude,
			Rating:      t.Rating,
			RatingCount: t.RatingCount,
		}
		if hasCoords && (t.Latitude != 0 || t.Longitude != 0) {
			item.DistanceKm = haversineKm(lat, lng, t.Latitude, t.Longitude)
		} else {
			item.DistanceKm = -1
		}
		isMatch := models.ExpertiseOverlap(interests, expertises)
		if isMatch {
			item.MatchTier = "match"
		} else {
			item.MatchTier = "nearby"
		}
		rankedItems = append(rankedItems, ranked{item: item, match: isMatch})
	}

	sortByDistance := func(a, b models.DiscoverTrainer) bool {
		di, dj := a.DistanceKm, b.DistanceKm
		if di < 0 && dj < 0 {
			return a.Name < b.Name
		}
		if di < 0 {
			return false
		}
		if dj < 0 {
			return true
		}
		return di < dj
	}

	matches := make([]models.DiscoverTrainer, 0)
	nearby := make([]models.DiscoverTrainer, 0)
	for _, r := range rankedItems {
		if r.match {
			matches = append(matches, r.item)
		} else {
			nearby = append(nearby, r.item)
		}
	}
	sort.SliceStable(matches, func(i, j int) bool { return sortByDistance(matches[i], matches[j]) })
	sort.SliceStable(nearby, func(i, j int) bool { return sortByDistance(nearby[i], nearby[j]) })

	results := matches
	if len(results) < minMatchFill {
		need := minMatchFill - len(results)
		if need > len(nearby) {
			need = len(nearby)
		}
		results = append(results, nearby[:need]...)
	}
	// If still under limit and we have more nearby, fill up to limit
	if len(results) < limit && len(nearby) > 0 {
		start := 0
		if len(matches) < minMatchFill {
			start = minMatchFill - len(matches)
			if start > len(nearby) {
				start = len(nearby)
			}
		}
		for i := start; i < len(nearby) && len(results) < limit; i++ {
			results = append(results, nearby[i])
		}
	}

	if len(results) > limit {
		results = results[:limit]
	}
	return results, nil
}

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}
