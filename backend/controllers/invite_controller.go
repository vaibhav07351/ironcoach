package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type InviteController struct {
	service *services.InviteService
}

func NewInviteController() *InviteController {
	return &InviteController{service: services.NewInviteService()}
}

func (ctrl *InviteController) CreateInvite(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "" && role != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}

	var body struct {
		TraineeID string `json:"trainee_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	trainerEmail := c.MustGet("email").(string)
	invite, err := ctrl.service.CreateInvite(trainerEmail, body.TraineeID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "forbidden: trainee does not belong to this trainer" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": gin.H{"code": "invite_failed", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, invite)
}

func (ctrl *InviteController) RedeemInvite(c *gin.Context) {
	role, _ := c.Get("role")
	if role != models.RoleClient {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "clients only"}})
		return
	}

	var body struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	userID, _ := c.Get("user_id")
	id, _ := userID.(string)
	if id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user"}})
		return
	}

	result, err := ctrl.service.RedeemInvite(id, body.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "redeem_failed", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, result)
}
