package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type FeesController struct {
	service *services.FeesService
}

func NewFeesController() *FeesController {
	return &FeesController{service: services.NewFeesService()}
}

// Summary returns a client packages, payments and what is due (trainer or the linked client).
func (ctrl *FeesController) Summary(c *gin.Context) {
	summary, err := ctrl.service.Summary(principal(c), c.Param("trainee_id"))
	if err != nil {
		respondError(c, err, "fees_failed")
		return
	}
	c.JSON(http.StatusOK, summary)
}

// AddPackage sells a package. 201 when new, 200 when a retry with the same client_id matched.
func (ctrl *FeesController) AddPackage(c *gin.Context) {
	var in models.PackageInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	pkg, created, err := ctrl.service.AddPackage(principal(c), c.Param("trainee_id"), in)
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	c.JSON(createdStatus(created), gin.H{"package": pkg})
}

// AddPayment records a payment. 201 when new, 200 when a retry with the same client_id matched.
func (ctrl *FeesController) AddPayment(c *gin.Context) {
	var in models.PaymentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	pay, created, err := ctrl.service.AddPayment(principal(c), c.Param("trainee_id"), in)
	if err != nil {
		respondError(c, err, "create_failed")
		return
	}
	c.JSON(createdStatus(created), gin.H{"payment": pay})
}

func (ctrl *FeesController) DeletePackage(c *gin.Context) {
	if err := ctrl.service.DeletePackage(principal(c), c.Param("package_id")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (ctrl *FeesController) DeletePayment(c *gin.Context) {
	if err := ctrl.service.DeletePayment(principal(c), c.Param("payment_id")); err != nil {
		respondError(c, err, "delete_failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func createdStatus(created bool) int {
	if created {
		return http.StatusCreated
	}
	return http.StatusOK
}
