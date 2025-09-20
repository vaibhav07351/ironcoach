package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ExerciseController struct {
	service *services.ExerciseService
}

// Constructor for ExerciseController
func NewExerciseController() *ExerciseController {
	return &ExerciseController{
		service: services.NewExerciseService(),
	}
}

func (c *ExerciseController) AddExercise(ctx *gin.Context) {
	var exercise models.Exercise
	if err := ctx.ShouldBindJSON(&exercise); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.service.AddExercise(exercise); err != nil {
		if err.Error() == "category does not exist" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Category does not exist"})
			return
		}
		if err.Error() == "exercise already exists in this category" {
			ctx.JSON(http.StatusConflict, gin.H{"error": "Exercise already exists in this category"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise added successfully"})
}

func (c *ExerciseController) GetExercisesByCategory(ctx *gin.Context) {
	category := ctx.Param("category")
	exercises, err := c.service.GetExercisesByCategory(category)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve exercises"})
		return
	}

	ctx.JSON(http.StatusOK, exercises)
}

func (c *ExerciseController) UpdateExercise(ctx *gin.Context) {
	id := ctx.Param("id")
	var body struct {
		Name string `json:"name" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.service.UpdateExercise(id, body.Name); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update exercise"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise updated successfully"})
}

func (c *ExerciseController) DeleteExercise(ctx *gin.Context) {
	id := ctx.Param("id")
	if err := c.service.DeleteExercise(id); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exercise"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise deleted successfully"})
}
