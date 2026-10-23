package services

import (
	"ironcoach/models"
	"strconv"
	"strings"
	"time"
)

const (
	// maxAmountPaise caps a single amount at 1 crore rupees, far above any real fee.
	maxAmountPaise    = 1_000_000_000
	maxPackageSession = 500
	maxMonthlyDays    = 400
	maxStartAheadDays = 366
)

// normalizePackageInput validates a package and fills defaults (name, start date) in place.
func normalizePackageInput(in *models.PackageInput, loc *time.Location, now time.Time) error {
	if in.Kind != models.PackageKindSessions && in.Kind != models.PackageKindMonthly {
		return ErrValidation("kind must be sessions or monthly")
	}
	if in.AmountPaise < 1 || in.AmountPaise > maxAmountPaise {
		return ErrValidation("amount must be more than 0 and at most 1 crore rupees")
	}
	in.Name = strings.TrimSpace(in.Name)
	if err := validateText("name", in.Name, false, 80); err != nil {
		return err
	}
	if err := validateClientID(in.ClientID); err != nil {
		return err
	}

	today := localDate(now, loc)
	if in.StartDate == "" {
		in.StartDate = today
	}
	if err := validateDate("start_date", in.StartDate); err != nil {
		return err
	}
	if in.StartDate > localDate(now.AddDate(0, 0, maxStartAheadDays), loc) {
		return ErrValidation("start_date is too far in the future")
	}

	switch in.Kind {
	case models.PackageKindSessions:
		if in.Sessions < 1 || in.Sessions > maxPackageSession {
			return ErrValidation("sessions must be between 1 and 500")
		}
		if in.EndDate != "" {
			return ErrValidation("end_date applies to monthly packages only")
		}
	case models.PackageKindMonthly:
		if in.Sessions != 0 {
			return ErrValidation("sessions applies to session packages only")
		}
		if err := validateDate("end_date", in.EndDate); err != nil {
			return err
		}
		start, _ := time.Parse(dateLayout, in.StartDate)
		end, _ := time.Parse(dateLayout, in.EndDate)
		if end.Before(start) {
			return ErrValidation("end_date cannot be before start_date")
		}
		if end.Sub(start) > maxMonthlyDays*24*time.Hour {
			return ErrValidation("a monthly package can last at most 400 days")
		}
	}
	if in.Name == "" {
		in.Name = defaultPackageName(*in)
	}
	return nil
}

func defaultPackageName(in models.PackageInput) string {
	if in.Kind == models.PackageKindMonthly {
		return "Monthly"
	}
	if in.Sessions == 1 {
		return "1 session"
	}
	return strconv.Itoa(in.Sessions) + " sessions"
}

// normalizePaymentInput validates a payment and fills the default date in place.
func normalizePaymentInput(in *models.PaymentInput, loc *time.Location, now time.Time) error {
	if in.AmountPaise < 1 || in.AmountPaise > maxAmountPaise {
		return ErrValidation("amount must be more than 0 and at most 1 crore rupees")
	}
	in.Note = strings.TrimSpace(in.Note)
	if err := validateText("note", in.Note, false, 200); err != nil {
		return err
	}
	if err := validateClientID(in.ClientID); err != nil {
		return err
	}
	if in.Date == "" {
		in.Date = localDate(now, loc)
	}
	if err := validateDate("date", in.Date); err != nil {
		return err
	}
	return validateNotFuture("date", in.Date, loc, now)
}
