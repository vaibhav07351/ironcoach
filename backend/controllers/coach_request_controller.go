package controllers

import (
	"ironcoach/models"
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

func (c *CoachRequestController) Create(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != models.RoleClient {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "clients only"}})
		return
	}
	userID, _ := ctx.Get("user_id")
	id, _ := userID.(string)
	if id == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user"}})
		return
	}

	var body struct {
		TrainerEmail string `json:"trainer_email" binding:"required,email"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	req, err := c.service.Create(id, body.TrainerEmail)
	if err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "request_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, req)
}

func (c *CoachRequestController) ListPending(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != "" && role != models.RoleTrainer {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}
	email := ctx.MustGet("email").(string)
	items, err := c.service.ListPending(email)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "list_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, items)
}

func (c *CoachRequestController) CountPending(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != "" && role != models.RoleTrainer {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}
	email := ctx.MustGet("email").(string)
	count, err := c.service.CountPending(email)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "count_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"count": count})
}

func (c *CoachRequestController) Accept(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != "" && role != models.RoleTrainer {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}
	email := ctx.MustGet("email").(string)
	id := ctx.Param("id")
	result, err := c.service.Accept(email, id)
	if err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "accept_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "accepted", "client": result.User})
}

func (c *CoachRequestController) Reject(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != "" && role != models.RoleTrainer {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}
	email := ctx.MustGet("email").(string)
	id := ctx.Param("id")
	if err := c.service.Reject(email, id); err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "reject_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "rejected"})
}
