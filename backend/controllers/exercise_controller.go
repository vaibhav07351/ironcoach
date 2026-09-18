package controllers

import (
	"ironcoach/middlewares"
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExerciseController struct {
	service *services.ExerciseService
}

func NewExerciseController() *ExerciseController {
	return &ExerciseController{
		service: services.NewExerciseService(),
	}
}

func (c *ExerciseController) AddExercise(ctx *gin.Context) {
	var body struct {
		Name       string `json:"name" binding:"required"`
		Category   string `json:"category"`
		CategoryID string `json:"category_id" binding:"required"`
		TraineeID  string `json:"trainee_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	if msg := middlewares.AuthorizeTraineeAccess(ctx, body.TraineeID); msg != "" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": msg}})
		return
	}

	categoryOID, err := primitive.ObjectIDFromHex(body.CategoryID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": "invalid category_id"}})
		return
	}

	exercise := models.Exercise{
		Name:       body.Name,
		Category:   body.Category,
		CategoryID: categoryOID,
	}

	if err := c.service.AddExercise(exercise, body.TraineeID); err != nil {
		switch err.Error() {
		case "category does not exist":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "Category does not exist"}})
		case "exercise already exists in this category":
			ctx.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "conflict", "message": "Exercise already exists in this category"}})
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "create_failed", "message": err.Error()}})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise added successfully"})
}

func (c *ExerciseController) GetExercisesByCategory(ctx *gin.Context) {
	categoryID := ctx.Param("category_id")
	traineeID := ctx.Query("trainee_id")
	if traineeID == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "validation_error", "message": "trainee_id query param is required"}})
		return
	}
	if msg := middlewares.AuthorizeTraineeAccess(ctx, traineeID); msg != "" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": msg}})
		return
	}

	exercises, err := c.service.GetExercisesByCategoryID(categoryID, traineeID)
	if err != nil {
		switch err.Error() {
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		case "category does not exist":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "category not found"}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "list_failed", "message": "Failed to retrieve exercises"}})
		}
		return
	}

	ctx.JSON(http.StatusOK, exercises)
}

func (c *ExerciseController) UpdateExercise(ctx *gin.Context) {
	id := ctx.Param("id")
	var body struct {
		Name      string `json:"name" binding:"required"`
		TraineeID string `json:"trainee_id" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}
	if msg := middlewares.AuthorizeTraineeAccess(ctx, body.TraineeID); msg != "" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": msg}})
		return
	}

	if err := c.service.UpdateExercise(id, body.Name, body.TraineeID); err != nil {
		switch err.Error() {
		case "exercise already exists in this category":
			ctx.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "conflict", "message": "Exercise name already exists in this category"}})
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		case "exercise not found", "category does not exist":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": err.Error()}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "update_failed", "message": "Failed to update exercise"}})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise updated successfully"})
}

func (c *ExerciseController) DeleteExercise(ctx *gin.Context) {
	id := ctx.Param("id")
	traineeID := ctx.Query("trainee_id")
	if traineeID == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "validation_error", "message": "trainee_id query param is required"}})
		return
	}
	if msg := middlewares.AuthorizeTraineeAccess(ctx, traineeID); msg != "" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": msg}})
		return
	}

	if err := c.service.DeleteExercise(id, traineeID); err != nil {
		switch err.Error() {
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		case "exercise not found", "category does not exist":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": err.Error()}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "delete_failed", "message": "Failed to delete exercise"}})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Exercise deleted successfully"})
}
