package controllers

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	service *services.AuthService
}

func NewAuthController() *AuthController {
	return &AuthController{service: services.NewAuthService()}
}

func (ctrl *AuthController) GoogleAuth(c *gin.Context) {
	var req services.GoogleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	resp, err := ctrl.service.AuthenticateGoogle(req)
	if err != nil {
		status := http.StatusUnauthorized
		code := "auth_failed"
		msg := err.Error()
		switch {
		case msg == "role is required for new users (trainer or client)":
			status = http.StatusUnprocessableEntity
			code = "role_required"
		case strings.Contains(msg, "already registered as a trainer"),
			strings.Contains(msg, "already registered as a client"),
			strings.Contains(msg, "already registered with a different role"):
			status = http.StatusConflict
			code = "role_mismatch"
		}
		c.JSON(status, gin.H{"error": gin.H{"code": code, "message": msg}})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (ctrl *AuthController) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	id, _ := userID.(string)
	if id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "unauthorized", "message": "missing user"}})
		return
	}

	user, err := ctrl.service.GetMe(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, user)
}

// CompleteTrainerOnboarding updates basic trainer profile fields after Google signup.
func (ctrl *AuthController) CompleteTrainerOnboarding(c *gin.Context) {
	role, _ := c.Get("role")
	if role != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "trainers only"}})
		return
	}

	var body struct {
		PhoneNumber string  `json:"phone_number" binding:"required,len=10"`
		Speciality  string  `json:"speciality"`
		Bio         string  `json:"bio"`
		TrainerType string  `json:"trainer_type"`
		HourlyRate  float64 `json:"hourly_rate"`
		Name        string  `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	email := c.MustGet("email").(string)
	repo := repositories.NewTrainerRepository()
	trainer, err := repo.FindByEmail(email)
	if err != nil || trainer.Email == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "trainer profile not found"}})
		return
	}

	update := map[string]interface{}{
		"phone_number": body.PhoneNumber,
		"speciality":   body.Speciality,
		"bio":          body.Bio,
	}
	if body.Name != "" {
		update["name"] = body.Name
	}
	if body.TrainerType != "" {
		update["trainer_type"] = body.TrainerType
	}
	if body.HourlyRate > 0 {
		update["hourly_rate"] = body.HourlyRate
	}

	if err := repo.UpdateTrainer(email, update); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "update_failed", "message": err.Error()}})
		return
	}

	updated, _ := repo.FindByEmail(email)
	c.JSON(http.StatusOK, updated)
}
