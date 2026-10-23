package controllers

import (
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type TodayController struct {
	service *services.TodayService
}

func NewTodayController() *TodayController {
	return &TodayController{service: services.NewTodayService()}
}

// Overview returns the trainer's Today screen data (role enforced by the route).
func (ctrl *TodayController) Overview(c *gin.Context) {
	overview, err := ctrl.service.Overview(principal(c))
	if err != nil {
		respondError(c, err, "today_failed")
		return
	}
	c.JSON(http.StatusOK, overview)
}

// Dues lists the clients who owe money, largest first. Query: limit (max 200), offset.
func (ctrl *TodayController) Dues(c *gin.Context) {
	items, total, count, err := ctrl.service.Dues(principal(c), pageFromQuery(c, 100, 200))
	if err != nil {
		respondError(c, err, "dues_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "count": count, "total_paise": total})
}
