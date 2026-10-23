package controllers

import (
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

// CreateInvite creates a single-use invite code for one of the trainer's clients.
func (ctrl *InviteController) CreateInvite(c *gin.Context) {
	var body struct {
		TraineeID string `json:"trainee_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	invite, err := ctrl.service.CreateInvite(principal(c), body.TraineeID)
	if err != nil {
		respondError(c, err, "invite_failed")
		return
	}
	c.JSON(http.StatusOK, invite)
}

// RedeemInvite links the signed-in client to their coach.
func (ctrl *InviteController) RedeemInvite(c *gin.Context) {
	var body struct {
		Code         string `json:"code" binding:"required"`
		ShareConsent bool   `json:"share_consent"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	result, err := ctrl.service.RedeemInvite(principal(c), body.Code, body.ShareConsent)
	if err != nil {
		respondError(c, err, "redeem_failed")
		return
	}
	c.JSON(http.StatusOK, result)
}
