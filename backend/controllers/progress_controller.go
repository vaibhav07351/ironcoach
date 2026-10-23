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
	progress, err := ctrl.service.GetProgress(c.Param("trainee_id"))
	if err != nil {
		respondError(c, err, "progress_failed")
		return
	}
	c.JSON(http.StatusOK, progress)
}

// AddWeightProgress records the day's weight (one entry per day; re-logging replaces it).
func (ctrl *ProgressController) AddWeightProgress(c *gin.Context) {
	var body struct {
		TraineeID string  `json:"trainee_id" binding:"required"`
		Date      string  `json:"date" binding:"required"`
		Weight    float64 `json:"weight" binding:"required"`
		BodyFat   float64 `json:"body_fat"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}

	err := ctrl.service.AddWeightProgress(principal(c), models.WeightBMIProgress{
		TraineeID: body.TraineeID,
		Date:      body.Date,
		Weight:    body.Weight,
		BodyFat:   body.BodyFat,
	})
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Weight progress added successfully"})
}
