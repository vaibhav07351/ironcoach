package controllers

import (
    "ironcoach/models"
    "ironcoach/services"
    "net/http"

    "github.com/gin-gonic/gin"
)

type CategoryController struct {
    service *services.CategoryService
}

// Constructor for TraineeController
func NewCategoryController() *CategoryController {
    return &CategoryController{
        service: services.NewCategoryService(),
    }
}


func (c *CategoryController) AddCategory(ctx *gin.Context) {
    var category models.Category
    if err := ctx.ShouldBindJSON(&category); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := c.service.AddCategory(category); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add category"})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"message": "Category added successfully"})
}

func (c *CategoryController) GetCategories(ctx *gin.Context) {
    categories, err := c.service.GetCategories()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categories"})
        return
    }

    ctx.JSON(http.StatusOK, categories)
}

func (c *CategoryController) UpdateCategory(ctx *gin.Context) {
    id := ctx.Param("id")
    var body struct {
        Name string `json:"name" binding:"required"`
    }
    if err := ctx.ShouldBindJSON(&body); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := c.service.UpdateCategory(id, body.Name); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"message": "Category updated successfully"})
}

func (c *CategoryController) DeleteCategory(ctx *gin.Context) {
    id := ctx.Param("id")
    if err := c.service.DeleteCategory(id); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}
