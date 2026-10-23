package controllers

import (
	"net/http"

	"ironcoach/models"
	"ironcoach/services"

	"github.com/gin-gonic/gin"
)

type TraineeController struct {
	service *services.TraineeService
}

// Constructor for TraineeController
func NewTraineeController() *TraineeController {
	return &TraineeController{
		service: services.NewTraineeService(),
	}
}

// AddTrainee creates a client owned by the calling trainer.
func (ctrl *TraineeController) AddTrainee(c *gin.Context) {
	var in models.TraineeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	id, err := ctrl.service.AddTrainee(principal(c), in)
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Trainee added successfully", "id": id})
}

// GetTrainees lists the trainer's clients by name. Query: active_status, limit (max 500), offset.
func (ctrl *TraineeController) GetTrainees(c *gin.Context) {
	page := pageFromQuery(c, 200, 500)
	trainees, err := ctrl.service.GetTraineesByTrainer(principal(c), c.Query("active_status"), page)
	if err != nil {
		respondError(c, err, "list_failed")
		return
	}
	c.JSON(http.StatusOK, trainees)
}

// GetTraineeByID returns one client record the caller may access.
func (ctrl *TraineeController) GetTraineeByID(c *gin.Context) {
	trainee, err := ctrl.service.GetTrainee(principal(c), c.Param("trainee_id"))
	if err != nil {
		respondError(c, err, "fetch_failed")
		return
	}
	c.JSON(http.StatusOK, trainee)
}

// UpdateTrainee edits the provided fields of a client record.
func (ctrl *TraineeController) UpdateTrainee(c *gin.Context) {
	var in models.TraineeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	if err := ctrl.service.UpdateTrainee(principal(c), c.Param("id"), in); err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Trainee updated successfully"})
}

// DeleteTrainee removes a client and all their data, and unlinks their account.
func (ctrl *TraineeController) DeleteTrainee(c *gin.Context) {
	if err := ctrl.service.DeleteTrainee(principal(c), c.Param("id")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Trainee deleted successfully"})
}
