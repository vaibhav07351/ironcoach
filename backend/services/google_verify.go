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

var googleHTTPClient = &http.Client{Timeout: 10 * time.Second}

// allowedGoogleAudiences reads the OAuth client ids allowed as token audience. Each variable may
// hold one id or a comma-separated list.
func allowedGoogleAudiences() []string {
	var ids []string
	for _, key := range []string{
		"GOOGLE_CLIENT_ID",
		"GOOGLE_ANDROID_CLIENT_ID",
		"GOOGLE_IOS_CLIENT_ID",
		"GOOGLE_EXPO_CLIENT_ID",
	} {
		for _, v := range strings.Split(os.Getenv(key), ",") {
			if v = strings.TrimSpace(v); v != "" {
				ids = append(ids, v)
			}
		}
	}
	return ids
}

func errGoogleToken(msg string) error {
	return ErrUnauthorized("google_token_invalid", msg)
}

// VerifyGoogleIDToken validates an ID token with Google (8s timeout). Invalid tokens return a
// typed unauthorized error; network or configuration problems return plain errors (server side).
func VerifyGoogleIDToken(idToken string) (*GoogleTokenInfo, error) {
	if strings.TrimSpace(idToken) == "" {
		return nil, errGoogleToken("id_token is required")
	}
	allowed := allowedGoogleAudiences()
	if len(allowed) == 0 {
		return nil, errors.New("GOOGLE_CLIENT_ID is not configured")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}

	resp, err := googleHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google token verify failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}

	switch {
	case resp.StatusCode == http.StatusOK:
	case resp.StatusCode >= 500:
		return nil, fmt.Errorf("google tokeninfo returned %d", resp.StatusCode)
	default:
		return nil, errGoogleToken("invalid Google sign-in, please try again")
	}

	var info GoogleTokenInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}

	if info.Sub == "" || info.Email == "" {
		return nil, errGoogleToken("Google account is missing an email")
	}
	if info.Iss != "accounts.google.com" && info.Iss != "https://accounts.google.com" {
		return nil, errGoogleToken("token was not issued by Google")
	}
	if info.EmailVerified != "true" && info.EmailVerified != "1" {
		return nil, errGoogleToken("Google email is not verified")
	}

	for _, a := range allowed {
		if info.Aud == a {
			return &info, nil
		}
	}
	return nil, errGoogleToken("this app build is not allowed to sign in")
}
