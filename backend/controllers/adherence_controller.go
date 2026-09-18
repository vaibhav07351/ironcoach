package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdherenceController struct {
	service *services.AdherenceService
}

func NewAdherenceController() *AdherenceController {
	return &AdherenceController{service: services.NewAdherenceService()}
}

func (ctrl *AdherenceController) MyAdherence(c *gin.Context) {
	role, _ := c.Get("role")
	if role != models.RoleClient {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "clients only"}})
		return
	}

	traineeID, _ := c.Get("trainee_id")
	id, _ := traineeID.(string)
	if id == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "needs_invite", "message": "link an invite code first"}})
		return
	}

	summary, err := ctrl.service.SummaryForTrainee(id, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "adherence_failed", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (ctrl *AdherenceController) TraineeAdherence(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "" && role != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}

	traineeID := c.Param("trainee_id")
	summary, err := ctrl.service.SummaryForTrainee(traineeID, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "adherence_failed", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (ctrl *AdherenceController) Roster(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "" && role != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}

	limit := 50
	if q := c.Query("limit"); q != "" {
		if n, err := strconv.Atoi(q); err == nil {
			limit = n
		}
	}

	trainerEmail := c.MustGet("email").(string)
	roster, err := ctrl.service.RosterForTrainer(trainerEmail, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "adherence_failed", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": roster, "count": len(roster)})
}
