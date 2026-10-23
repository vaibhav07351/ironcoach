package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
)

// dataCleaner deletes a trainee (client record) and everything that belongs to it. It is shared
// by "trainer deletes a client" and "trainer deletes their account".
type dataCleaner struct {
	trainees    *repositories.TraineeRepository
	workoutLogs *repositories.WorkoutLogRepository
	diets       *repositories.DietEntryRepository
	progress    *repositories.ProgressRepository
	categories  *repositories.CategoryRepository
	exercises   *repositories.ExerciseRepository
	invites     *repositories.InviteRepository
	ratings     *repositories.RatingRepository
	packages    *repositories.PackageRepository
	payments    *repositories.PaymentRepository
	attendance  *repositories.AttendanceRepository
	users       *repositories.UserRepository
	images      *ImageService
}

func newDataCleaner() *dataCleaner {
	return &dataCleaner{
		trainees:    repositories.NewTraineeRepository(),
		workoutLogs: repositories.NewWorkoutLogRepository(),
		diets:       repositories.NewDietEntryRepository(),
		progress:    repositories.NewProgressRepository(),
		categories:  repositories.NewCategoryRepository(),
		exercises:   repositories.NewExerciseRepository(),
		invites:     repositories.NewInviteRepository(),
		ratings:     repositories.NewRatingRepository(),
		packages:    repositories.NewPackageRepository(),
		payments:    repositories.NewPaymentRepository(),
		attendance:  repositories.NewAttendanceRepository(),
		users:       repositories.NewUserRepository(),
		images:      NewImageService(),
	}
}

// deleteTrainees removes the trainees and all their data. Dependent data goes first and the
// trainee documents last, and every step is a idempotent delete, so if a step fails the whole
// call can simply be retried. Linked client accounts are unlinked (not deleted): they keep
// their login and can join another coach.
func (d *dataCleaner) deleteTrainees(ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	imageURLs, err := d.trainees.ImageURLsByIDs(ids)
	if err != nil {
		// Media cleanup is best-effort; never block the data deletion on it.
		slog.Warn("could not list trainee images for cleanup", "err", err)
	}

	if err := d.workoutLogs.DeleteWorkoutLogsByTrainees(ids); err != nil {
		return err
	}
	if err := d.diets.DeleteDietEntriesByTrainees(ids); err != nil {
		return err
	}
	if err := d.progress.DeleteProgressByTrainees(ids); err != nil {
		return err
	}
	categoryIDs, err := d.categories.IDsByTrainees(ids)
	if err != nil {
		return err
	}
	if err := d.exercises.DeleteByCategoryIDs(categoryIDs); err != nil {
		return err
	}
	if err := d.categories.DeleteByTrainees(ids); err != nil {
		return err
	}
	if err := d.packages.DeleteByTrainees(ids); err != nil {
		return err
	}
	if err := d.payments.DeleteByTrainees(ids); err != nil {
		return err
	}
	if err := d.attendance.DeleteByTrainees(ids); err != nil {
		return err
	}
	if err := d.invites.DeleteByTrainees(ids); err != nil {
		return err
	}
	if err := d.ratings.DeleteForTargets(models.RatingToClient, ids); err != nil {
		return err
	}
	if err := d.users.UnlinkByTrainees(ids); err != nil {
		return err
	}
	for _, id := range ids {
		if err := d.trainees.DeleteTrainee(id); err != nil {
			return err
		}
	}

	d.images.DeleteImages(imageURLs)
	return nil
}
