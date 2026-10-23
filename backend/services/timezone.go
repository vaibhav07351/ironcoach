package services

import (
	"sync"
	"time"
)

// DefaultTimezone is used for users who have not reported one (the launch market is India).
const DefaultTimezone = "Asia/Kolkata"

var locationCache sync.Map // name -> *time.Location

// loadLocation returns the named IANA location, falling back to DefaultTimezone (and to UTC if
// even that is unavailable). Lookups are cached.
func loadLocation(name string) *time.Location {
	if name == "" {
		name = DefaultTimezone
	}
	if loc, ok := locationCache.Load(name); ok {
		return loc.(*time.Location)
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		if name != DefaultTimezone {
			return loadLocation(DefaultTimezone)
		}
		return time.UTC
	}
	locationCache.Store(name, loc)
	return loc
}

// validTimezone reports whether name is a loadable IANA zone (e.g. "Asia/Kolkata").
func validTimezone(name string) bool {
	if name == "" || len(name) > 64 || name == "Local" {
		return false
	}
	_, err := time.LoadLocation(name)
	return err == nil
}

// localDate formats t as a calendar date (YYYY-MM-DD) in loc.
func localDate(t time.Time, loc *time.Location) string {
	return t.In(loc).Format(dateLayout)
}

// validateNotFuture rejects dates more than one day after "today" in loc. The one-day slack
// covers devices whose clock or zone is slightly ahead.
func validateNotFuture(field, date string, loc *time.Location, now time.Time) error {
	limit := localDate(now.AddDate(0, 0, 1), loc)
	if date > limit {
		return ErrValidation(field + " cannot be in the future")
	}
	return nil
}
