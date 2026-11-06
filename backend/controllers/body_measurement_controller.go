package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyMeasurementController serves the Body tracker.
type BodyMeasurementController struct {
	service *services.BodyMeasurementService
}

func NewBodyMeasurementController() *BodyMeasurementController {
	return &BodyMeasurementController{service: services.NewBodyMeasurementService()}
}

// Record stores the day's value of a metric (lengths in cm, body fat in %, bodyweight in kg).
func (ctrl *BodyMeasurementController) Record(c *gin.Context) {
	var in models.BodyMeasurementInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	if err := ctrl.service.Record(principal(c), in); err != nil {
		respondError(c, err, "save_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Measurement saved"})
}

// Delete removes one day's value of a body metric.
func (ctrl *BodyMeasurementController) Delete(c *gin.Context) {
	if err := ctrl.service.Delete(principal(c), c.Param("trainee_id"), c.Param("metric"), c.Param("date")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Measurement deleted"})
}

// Summary lists every metric with its latest and previous value.
func (ctrl *BodyMeasurementController) Summary(c *gin.Context) {
	summary, err := ctrl.service.Summary(c.Param("trainee_id"))
	if err != nil {
		respondError(c, err, "summary_failed")
		return
	}
	c.JSON(http.StatusOK, summary)
}

// Series returns one metric's values. Query: metric (required), range (1m, 3m, 6m, 1y, all).
func (ctrl *BodyMeasurementController) Series(c *gin.Context) {
	series, err := ctrl.service.Series(principal(c), c.Param("trainee_id"), c.Query("metric"), c.Query("range"))
	if err != nil {
		respondError(c, err, "series_failed")
		return
	}
	c.JSON(http.StatusOK, series)
}
