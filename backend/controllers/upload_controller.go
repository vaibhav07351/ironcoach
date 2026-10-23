package controllers

import (
	"errors"
	"ironcoach/services"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ImageController struct {
	service *services.ImageService
}

// Constructor for ImageController
func NewImageController() *ImageController {
	return &ImageController{
		service: services.NewImageService(),
	}
}

// UploadImage handles the image upload HTTP request
func (ctrl *ImageController) UploadImage(c *gin.Context) {
	// Cap the whole request body slightly above the file limit so oversized uploads are rejected
	// while streaming instead of being buffered.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, services.MaxImageBytes+64*1024)

	file, err := c.FormFile("image")
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": gin.H{"code": "file_too_large", "message": "image must be 5 MB or smaller"}})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "file_required", "message": "image file is required"}})
		return
	}

	imageURL, err := ctrl.service.UploadImage(c.Request.Context(), file)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrImageTooLarge):
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": gin.H{"code": "file_too_large", "message": "image must be 5 MB or smaller"}})
		case errors.Is(err, services.ErrImageType):
			c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": gin.H{"code": "unsupported_type", "message": "only JPEG, PNG or WebP images are allowed"}})
		default:
			log.Printf("level=error route=/images/upload user_id=%v msg=%q err=%v", c.GetString("user_id"), "image upload failed", err)
			c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"code": "upload_failed", "message": "failed to upload image"}})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"image_url": imageURL})
}
