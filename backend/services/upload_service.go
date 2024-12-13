package services

import (
    "mime/multipart"
    "ironcoach/repositories"
)

type ImageService struct {
    repository *repositories.ImageRepository
}

// Constructor for ImageService
func NewImageService() *ImageService {
    return &ImageService{
        repository: repositories.NewImageRepository(),
    }
}

// UploadImage handles the business logic for uploading images
func (s *ImageService) UploadImage(file *multipart.FileHeader) (string, error) {
    // Open the file
    fileContent, err := file.Open()
    if err != nil {
        return "", err
    }
    defer fileContent.Close()

    // Delegate the actual upload to the repository
    return s.repository.UploadToCloud(fileContent)
}
