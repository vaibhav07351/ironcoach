package controllers

import (
    "net/http"
    "ironcoach/models"
    "ironcoach/services"

    "github.com/gin-gonic/gin"
)

type WorkoutLogController struct {
    service *services.WorkoutLogService
}

// Constructor for WorkoutLogController
func NewWorkoutLogController() *WorkoutLogController {
    return &WorkoutLogController{
        service: services.NewWorkoutLogService(),
    }
}

// Add a new workout log
func (ctrl *WorkoutLogController) AddWorkoutLog(c *gin.Context) {
    var log models.WorkoutLog

    // Bind JSON request to WorkoutLog model
    if err := c.ShouldBindJSON(&log); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Call service to add workout log
    if err := ctrl.service.AddWorkoutLog(log); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add workout log"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Workout log added successfully"})
}

// Get all workout logs for a trainee
func (ctrl *WorkoutLogController) GetWorkoutLogs(c *gin.Context) {
    traineeID := c.Param("trainee_id")

    logs, err := ctrl.service.GetWorkoutLogsByTrainee(traineeID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workout logs"})
        return
    }

    c.JSON(http.StatusOK, logs)
}
