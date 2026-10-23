package controllers

import (
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	service *services.AuthService
}

func NewAuthController() *AuthController {
	return &AuthController{service: services.NewAuthService()}
}

// GoogleAuth signs in (or signs up) with a Google ID token.
func (ctrl *AuthController) GoogleAuth(c *gin.Context) {
	var req services.GoogleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBindError(c, err)
		return
	}
	resp, err := ctrl.service.AuthenticateGoogle(req)
	if err != nil {
		respondError(c, err, "auth_failed")
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Me returns the signed-in user's current profile and onboarding flags.
func (ctrl *AuthController) Me(c *gin.Context) {
	user, err := ctrl.service.GetMe(principal(c).UserID)
	if err != nil {
		respondError(c, err, "fetch_failed")
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateSettings changes user preferences (time zone). Body: {"timezone": "Asia/Kolkata"}.
func (ctrl *AuthController) UpdateSettings(c *gin.Context) {
	var body struct {
		Timezone string `json:"timezone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	user, err := ctrl.service.UpdateSettings(principal(c), body.Timezone)
	if err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateClientInterests saves what the client wants to train for (client role enforced by the route).
func (ctrl *AuthController) UpdateClientInterests(c *gin.Context) {
	var body struct {
		Interests []string `json:"interests" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	user, err := ctrl.service.UpdateClientInterests(principal(c), body.Interests)
	if err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, user)
}

// CompleteTrainerExpertise saves first-login coaching categories (trainer role enforced by the route).
func (ctrl *AuthController) CompleteTrainerExpertise(c *gin.Context) {
	var body struct {
		Expertises []string `json:"expertises" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	user, err := ctrl.service.CompleteTrainerExpertise(principal(c), body.Expertises)
	if err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, user)
}

// CompleteTrainerOnboarding updates basic trainer profile fields after Google signup
// (trainer role enforced by the route).
func (ctrl *AuthController) CompleteTrainerOnboarding(c *gin.Context) {
	var body services.TrainerOnboardingInput
	if err := c.ShouldBindJSON(&body); err != nil {
		respondBindError(c, err)
		return
	}
	updated, err := ctrl.service.CompleteTrainerOnboarding(principal(c), body)
	if err != nil {
		respondError(c, err, "update_failed")
		return
	}
	c.JSON(http.StatusOK, updated)
}
