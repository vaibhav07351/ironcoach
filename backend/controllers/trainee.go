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

// Add a new trainee
func (ctrl *TraineeController) AddTrainee(c *gin.Context) {
    var trainee models.Trainee
	
    // Get trainer ID from JWT claims
    trainerID := c.MustGet("email").(string)
    trainee.TrainerID = trainerID

    // Bind JSON request
    if err := c.ShouldBindJSON(&trainee); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }


    // Add trainee
    if err := ctrl.service.AddTrainee(trainee); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add trainee"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Trainee added successfully"})
}

// Get trainees for a trainer
func (ctrl *TraineeController) GetTrainees(c *gin.Context) {
    trainerID := c.MustGet("email").(string)

    trainees, err := ctrl.service.GetTraineesByTrainer(trainerID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trainees"})
        return
    }

    c.JSON(http.StatusOK, trainees)
}

// Update a trainee
func (ctrl *TraineeController) UpdateTrainee(c *gin.Context) {
    id := c.Param("id")
    var update map[string]interface{}

    if err := c.ShouldBindJSON(&update); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := ctrl.service.UpdateTrainee(id, update); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update trainee"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Trainee updated successfully"})
}

// Delete a trainee
func (ctrl *TraineeController) DeleteTrainee(c *gin.Context) {
    id := c.Param("id")

    if err := ctrl.service.DeleteTrainee(id); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete trainee"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Trainee deleted successfully"})
}
