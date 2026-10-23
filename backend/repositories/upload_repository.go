package repositories

import (
	"context"
	"io"
	"log"
	"net/url"
	"os"
	"path"
	"regexp"
	"strings"

	"github.com/cloudinary/cloudinary-go"
	"github.com/cloudinary/cloudinary-go/api/uploader"
)

type ImageRepository struct {
	cloudinary *cloudinary.Cloudinary
	cloudName  string
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
		cloudName:  cloudName,
	}
}

// UploadToCloud uploads an image to Cloudinary. The caller's context bounds the request.
func (r *ImageRepository) UploadToCloud(ctx context.Context, file io.Reader) (string, error) {
	resp, err := r.cloudinary.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder:         "ironcoach",
		ResourceType:   "image",
		Transformation: "c_limit,w_1080,h_1080",
	})
	if err != nil {
		return "", err
	}

	return resp.SecureURL, nil
}

// DestroyByURL deletes an image previously uploaded to this Cloudinary account. URLs from other
// hosts or clouds are ignored (returns false, nil).
func (r *ImageRepository) DestroyByURL(ctx context.Context, imageURL string) (bool, error) {
	publicID, ok := cloudinaryPublicID(imageURL, r.cloudName)
	if !ok {
		return false, nil
	}
	_, err := r.cloudinary.Upload.Destroy(ctx, uploader.DestroyParams{PublicID: publicID, Invalidate: true})
	return err == nil, err
}

var versionSegment = regexp.MustCompile(`^v\d+$`)

// cloudinaryPublicID extracts the public id from a delivery URL such as
// https://res.cloudinary.com/<cloud>/image/upload/c_limit,w_1080/v1712345/ironcoach/abc.jpg
// which yields "ironcoach/abc".
func cloudinaryPublicID(imageURL, cloudName string) (string, bool) {
	u, err := url.Parse(imageURL)
	if err != nil || u.Host != "res.cloudinary.com" || cloudName == "" {
		return "", false
	}
	parts := strings.Split(strings.TrimPrefix(u.Path, "/"), "/")
	// <cloud>/image/upload/...
	if len(parts) < 4 || parts[0] != cloudName || parts[1] != "image" || parts[2] != "upload" {
		return "", false
	}
	rest := parts[3:]
	// Skip transformation segments (contain ',' or start with a "x_" parameter) and the version.
	for len(rest) > 1 && (strings.Contains(rest[0], ",") || isTransformation(rest[0]) || versionSegment.MatchString(rest[0])) {
		rest = rest[1:]
	}
	id := strings.Join(rest, "/")
	id = strings.TrimSuffix(id, path.Ext(id))
	return id, id != ""
}

func isTransformation(seg string) bool {
	return len(seg) > 2 && seg[1] == '_' && seg[0] >= 'a' && seg[0] <= 'z'
}
