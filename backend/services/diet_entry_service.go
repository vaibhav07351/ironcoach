package services

import (
	"errors"
	"fmt"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	maxMealsPerEntry = 12
	maxFoodsPerMeal  = 40
)

type DietEntryService struct {
	repository *repositories.DietEntryRepository
	access     *AccessService
}

// Constructor for DietEntryService
func NewDietEntryService() *DietEntryService {
	return &DietEntryService{
		repository: repositories.NewDietEntryRepository(),
		access:     NewAccessService(),
	}
}

// AddDietEntry creates the day's entry for a trainee the caller may access.
func (s *DietEntryService) AddDietEntry(p Principal, in models.DietEntryInput) (string, error) {
	if err := validateDate("date", in.Date); err != nil {
		return "", err
	}
	if err := validateNotFuture("date", in.Date, p.Location(), time.Now()); err != nil {
		return "", err
	}
	if err := validateMeals(in.Meals); err != nil {
		return "", err
	}
	if err := validateText("notes", in.Notes, false, 2000); err != nil {
		return "", err
	}
	if _, err := s.access.AuthorizeTrainee(p, in.TraineeID); err != nil {
		return "", err
	}

	now := time.Now().UTC()
	entry := models.DietEntry{
		TraineeID: in.TraineeID,
		Date:      in.Date,
		Meals:     in.Meals,
		Notes:     in.Notes,
		CreatedAt: now,
		UpdatedAt: now,
	}
	calculateMealStats(&entry)

	id, err := s.repository.CreateDietEntry(entry)
	if errors.Is(err, repositories.ErrDuplicate) {
		return "", ErrConflict("entry_exists", "a diet entry for this date already exists, edit it instead")
	}
	return id, err
}

// GetDietEntriesByTrainee lists entries (access is enforced by the route middleware).
func (s *DietEntryService) GetDietEntriesByTrainee(traineeID, date string, page Pagination) ([]models.DietEntry, error) {
	if date != "" {
		if err := validateDate("date", date); err != nil {
			return nil, err
		}
	}
	return s.repository.GetDietEntriesByTrainee(traineeID, date, page.Limit, page.Offset)
}

// GetDietEntryByID returns an entry the caller may access.
func (s *DietEntryService) GetDietEntryByID(p Principal, entryID string) (models.DietEntry, error) {
	entry, err := s.repository.GetDietEntryByID(entryID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return entry, ErrNotFound("diet entry")
		}
		return entry, err
	}
	if _, err := s.access.AuthorizeTrainee(p, entry.TraineeID); err != nil {
		return models.DietEntry{}, err
	}
	return entry, nil
}

// UpdateDietEntry replaces the meals and/or notes of an entry and recomputes totals.
// trainee_id, date and created_at can no longer be overwritten by the client.
func (s *DietEntryService) UpdateDietEntry(p Principal, entryID string, in models.DietEntryUpdate) error {
	existing, err := s.GetDietEntryByID(p, entryID)
	if err != nil {
		return err
	}

	if in.Meals == nil && in.Notes == nil {
		return ErrValidation("nothing to update")
	}
	if in.Meals != nil {
		if err := validateMeals(*in.Meals); err != nil {
			return err
		}
		existing.Meals = *in.Meals
	}
	if in.Notes != nil {
		if err := validateText("notes", *in.Notes, false, 2000); err != nil {
			return err
		}
		existing.Notes = *in.Notes
	}
	calculateMealStats(&existing)

	found, err := s.repository.UpdateFields(entryID, bson.M{
		"meals":          existing.Meals,
		"notes":          existing.Notes,
		"total_calories": existing.TotalCalories,
		"total_proteins": existing.TotalProteins,
		"total_carbs":    existing.TotalCarbs,
		"total_fats":     existing.TotalFats,
		"updated_at":     time.Now().UTC(),
	})
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("diet entry")
	}
	return nil
}

// DeleteDietEntry removes an entry the caller may access.
func (s *DietEntryService) DeleteDietEntry(p Principal, entryID string) error {
	if _, err := s.GetDietEntryByID(p, entryID); err != nil {
		return err
	}
	found, err := s.repository.DeleteDietEntry(entryID)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("diet entry")
	}
	return nil
}

func validateMeals(meals []models.Meal) error {
	if len(meals) > maxMealsPerEntry {
		return ErrValidation(fmt.Sprintf("a day can have at most %d meals", maxMealsPerEntry))
	}
	for i, meal := range meals {
		label := fmt.Sprintf("meal %d", i+1)
		if err := validateText(label+" name", meal.Name, true, 60); err != nil {
			return err
		}
		if len(meal.Foods) > maxFoodsPerMeal {
			return ErrValidation(fmt.Sprintf("%s can have at most %d foods", label, maxFoodsPerMeal))
		}
		for j, f := range meal.Foods {
			fl := fmt.Sprintf("%s food %d", label, j+1)
			if err := validateText(fl+" name", f.Name, true, 120); err != nil {
				return err
			}
			if err := validateText(fl+" units", f.Units, false, 30); err != nil {
				return err
			}
			for field, v := range map[string]float64{
				"quantity": f.Quantity, "calories": f.Calories, "proteins": f.Proteins, "carbs": f.Carbs, "fats": f.Fats,
			} {
				if err := validateNumber(fl+" "+field, v, 0, 10000); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// calculateMealStats recomputes per-meal and daily totals from the foods.
func calculateMealStats(entry *models.DietEntry) {
	entry.TotalCalories = 0
	entry.TotalProteins = 0
	entry.TotalCarbs = 0
	entry.TotalFats = 0

	for i := range entry.Meals {
		meal := &entry.Meals[i]
		meal.Calories = 0
		meal.Proteins = 0
		meal.Carbs = 0
		meal.Fats = 0

		for _, food := range meal.Foods {
			meal.Calories += food.Calories
			meal.Proteins += food.Proteins
			meal.Carbs += food.Carbs
			meal.Fats += food.Fats
		}

		entry.TotalCalories += meal.Calories
		entry.TotalProteins += meal.Proteins
		entry.TotalCarbs += meal.Carbs
		entry.TotalFats += meal.Fats
	}
}
