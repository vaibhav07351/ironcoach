package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"
	"strconv"

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

// AddWorkoutLog creates a log. Returns 201 for a new log and 200 when a retried request with
// the same client_id matched an existing one.
func (ctrl *WorkoutLogController) AddWorkoutLog(c *gin.Context) {
	var in models.WorkoutLogInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}

	log, created, err := ctrl.service.AddWorkoutLog(principal(c), in)
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	status := http.StatusCreated
	if !created {
		status = http.StatusOK
	}
	c.JSON(status, gin.H{"message": "Workout log added successfully", "log": log})
}

// GetWorkoutLogs lists a trainee's logs, newest first. Query: date, limit (max 200), offset.
func (ctrl *WorkoutLogController) GetWorkoutLogs(c *gin.Context) {
	page := pageFromQuery(c, 50, 200)
	logs, err := ctrl.service.GetWorkoutLogsByTrainee(c.Param("trainee_id"), c.Query("date"), page)
	if err != nil {
		respondError(c, err, "list_failed")
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (ctrl *WorkoutLogController) UpdateWorkoutLog(c *gin.Context) {
	var in models.WorkoutLogUpdate
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	if err := ctrl.service.UpdateWorkoutLog(principal(c), c.Param("log_id"), in); err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Workout log updated successfully"})
}

func (ctrl *WorkoutLogController) DeleteWorkoutLog(c *gin.Context) {
	if err := ctrl.service.DeleteWorkoutLog(principal(c), c.Param("log_id")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Workout log deleted successfully"})
}

func (ctrl *WorkoutLogController) GetTraineeProgress(c *gin.Context) {
	progress, err := ctrl.service.GetTraineeProgress(c.Param("trainee_id"))
	if err != nil {
		respondError(c, err, "progress_failed")
		return
	}
	c.JSON(http.StatusOK, progress)
}

// pageFromQuery reads limit/offset query params, clamped to sane bounds.
func pageFromQuery(c *gin.Context, def, max int) services.Pagination {
	limit, _ := strconv.Atoi(c.Query("limit"))
	offset, _ := strconv.Atoi(c.Query("offset"))
	return services.NewPagination(limit, offset, def, max)
}
