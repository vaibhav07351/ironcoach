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

//Get Trainers
func (c *TrainerController) GetTrainers(ctx *gin.Context) {
    trainers, err := c.service.GetTrainers()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categories"})
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