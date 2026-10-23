package middlewares

import (
	"ironcoach/services"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// EnforceTraineeAccess allows the owning trainer, or the client linked to the trainee in the
// path (or query) parameter. Ownership is checked against the database on every request.
func EnforceTraineeAccess(paramName string) gin.HandlerFunc {
	if paramName == "" {
		paramName = "trainee_id"
	}
	return func(c *gin.Context) {
		requested := c.Param(paramName)
		if requested == "" {
			requested = c.Query(paramName)
		}
		if requested == "" {
			abortJSON(c, http.StatusBadRequest, "validation_error", paramName+" is required")
			return
		}
		if status, code, msg := checkTraineeAccess(c, requested); status != 0 {
			abortJSON(c, status, code, msg)
			return
		}
		c.Next()
	}
}

// AuthorizeTraineeAccess returns an empty string when allowed, otherwise an error message.
// Used by handlers whose trainee id arrives in the body.
func AuthorizeTraineeAccess(c *gin.Context, traineeID string) string {
	if traineeID == "" {
		return "trainee_id is required"
	}
	if _, _, msg := checkTraineeAccess(c, traineeID); msg != "" {
		return msg
	}
	return ""
}

func checkTraineeAccess(c *gin.Context, traineeID string) (status int, code, msg string) {
	if authenticator == nil {
		return http.StatusInternalServerError, "server_misconfigured", "something went wrong, please try again"
	}
	_, err := authenticator.AuthorizeTrainee(CurrentPrincipal(c), traineeID)
	if err == nil {
		return 0, "", ""
	}
	if e, ok := services.AsError(err); ok {
		switch e.Kind {
		case services.KindNotFound:
			return http.StatusNotFound, e.Code, e.Message
		default:
			return http.StatusForbidden, "forbidden", e.Message
		}
	}
	slog.Error("trainee access check failed", "request_id", RequestID(c), "trainee_id", traineeID, "err", err)
	return http.StatusServiceUnavailable, "access_check_failed", "please try again in a moment"
}
