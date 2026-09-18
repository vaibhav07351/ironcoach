package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TrainerController struct {
	service *services.TrainerService
}

//constructor for TrainerController

func NewTrainerController() *TrainerController {
	return &TrainerController{
		service: services.NewTrainerService(),
	}
}

// registration of new trainer
func (ctrl *TrainerController) RegisterTrainer(c *gin.Context) {
	var trainer models.Trainer

	//Bind JSON req to Trainer Struct
	if err := c.ShouldBindJSON(&trainer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//call service to register trainer
	if err := ctrl.service.RegisterTrainer(trainer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Trainer registered Successfully!"})
}

func (ctrl *TrainerController) LoginTrainer(c *gin.Context) {
	var loginRequest struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	//Bind JSON request
	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Call the service to authenticate trainer
	token, err := ctrl.service.LoginTrainer(loginRequest.Email, loginRequest.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})

}

// Get Trainers
func (c *TrainerController) GetTrainers(ctx *gin.Context) {
	trainers, err := c.service.GetTrainers()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve trainers"})
		return
	}

	ctx.JSON(http.StatusOK, trainers)
}

func (c *TrainerController) GetTrainerDetails(ctx *gin.Context) {
	trainerID := ctx.MustGet("email").(string)
	trainer, err := c.service.GetTrainerByID(trainerID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Trainer not found"})
		return
	}
	ctx.JSON(http.StatusOK, trainer)
}

func (c *TrainerController) UpdateDiscoveryProfile(ctx *gin.Context) {
	role, _ := ctx.Get("role")
	if role != "" && role != models.RoleTrainer {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}
	email := ctx.MustGet("email").(string)

	var body struct {
		Headline         *string  `json:"headline"`
		Bio              *string  `json:"bio"`
		Speciality       *string  `json:"speciality"`
		City             *string  `json:"city"`
		Area             *string  `json:"area"`
		Pincode          *string  `json:"pincode"`
		Latitude         *float64 `json:"latitude"`
		Longitude        *float64 `json:"longitude"`
		HourlyRate       *float64 `json:"hourly_rate"`
		ImageURL         *string  `json:"image_url"`
		Experience       *int     `json:"experience"`
		TrainerType      *string  `json:"trainer_type"`
		DiscoveryVisible *bool    `json:"discovery_visible"`
		Name             *string  `json:"name"`
		PhoneNumber      *string  `json:"phone_number"`
		Address          *string  `json:"address"`
		Availability     *string  `json:"availability"`
		SocialHandle     *string  `json:"social_handle"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	update := map[string]interface{}{}
	if body.Headline != nil {
		update["headline"] = *body.Headline
	}
	if body.Bio != nil {
		update["bio"] = *body.Bio
	}
	if body.Speciality != nil {
		update["speciality"] = *body.Speciality
	}
	if body.City != nil {
		update["city"] = *body.City
	}
	if body.Area != nil {
		update["area"] = *body.Area
	}
	if body.Pincode != nil {
		update["pincode"] = *body.Pincode
	}
	if body.Latitude != nil {
		update["latitude"] = *body.Latitude
	}
	if body.Longitude != nil {
		update["longitude"] = *body.Longitude
	}
	if body.HourlyRate != nil {
		update["hourly_rate"] = *body.HourlyRate
	}
	if body.ImageURL != nil {
		update["image_url"] = *body.ImageURL
	}
	if body.Experience != nil {
		update["experience"] = *body.Experience
	}
	if body.TrainerType != nil {
		update["trainer_type"] = *body.TrainerType
	}
	if body.DiscoveryVisible != nil {
		update["discovery_visible"] = *body.DiscoveryVisible
	}
	if body.Name != nil {
		update["name"] = *body.Name
	}
	if body.PhoneNumber != nil {
		update["phone_number"] = *body.PhoneNumber
	}
	if body.Address != nil {
		update["address"] = *body.Address
	}
	if body.Availability != nil {
		update["availability"] = *body.Availability
	}
	if body.SocialHandle != nil {
		update["social_handle"] = *body.SocialHandle
	}
	if len(update) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": "no fields to update"}})
		return
	}

	if err := c.service.UpdateDiscoveryProfile(email, update); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "update_failed", "message": err.Error()}})
		return
	}
	trainer, err := c.service.GetTrainerByID(email)
	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"message": "updated"})
		return
	}
	ctx.JSON(http.StatusOK, trainer)
}

func (c *TrainerController) DiscoverTrainers(ctx *gin.Context) {
	lat := 0.0
	lng := 0.0
	if v := ctx.Query("lat"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			lat = parsed
		}
	}
	if v := ctx.Query("lng"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			lng = parsed
		}
	}
	limit := 50
	if v := ctx.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}

	items, err := c.service.DiscoverTrainers(lat, lng, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "list_failed", "message": "Failed to discover trainers"}})
		return
	}
	ctx.JSON(http.StatusOK, items)
}

// DeleteTrainer performs cascading delete of trainer and all associated data
func (c *TrainerController) DeleteTrainer(ctx *gin.Context) {
	// Get the email of the logged-in trainer from the JWT token
	loggedInTrainerEmail := ctx.MustGet("email").(string)

	// Check if the logged-in trainer is admin
	if loggedInTrainerEmail != "admin@gmail.com" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Only admin can delete trainers"})
		return
	}

	trainerEmail := ctx.Param("email")
	if trainerEmail == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Trainer email is required"})
		return
	}

	// Check if trainer exists
	_, err := c.service.GetTrainerByID(trainerEmail)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Trainer not found"})
		return
	}

	// Perform cascading delete
	if err := c.service.DeleteTrainerCascade(trainerEmail); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete trainer: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Trainer and all associated data deleted successfully"})
}
