package controllers

import (
	"ironcoach/services"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type AccountController struct {
	service *services.AccountService
}

func NewAccountController() *AccountController {
	return &AccountController{service: services.NewAccountService()}
}

// DeleteAccount permanently deletes the signed-in account. The body must contain
// {"confirm": "DELETE"} so a stray request cannot wipe an account.
func (ctrl *AccountController) DeleteAccount(c *gin.Context) {
	var body struct {
		Confirm string `json:"confirm" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Confirm != "DELETE" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "confirmation_required", "message": `send {"confirm":"DELETE"} to delete your account`}})
		return
	}
	if err := ctrl.service.DeleteAccount(principal(c)); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "account deleted"})
}

// LeaveCoach unlinks the signed-in client from their coach.
func (ctrl *AccountController) LeaveCoach(c *gin.Context) {
	if err := ctrl.service.LeaveCoach(principal(c)); err != nil {
		respondError(c, err, "leave_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "you have left your coach"})
}

// AppConfig tells the app which versions are supported, so old builds can show a
// "please update" screen before a breaking change. Public, no auth.
func AppConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"min_supported_version": envOr("MIN_APP_VERSION", "1.0.0"),
		"latest_version":        envOr("LATEST_APP_VERSION", "1.0.0"),
	})
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}
