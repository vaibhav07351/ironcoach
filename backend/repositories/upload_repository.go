package repositories

import (
	"context"
	// "fmt"
	"io"
	"log"
	"os"

	"github.com/cloudinary/cloudinary-go"
	"github.com/cloudinary/cloudinary-go/api/uploader"
)

type ImageRepository struct {
    cloudinary *cloudinary.Cloudinary
}

// Constructor for ImageRepository
func NewImageRepository() *ImageRepository {
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")
	
    cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
    if err != nil {
        log.Fatalf("Failed to initialize Cloudinary: %v", err)
    }

    return &ImageRepository{
        cloudinary: cld,
    }
}

// UploadToCloud handles the interaction with Cloudinary
func (r *ImageRepository) UploadToCloud(file io.Reader) (string, error) {
    // fmt.Println("bfr file here is : ", file)
    resp, err := r.cloudinary.Upload.Upload(context.Background(), file, uploader.UploadParams{})
    // fmt.Println("respnse is : ", resp)
    if err != nil {
        return "", err
    }

    return resp.SecureURL, nil
}
