package services

import (
	"context"
	"errors"
	"io"
	"ironcoach/repositories"
	"log/slog"
	"mime/multipart"
	"net/http"
	"time"
)

// MaxImageBytes is the largest image accepted for upload.
const MaxImageBytes = 5 << 20

var (
	ErrImageTooLarge = errors.New("image too large")
	ErrImageType     = errors.New("unsupported image type")
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type ImageService struct {
	repository *repositories.ImageRepository
}

// Constructor for ImageService
func NewImageService() *ImageService {
	return &ImageService{
		repository: repositories.NewImageRepository(),
	}
}

// UploadImage validates size and real content type (sniffed from the bytes, not the
// client-supplied header) and uploads the image with a bounded timeout.
func (s *ImageService) UploadImage(ctx context.Context, file *multipart.FileHeader) (string, error) {
	if file.Size > MaxImageBytes {
		return "", ErrImageTooLarge
	}

	f, err := file.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	head := make([]byte, 512)
	n, err := io.ReadFull(f, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return "", err
	}
	if !allowedImageTypes[http.DetectContentType(head[:n])] {
		return "", ErrImageType
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return "", err
	}

	uploadCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	return s.repository.UploadToCloud(uploadCtx, f)
}

// DeleteImages removes uploaded images best-effort: each delete has its own timeout and a
// failure is logged, never returned, so account or client deletion is not blocked by Cloudinary.
func (s *ImageService) DeleteImages(urls []string) {
	for _, u := range urls {
		if u == "" {
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if _, err := s.repository.DestroyByURL(ctx, u); err != nil {
			slog.Warn("image delete failed", "url", u, "err", err)
		}
		cancel()
	}
}
