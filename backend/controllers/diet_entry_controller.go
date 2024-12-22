package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DietEntryController struct {
	service *services.DietEntryService
}

// Constructor for DietEntryController
func NewDietEntryController() *DietEntryController {
	return &DietEntryController{
		service: services.NewDietEntryService(),
	}
}

// Add a new diet entry
func (ctrl *DietEntryController) AddDietEntry(c *gin.Context) {
	var entry models.DietEntry

	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.AddDietEntry(entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add diet entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Diet entry added successfully"})
}

// Get all diet entries for a trainee
func (ctrl *DietEntryController) GetDietEntries(c *gin.Context) {
	traineeID := c.Param("trainee_id")
	date := c.Query("date")

	if traineeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "trainee_id is required"})
		return
	}

	entries, err := ctrl.service.GetDietEntriesByTrainee(traineeID, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch diet entries"})
		return
	}

	c.JSON(http.StatusOK, entries)
}

// Get all diet entry for a trainee by Id
func (ctrl *DietEntryController) GetDietEntryByID(c *gin.Context) {
	entryID := c.Param("entry_id")

	if entryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entry_id is required"})
		return
	}

	entry, err := ctrl.service.GetDietEntryByID(entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch diet entries"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// Update a diet entry
func (ctrl *DietEntryController) UpdateDietEntry(c *gin.Context) {
	entryID := c.Param("entry_id")
	var updateData models.DietEntry

    // Bind the incoming JSON to the DietEntry struct
    if err := c.ShouldBindJSON(&updateData); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Call the service to update the diet entry
    if err := ctrl.service.UpdateDietEntry(entryID, updateData); err != nil {
        if err.Error() == "not found" {
            c.JSON(http.StatusNotFound, gin.H{"error": "Diet entry not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update diet entry"})
        }
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Diet entry updated successfully"})
}


// Delete a diet entry
func (ctrl *DietEntryController) DeleteDietEntry(c *gin.Context) {
	entryID := c.Param("entry_id")

	if err := ctrl.service.DeleteDietEntry(entryID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete diet entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Diet entry deleted successfully"})
}
