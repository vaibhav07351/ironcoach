package controllers

import (
	"errors"
	"ironcoach/middlewares"
	"ironcoach/services"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// respondError writes the structured error shape {"error":{"code","message"}}.
// Typed service errors map to 4xx with their safe message; anything else is logged with request
// context and returned as a generic 500 so internal details never reach the client.
func respondError(c *gin.Context, err error, fallbackCode string) {
	if e, ok := services.AsError(err); ok {
		status := http.StatusBadRequest
		switch e.Kind {
		case services.KindValidation:
			status = http.StatusUnprocessableEntity
		case services.KindNotFound:
			status = http.StatusNotFound
		case services.KindForbidden:
			status = http.StatusForbidden
		case services.KindConflict:
			status = http.StatusConflict
		case services.KindUnauthorized:
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": gin.H{"code": e.Code, "message": e.Message}})
		return
	}

	slog.Error("request failed",
		"request_id", middlewares.RequestID(c),
		"route", c.FullPath(),
		"method", c.Request.Method,
		"user_id", c.GetString("user_id"),
		"code", fallbackCode,
		"err", err,
	)
	c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": fallbackCode, "message": "something went wrong, please try again"}})
}

// respondBindError reports a malformed, invalid or oversized request body.
func respondBindError(c *gin.Context, err error) {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": gin.H{"code": "body_too_large", "message": "request is too large"}})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "invalid_body", "message": err.Error()}})
}

// principal returns the authenticated caller resolved by AuthMiddleware.
func principal(c *gin.Context) services.Principal {
	return middlewares.CurrentPrincipal(c)
}
