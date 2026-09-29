package controllers

import (
	"ironcoach/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type NutritionController struct {
	service *services.NutritionService
}

func NewNutritionController() *NutritionController {
	return &NutritionController{service: services.NewNutritionService()}
}

func (ctrl *NutritionController) Search(c *gin.Context) {
	q := c.Query("q")
	pageSize := 10
	if v := c.Query("pageSize"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			pageSize = n
		}
	}
	foods, err := ctrl.service.SearchFoods(q, pageSize)
	if err != nil {
		status := http.StatusBadGateway
		if err.Error() == "query is required" {
			status = http.StatusUnprocessableEntity
		}
		c.JSON(status, gin.H{"error": gin.H{"code": "nutrition_search_failed", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"foods": foods})
}
