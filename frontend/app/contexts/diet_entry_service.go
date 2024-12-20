package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type DietEntryService struct {
	repository *repositories.DietEntryRepository
}

// Constructor for DietEntryService
func NewDietEntryService() *DietEntryService {
	return &DietEntryService{
		repository: repositories.NewDietEntryRepository(),
	}
}

// Add a new diet entry
func (s *DietEntryService) AddDietEntry(entry models.DietEntry) error {
	entry.CreatedAt = time.Now()
	entry.UpdatedAt = time.Now()

	// Calculate calories and proteins for each meal
    calculateMealStats(&entry)

	return s.repository.CreateDietEntry(entry)
}

// Get all diet entries for a trainee
func (s *DietEntryService) GetDietEntriesByTrainee(traineeID string, date string) ([]models.DietEntry, error) {
	return s.repository.GetDietEntriesByTrainee(traineeID, date)
}

// Update a diet entry
func (s *DietEntryService) UpdateDietEntry(entryID string, updateData models.DietEntry) error {

	// Calculate calories and proteins for each meal
    calculateMealStats(&updateData)

	updateData.UpdatedAt = time.Now()

    // Call the repository to update the entry
    return s.repository.UpdateDietEntry(entryID, updateData)
}

// Delete a diet entry
func (s *DietEntryService) DeleteDietEntry(entryID string) error {
	return s.repository.DeleteDietEntry(entryID)
}


// Helper function to calculate meal and total stats
func calculateMealStats(entry *models.DietEntry) {
    entry.TotalCalories = 0
    entry.TotalProteins = 0

    for i := range entry.Meals {
        meal := &entry.Meals[i]
        meal.Calories = 0
        meal.Proteins = 0

        for _, food := range meal.Foods {
            meal.Calories += food.Calories
            meal.Proteins += food.Proteins
        }

        entry.TotalCalories += meal.Calories
        entry.TotalProteins += meal.Proteins
    }
}