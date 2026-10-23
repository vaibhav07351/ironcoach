package services

import (
	"ironcoach/repositories"
	"time"
)

// AttendanceService records which days a client turned up for a session.
type AttendanceService struct {
	attendance *repositories.AttendanceRepository
	access     *AccessService
}

func NewAttendanceService() *AttendanceService {
	return &AttendanceService{
		attendance: repositories.NewAttendanceRepository(),
		access:     NewAccessService(),
	}
}

// Mark records that the client attended on date. Marking the same day twice is harmless
// (created=false the second time).
func (s *AttendanceService) Mark(p Principal, traineeID, date string) (created bool, err error) {
	if !p.IsTrainer() {
		return false, ErrForbidden("only the trainer can mark attendance")
	}
	if err := validateDate("date", date); err != nil {
		return false, err
	}
	if err := validateNotFuture("date", date, p.Location(), time.Now()); err != nil {
		return false, err
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return false, err
	}
	return s.attendance.Mark(traineeID, date)
}

// Unmark removes attendance for a day (idempotent).
func (s *AttendanceService) Unmark(p Principal, traineeID, date string) error {
	if !p.IsTrainer() {
		return ErrForbidden("only the trainer can mark attendance")
	}
	if err := validateDate("date", date); err != nil {
		return err
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return err
	}
	return s.attendance.Unmark(traineeID, date)
}

// List returns attended dates in [from, to], newest first. The owning trainer and the linked
// client may read it.
func (s *AttendanceService) List(p Principal, traineeID, from, to string, page Pagination) ([]string, error) {
	for field, v := range map[string]string{"from": from, "to": to} {
		if v != "" {
			if err := validateDate(field, v); err != nil {
				return nil, err
			}
		}
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return nil, err
	}
	return s.attendance.ListDates(traineeID, from, to, page.Limit)
}
