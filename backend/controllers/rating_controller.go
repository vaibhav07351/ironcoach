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

// Upsert saves the caller's rating for their coach (client) or one of their clients (trainer).
func (c *RatingController) Upsert(ctx *gin.Context) {
	var body struct {
		ToKind string  `json:"to_kind" binding:"required"`
		ToID   string  `json:"to_id" binding:"required"`
		Score  float64 `json:"score" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		respondBindError(ctx, err)
		return
	}
	rating, err := c.service.Upsert(principal(ctx), body.ToKind, body.ToID, body.Score)
	if err != nil {
		respondError(ctx, err, "rating_failed")
		return
	}
	ctx.JSON(http.StatusOK, rating)
}

// Mine returns the caller's own score for a target plus the target's average.
func (c *RatingController) Mine(ctx *gin.Context) {
	toKind := ctx.Query("to_kind")
	toID := ctx.Query("to_id")
	if toKind == "" || toID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "invalid_query", "message": "to_kind and to_id are required"}})
		return
	}
	result, err := c.service.MineWithAverage(principal(ctx).UserID, toKind, toID)
	if err != nil {
		respondError(ctx, err, "lookup_failed")
		return
	}
	ctx.JSON(http.StatusOK, result)
}
