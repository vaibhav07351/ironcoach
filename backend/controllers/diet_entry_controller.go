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

// AddDietEntry creates the day's diet entry.
func (ctrl *DietEntryController) AddDietEntry(c *gin.Context) {
	var in models.DietEntryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	id, err := ctrl.service.AddDietEntry(principal(c), in)
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Diet entry added successfully", "id": id})
}

// GetDietEntries lists a trainee's entries, newest first. Query: date, limit (max 100), offset.
func (ctrl *DietEntryController) GetDietEntries(c *gin.Context) {
	page := pageFromQuery(c, 31, 100)
	entries, err := ctrl.service.GetDietEntriesByTrainee(c.Param("trainee_id"), c.Query("date"), page)
	if err != nil {
		respondError(c, err, "list_failed")
		return
	}
	c.JSON(http.StatusOK, entries)
}

// GetDietEntryByID returns one entry the caller may access.
func (ctrl *DietEntryController) GetDietEntryByID(c *gin.Context) {
	entry, err := ctrl.service.GetDietEntryByID(principal(c), c.Param("entry_id"))
	if err != nil {
		respondError(c, err, "fetch_failed")
		return
	}
	c.JSON(http.StatusOK, entry)
}

// UpdateDietEntry edits meals and/or notes of an entry.
func (ctrl *DietEntryController) UpdateDietEntry(c *gin.Context) {
	var in models.DietEntryUpdate
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	if err := ctrl.service.UpdateDietEntry(principal(c), c.Param("entry_id"), in); err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Diet entry updated successfully"})
}

// DeleteDietEntry removes an entry.
func (ctrl *DietEntryController) DeleteDietEntry(c *gin.Context) {
	if err := ctrl.service.DeleteDietEntry(principal(c), c.Param("entry_id")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Diet entry deleted successfully"})
}
