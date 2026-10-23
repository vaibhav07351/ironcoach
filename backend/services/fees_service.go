package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

const (
	// feeSummaryPayments is how many recent payments a fee summary lists. Totals always cover
	// every payment (they come from an aggregation, not from this list).
	feeSummaryPayments = 50
	// attendanceWindow bounds the attended days read to work out session usage.
	attendanceWindow = 2000
)

// FeesService records packages and payments and works out what each client owes. It records
// only: no money moves through the app.
type FeesService struct {
	packages   *repositories.PackageRepository
	payments   *repositories.PaymentRepository
	attendance *repositories.AttendanceRepository
	access     *AccessService
}

func NewFeesService() *FeesService {
	return &FeesService{
		packages:   repositories.NewPackageRepository(),
		payments:   repositories.NewPaymentRepository(),
		attendance: repositories.NewAttendanceRepository(),
		access:     NewAccessService(),
	}
}

// AddPackage sells a package to one of the trainer's clients. With a client_id, a repeat of the
// same request returns the original (created=false) instead of selling it twice.
func (s *FeesService) AddPackage(p Principal, traineeID string, in models.PackageInput) (models.Package, bool, error) {
	if !p.IsTrainer() {
		return models.Package{}, false, ErrForbidden("only the trainer can manage fees")
	}
	now := time.Now()
	if err := normalizePackageInput(&in, p.Location(), now); err != nil {
		return models.Package{}, false, err
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return models.Package{}, false, err
	}
	return s.packages.Create(models.Package{
		TraineeID:   traineeID,
		Kind:        in.Kind,
		Name:        in.Name,
		AmountPaise: in.AmountPaise,
		Sessions:    in.Sessions,
		StartDate:   in.StartDate,
		EndDate:     in.EndDate,
		ClientID:    in.ClientID,
		CreatedAt:   now.UTC(),
	})
}

// AddPayment records a payment from one of the trainer's clients (idempotent with client_id).
func (s *FeesService) AddPayment(p Principal, traineeID string, in models.PaymentInput) (models.Payment, bool, error) {
	if !p.IsTrainer() {
		return models.Payment{}, false, ErrForbidden("only the trainer can manage fees")
	}
	now := time.Now()
	if err := normalizePaymentInput(&in, p.Location(), now); err != nil {
		return models.Payment{}, false, err
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return models.Payment{}, false, err
	}
	return s.payments.Create(models.Payment{
		TraineeID:   traineeID,
		AmountPaise: in.AmountPaise,
		Date:        in.Date,
		Note:        in.Note,
		ClientID:    in.ClientID,
		CreatedAt:   now.UTC(),
	})
}

// Summary returns one client's packages (with usage), recent payments and money position. The
// owning trainer and the linked client may read it.
func (s *FeesService) Summary(p Principal, traineeID string) (models.FeeSummary, error) {
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return models.FeeSummary{}, err
	}
	pkgs, err := s.packages.ListByTrainee(traineeID)
	if err != nil {
		return models.FeeSummary{}, err
	}
	payments, err := s.payments.ListByTrainee(traineeID, feeSummaryPayments, 0)
	if err != nil {
		return models.FeeSummary{}, err
	}
	totals, err := s.packages.TotalsByTrainees([]string{traineeID})
	if err != nil {
		return models.FeeSummary{}, err
	}
	paid, err := s.payments.TotalsByTrainees([]string{traineeID})
	if err != nil {
		return models.FeeSummary{}, err
	}

	var attended []string
	if len(pkgs) > 0 {
		// Packages are sorted by start date, so the first one bounds how far back to read.
		attended, err = s.attendance.ListDates(traineeID, pkgs[0].StartDate, "", attendanceWindow)
		if err != nil {
			return models.FeeSummary{}, err
		}
	}

	due, credit := money(totals[traineeID], paid[traineeID])
	return models.FeeSummary{
		TraineeID:   traineeID,
		TotalPaise:  totals[traineeID],
		PaidPaise:   paid[traineeID],
		DuePaise:    due,
		CreditPaise: credit,
		Packages:    buildPackageViews(pkgs, attended, localDate(time.Now(), p.Location())),
		Payments:    payments,
	}, nil
}

// DeletePackage removes a package the trainer sold (for example one entered by mistake).
func (s *FeesService) DeletePackage(p Principal, packageID string) error {
	if !p.IsTrainer() {
		return ErrForbidden("only the trainer can manage fees")
	}
	pkg, err := s.packages.FindByID(packageID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrNotFound("package")
		}
		return err
	}
	if _, err := s.access.AuthorizeTrainee(p, pkg.TraineeID); err != nil {
		return err
	}
	found, err := s.packages.Delete(packageID)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("package")
	}
	return nil
}

// DeletePayment removes a recorded payment.
func (s *FeesService) DeletePayment(p Principal, paymentID string) error {
	if !p.IsTrainer() {
		return ErrForbidden("only the trainer can manage fees")
	}
	pay, err := s.payments.FindByID(paymentID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrNotFound("payment")
		}
		return err
	}
	if _, err := s.access.AuthorizeTrainee(p, pay.TraineeID); err != nil {
		return err
	}
	found, err := s.payments.Delete(paymentID)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("payment")
	}
	return nil
}

// duesFor returns the amount owed per trainee (only those who owe) using two aggregations for
// the whole group, however many trainees there are.
func (s *FeesService) duesFor(traineeIDs []string) (map[string]int64, error) {
	totals, err := s.packages.TotalsByTrainees(traineeIDs)
	if err != nil {
		return nil, err
	}
	paid, err := s.payments.TotalsByTrainees(traineeIDs)
	if err != nil {
		return nil, err
	}
	dues := make(map[string]int64)
	for id, total := range totals {
		if due, _ := money(total, paid[id]); due > 0 {
			dues[id] = due
		}
	}
	return dues, nil
}
