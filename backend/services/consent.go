package services

import (
	"ironcoach/repositories"
	"time"
)

// errConsentRequired is returned when a client tries to link with a coach without agreeing to
// share their logs (workouts, meals, weight) with that coach.
func errConsentRequired() error {
	return &Error{Kind: KindValidation, Code: "consent_required", Message: "agree to share your logs with your coach to continue"}
}

// recordShareConsent stores when the client agreed to share their logs with a coach.
func recordShareConsent(users *repositories.UserRepository, userID string) error {
	return users.Update(userID, map[string]interface{}{"share_consent_at": time.Now().UTC()})
}
