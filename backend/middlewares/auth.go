package middlewares

import (
	"ironcoach/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc{
	return func(c *gin.Context){
		// Get the token from the Authorization header
		tokenString := c.GetHeader("Authorization")
		if tokenString == ""{
			c.JSON(http.StatusUnauthorized, gin.H{"error":"Authorization token required"})
			c.Abort()
			return
		}

		//verify the token
		claims, err := utils.VerifyJWT(tokenString)
		if err!=nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error":"invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("email",claims.Email)
		c.Next()

	}
}