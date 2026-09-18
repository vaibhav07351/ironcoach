package middlewares

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"net/http"

	"github.com/gin-gonic/gin"
)

// EnforceTraineeAccess allows trainers any of their trainees; clients only their linked trainee_id.
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
			c.Next()
			return
		}
		if errMsg := AuthorizeTraineeAccess(c, requested); errMsg != "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "forbidden", "message": errMsg},
			})
			return
		}
		c.Next()
	}
}

// AuthorizeTraineeAccess returns an empty string when allowed, otherwise an error message.
// Trainers may access trainees they own; clients may only access their linked trainee_id.
func AuthorizeTraineeAccess(c *gin.Context, traineeID string) string {
	if traineeID == "" {
		return "trainee_id is required"
	}

	role, _ := c.Get("role")
	roleStr, _ := role.(string)

	if roleStr == models.RoleClient {
		linked, _ := c.Get("trainee_id")
		linkedID, _ := linked.(string)
		if linkedID == "" || linkedID != traineeID {
			return "clients can only access their own data"
		}
		return ""
	}

	// Trainers (and legacy tokens treated as trainers): verify ownership.
	email, _ := c.Get("email")
	trainerEmail, _ := email.(string)
	if trainerEmail == "" {
		return "unauthorized"
	}

	traineeRepo := repositories.NewTraineeRepository()
	trainee, err := traineeRepo.GetTraineeByID(traineeID)
	if err != nil {
		return "trainee not found"
	}
	if trainee.TrainerID != trainerEmail {
		return "trainee does not belong to this trainer"
	}
	return ""
}
