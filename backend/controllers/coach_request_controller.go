package controllers

import (
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CoachRequestController struct {
	service *services.CoachRequestService
}

func NewCoachRequestController() *CoachRequestController {
	return &CoachRequestController{service: services.NewCoachRequestService()}
}

// Create sends a coaching request (client only, enforced by the route).
func (c *CoachRequestController) Create(ctx *gin.Context) {
	var body struct {
		TrainerID    string `json:"trainer_id" binding:"required,len=24,hexadecimal"`
		ShareConsent bool   `json:"share_consent"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		respondBindError(ctx, err)
		return
	}
	req, err := c.service.Create(principal(ctx), body.TrainerID, body.ShareConsent)
	if err != nil {
		respondError(ctx, err, "request_failed")
		return
	}
	ctx.JSON(http.StatusOK, req)
}

// ListPending lists open requests for the trainer.
func (c *CoachRequestController) ListPending(ctx *gin.Context) {
	items, err := c.service.ListPending(principal(ctx))
	if err != nil {
		respondError(ctx, err, "list_failed")
		return
	}
	ctx.JSON(http.StatusOK, items)
}

// CountPending returns the trainer's open request count.
func (c *CoachRequestController) CountPending(ctx *gin.Context) {
	count, err := c.service.CountPending(principal(ctx))
	if err != nil {
		respondError(ctx, err, "count_failed")
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"count": count})
}

// ListMine lists the client's own requests with their status.
func (c *CoachRequestController) ListMine(ctx *gin.Context) {
	items, err := c.service.ListMine(principal(ctx))
	if err != nil {
		respondError(ctx, err, "list_failed")
		return
	}
	ctx.JSON(http.StatusOK, items)
}

// Cancel withdraws one of the client's pending requests.
func (c *CoachRequestController) Cancel(ctx *gin.Context) {
	if err := c.service.Cancel(principal(ctx), ctx.Param("id")); err != nil {
		respondError(ctx, err, "cancel_failed")
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "cancelled"})
}

// Accept turns a request into a linked client.
func (c *CoachRequestController) Accept(ctx *gin.Context) {
	client, err := c.service.Accept(principal(ctx), ctx.Param("id"))
	if err != nil {
		respondError(ctx, err, "accept_failed")
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "accepted", "client": client})
}

// Reject declines a request.
func (c *CoachRequestController) Reject(ctx *gin.Context) {
	if err := c.service.Reject(principal(ctx), ctx.Param("id")); err != nil {
		respondError(ctx, err, "reject_failed")
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "rejected"})
}
