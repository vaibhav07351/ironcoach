package controllers

import (
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AttendanceController struct {
	service *services.AttendanceService
}

func NewAttendanceController() *AttendanceController {
	return &AttendanceController{service: services.NewAttendanceService()}
}

// List returns attended dates, newest first. Query: from, to (YYYY-MM-DD), limit (max 400).
func (ctrl *AttendanceController) List(c *gin.Context) {
	dates, err := ctrl.service.List(principal(c), c.Param("trainee_id"), c.Query("from"), c.Query("to"), pageFromQuery(c, 100, 400))
	if err != nil {
		respondError(c, err, "list_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"dates": dates})
}

// Mark records attendance for a day: 201 the first time, 200 when it was already marked.
func (ctrl *AttendanceController) Mark(c *gin.Context) {
	created, err := ctrl.service.Mark(principal(c), c.Param("trainee_id"), c.Param("date"))
	if err != nil {
		respondError(c, err, "mark_failed")
		return
	}
	c.JSON(createdStatus(created), gin.H{"date": c.Param("date"), "attended": true})
}

// Unmark removes attendance for a day (idempotent).
func (ctrl *AttendanceController) Unmark(c *gin.Context) {
	if err := ctrl.service.Unmark(principal(c), c.Param("trainee_id"), c.Param("date")); err != nil {
		respondError(c, err, "unmark_failed")
		return
	}
	c.Status(http.StatusNoContent)
}
