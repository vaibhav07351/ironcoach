package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// GoogleTokenInfo is the response from Google's tokeninfo endpoint.
type GoogleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`
	Iss           string `json:"iss"`
	Exp           string `json:"exp"`
}

func allowedGoogleAudiences() []string {
	var ids []string
	for _, key := range []string{
		"GOOGLE_CLIENT_ID",
		"GOOGLE_ANDROID_CLIENT_ID",
		"GOOGLE_IOS_CLIENT_ID",
		"GOOGLE_EXPO_CLIENT_ID",
	} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			ids = append(ids, v)
		}
	}
	return ids
}

// VerifyGoogleIDToken validates an ID token with Google (timeout 8s).
func VerifyGoogleIDToken(idToken string) (*GoogleTokenInfo, error) {
	if strings.TrimSpace(idToken) == "" {
		return nil, errors.New("id_token is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google token verify failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("invalid google id_token")
	}

	var info GoogleTokenInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}

	if info.Sub == "" || info.Email == "" {
		return nil, errors.New("google token missing sub or email")
	}

	if info.EmailVerified != "true" && info.EmailVerified != "1" {
		return nil, errors.New("google email not verified")
	}

	allowed := allowedGoogleAudiences()
	if len(allowed) == 0 {
		return nil, errors.New("GOOGLE_CLIENT_ID is not configured")
	}

	audOK := false
	for _, a := range allowed {
		if info.Aud == a {
			audOK = true
			break
		}
	}
	if !audOK {
		return nil, errors.New("google token audience mismatch")
	}

	return &info, nil
}
