package controllers

import (
	// "fmt"
	"ironcoach/services"
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
    file, err := c.FormFile("image")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
        return
    }
    // fmt.Println("image cntrlr: ", file )

    // Call the service to handle file upload
    imageURL, err := ctrl.service.UploadImage(file)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload image"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"image_url": imageURL})
}
