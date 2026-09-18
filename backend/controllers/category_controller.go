package controllers

import (
	"ironcoach/middlewares"
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CategoryController struct {
	service *services.CategoryService
}

func NewCategoryController() *CategoryController {
	return &CategoryController{
		service: services.NewCategoryService(),
	}
}

func (c *CategoryController) AddCategory(ctx *gin.Context) {
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

	category := models.Category{Name: body.Name, TraineeID: body.TraineeID}
	if err := c.service.AddCategory(category); err != nil {
		if err.Error() == "category already exists for this trainee" {
			ctx.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "conflict", "message": err.Error()}})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "create_failed", "message": "Failed to add category"}})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Category added successfully"})
}

func (c *CategoryController) GetCategories(ctx *gin.Context) {
	traineeID := ctx.Query("trainee_id")
	if traineeID == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"code": "validation_error", "message": "trainee_id query param is required"}})
		return
	}
	if msg := middlewares.AuthorizeTraineeAccess(ctx, traineeID); msg != "" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": msg}})
		return
	}

	categories, err := c.service.GetCategories(traineeID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "list_failed", "message": "Failed to retrieve categories"}})
		return
	}

	ctx.JSON(http.StatusOK, categories)
}

func (c *CategoryController) UpdateCategory(ctx *gin.Context) {
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

	if err := c.service.UpdateCategory(id, body.Name, body.TraineeID); err != nil {
		switch err.Error() {
		case "category already exists for this trainee":
			ctx.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "conflict", "message": "Category name already exists"}})
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		case "category not found":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "category not found"}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "update_failed", "message": "Failed to update category"}})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Category updated successfully"})
}

func (c *CategoryController) DeleteCategory(ctx *gin.Context) {
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

	if err := c.service.DeleteCategory(id, traineeID); err != nil {
		switch err.Error() {
		case "forbidden":
			ctx.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "forbidden", "message": "forbidden"}})
		case "category not found":
			ctx.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "not_found", "message": "category not found"}})
		default:
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "delete_failed", "message": "Failed to delete category"}})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}
