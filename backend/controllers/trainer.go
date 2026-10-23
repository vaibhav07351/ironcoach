package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type TrainerController struct {
	service *services.TrainerService
}

// constructor for TrainerController
func NewTrainerController() *TrainerController {
	return &TrainerController{
		service: services.NewTrainerService(),
	}
}

// GetTrainerDetails returns the calling trainer's own profile.
func (c *TrainerController) GetTrainerDetails(ctx *gin.Context) {
	trainer, err := c.service.GetMyProfile(principal(ctx))
	if err != nil {
		respondError(ctx, err, "fetch_failed")
		return
	}
	ctx.JSON(http.StatusOK, trainer)
}

// UpdateDiscoveryProfile edits the calling trainer's profile and discovery settings.
func (c *TrainerController) UpdateDiscoveryProfile(ctx *gin.Context) {
	var in models.TrainerProfileUpdate
	if err := ctx.ShouldBindJSON(&in); err != nil {
		respondBindError(ctx, err)
		return
	}
	trainer, err := c.service.UpdateProfile(principal(ctx), in)
	if err != nil {
		respondError(ctx, err, "update_failed")
		return
	}
	ctx.JSON(http.StatusOK, trainer)
}

// DiscoverTrainers lists coaches for a client. Query: lat, lng, limit (max 50), interests
// (comma-separated; defaults to the client's saved interests).
func (c *TrainerController) DiscoverTrainers(ctx *gin.Context) {
	lat, latErr := parseOptionalFloat(ctx.Query("lat"))
	lng, lngErr := parseOptionalFloat(ctx.Query("lng"))
	if latErr != nil || lngErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "invalid_query", "message": "lat and lng must be numbers"}})
		return
	}
	limit, _ := strconv.Atoi(ctx.Query("limit"))

	var interests []string
	if v := ctx.Query("interests"); v != "" {
		interests = strings.Split(v, ",")
	}

	items, err := c.service.DiscoverTrainers(principal(ctx), lat, lng, limit, interests)
	if err != nil {
		respondError(ctx, err, "list_failed")
		return
	}
	ctx.JSON(http.StatusOK, items)
}

func parseOptionalFloat(v string) (float64, error) {
	if v == "" {
		return 0, nil
	}
	return strconv.ParseFloat(v, 64)
}
