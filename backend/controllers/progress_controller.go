package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ProgressController struct {
	service *services.ProgressService
}

// Constructor for ProgressController
func NewProgressController() *ProgressController {
	return &ProgressController{
		service: services.NewProgressService(),
	}
}

// GetProgress retrieves the progress data for a trainee
func (ctrl *ProgressController) GetProgress(c *gin.Context) {
	traineeID := c.Param("trainee_id")
	if traineeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Trainee ID is required"})
		return
	}

	progress, err := ctrl.service.GetProgress(traineeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch progress"})
		return
	}

	c.JSON(http.StatusOK, progress)
}

// AddWeightProgress adds a new weight entry for the trainee
func (ctrl *ProgressController) AddWeightProgress(c *gin.Context) {
	var weightBMI models.WeightBMIProgress
	if err := c.ShouldBindJSON(&weightBMI); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if weightBMI.TraineeID == "" || weightBMI.Date == "" || weightBMI.Weight == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Trainee ID, Date, and Weight are required"})
		return
	}

	err := ctrl.service.AddWeightProgress(weightBMI)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add weight progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Weight progress added successfully"})
}
