package routes

import (
	"ironcoach/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterTrainerRoutes(router *gin.Engine){
	trainerController := controllers.NewTrainerController()
	router.POST("/registerTrainer",trainerController.RegisterTrainer)
}