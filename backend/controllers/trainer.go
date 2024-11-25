package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

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