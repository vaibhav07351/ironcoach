package controllers

import (
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

// MyAdherence returns the signed-in client's week (role enforced by the route).
func (ctrl *AdherenceController) MyAdherence(c *gin.Context) {
	p := principal(c)
	if p.TraineeID == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "needs_invite", "message": "link with a coach first"}})
		return
	}
	summary, err := ctrl.service.SummaryForTrainee(p.TraineeID, "", p.Location())
	if err != nil {
		respondError(c, err, "adherence_failed")
		return
	}
	c.JSON(http.StatusOK, summary)
}

// TraineeAdherence returns one client's week (trainer ownership enforced by the route).
func (ctrl *AdherenceController) TraineeAdherence(c *gin.Context) {
	summary, err := ctrl.service.SummaryForTrainee(c.Param("trainee_id"), "", principal(c).Location())
	if err != nil {
		respondError(c, err, "adherence_failed")
		return
	}
	c.JSON(http.StatusOK, summary)
}

// Roster returns the trainer's active clients, most at-risk first.
func (ctrl *AdherenceController) Roster(c *gin.Context) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	p := principal(c)
	roster, err := ctrl.service.RosterForTrainer(p.TrainerKey, limit, p.Location())
	if err != nil {
		respondError(c, err, "adherence_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": roster, "count": len(roster)})
}
