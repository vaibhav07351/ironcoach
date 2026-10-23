package services

import (
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

const dateLayout = "2006-01-02"

// validateDate requires a calendar date in YYYY-MM-DD form.
func validateDate(field, value string) error {
	if _, err := time.Parse(dateLayout, value); err != nil {
		return ErrValidation(fmt.Sprintf("%s must be a date in YYYY-MM-DD format", field))
	}
	return nil
}

// validateNumber requires a finite number within [min, max].
func validateNumber(field string, v, min, max float64) error {
	if math.IsNaN(v) || math.IsInf(v, 0) || v < min || v > max {
		return ErrValidation(fmt.Sprintf("%s must be between %g and %g", field, min, max))
	}
	return nil
}

// validateText enforces a maximum length (in characters) and, when required, a non-blank value.
func validateText(field, v string, required bool, maxLen int) error {
	if required && strings.TrimSpace(v) == "" {
		return ErrValidation(field + " is required")
	}
	if utf8.RuneCountInString(v) > maxLen {
		return ErrValidation(fmt.Sprintf("%s must be at most %d characters", field, maxLen))
	}
	return nil
}

// validateClientID checks an optional idempotency key sent by the app for offline retries.
func validateClientID(v string) error {
	if v == "" {
		return nil
	}
	if len(v) < 8 || len(v) > 64 {
		return ErrValidation("client_id must be 8 to 64 characters")
	}
	for _, r := range v {
		if !(r == '-' || r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')) {
			return ErrValidation("client_id may only contain letters, digits, '-' and '_'")
		}
	}
	return nil
}

// Pagination bounds a list request.
type Pagination struct {
	Limit  int
	Offset int
}

// NewPagination clamps limit to [1, max] (default def) and offset to >= 0.
func NewPagination(limit, offset, def, max int) Pagination {
	if limit <= 0 {
		limit = def
	}
	if limit > max {
		limit = max
	}
	if offset < 0 {
		offset = 0
	}
	return Pagination{Limit: limit, Offset: offset}
}
