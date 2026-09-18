package controllers

import (
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RatingController struct {
	service *services.RatingService
}

func NewRatingController() *RatingController {
	return &RatingController{service: services.NewRatingService()}
}

func (c *RatingController) Upsert(ctx *gin.Context) {
	userID, _ := ctx.Get("user_id")
	role, _ := ctx.Get("role")
	id, _ := userID.(string)
	roleStr, _ := role.(string)
	if id == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user"}})
		return
	}

	var body struct {
		ToKind string  `json:"to_kind" binding:"required"`
		ToID   string  `json:"to_id" binding:"required"`
		Score  float64 `json:"score" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	rating, err := c.service.Upsert(id, roleStr, body.ToKind, body.ToID, body.Score)
	if err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "rating_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, rating)
}

func (c *RatingController) Mine(ctx *gin.Context) {
	userID, _ := ctx.Get("user_id")
	id, _ := userID.(string)
	if id == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user"}})
		return
	}
	toKind := ctx.Query("to_kind")
	toID := ctx.Query("to_id")
	result, err := c.service.MineWithAverage(id, toKind, toID)
	if err != nil {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "lookup_failed", "message": err.Error()}})
		return
	}
	ctx.JSON(http.StatusOK, result)
}
