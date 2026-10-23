package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type TraineeService struct {
	repository      *repositories.TraineeRepository
	categoryService *CategoryService
	access          *AccessService
	cleaner         *dataCleaner
}

func NewTraineeService() *TraineeService {
	return &TraineeService{
		repository:      repositories.NewTraineeRepository(),
		categoryService: NewCategoryService(),
		access:          NewAccessService(),
		cleaner:         newDataCleaner(),
	}
}

// AddTrainee creates a client record owned by the calling trainer. trainer_id always comes from
// the caller, never from the request body.
func (s *TraineeService) AddTrainee(p Principal, in models.TraineeInput) (string, error) {
	if !p.IsTrainer() || p.TrainerKey == "" {
		return "", ErrForbidden("only trainers can add clients")
	}
	if in.Name == nil || strings.TrimSpace(*in.Name) == "" {
		return "", ErrValidation("name is required")
	}
	set, err := traineeFieldsFromInput(in, true)
	if err != nil {
		return "", err
	}

	now := time.Now().UTC()
	trainee := models.Trainee{TrainerID: p.TrainerKey, ActiveStatus: true, CreatedAt: now, UpdatedAt: now}
	applyTraineeFields(&trainee, set)

	id, err := s.repository.CreateTrainee(trainee)
	if err != nil {
		return "", err
	}
	if err := s.categoryService.SeedDefaultCatalog(id); err != nil {
		// The client exists; the catalog is re-seeded on first catalog load if this failed.
		slog.Warn("seed default catalog failed", "trainee_id", id, "err", err)
	}
	return id, nil
}

// GetTraineesByTrainer lists the trainer's clients by name. status: "", "true" or "false".
func (s *TraineeService) GetTraineesByTrainer(p Principal, status string, page Pagination) ([]models.Trainee, error) {
	var active *bool
	switch status {
	case "":
	case "true", "false":
		v := status == "true"
		active = &v
	default:
		return nil, ErrValidation("active_status must be true or false")
	}
	return s.repository.GetTraineesByTrainer(p.TrainerKey, active, page.Limit, page.Offset)
}

// GetTrainee returns a client record. The trainer's private notes are hidden from the client.
func (s *TraineeService) GetTrainee(p Principal, traineeID string) (models.Trainee, error) {
	trainee, err := s.access.AuthorizeTrainee(p, traineeID)
	if err != nil {
		return models.Trainee{}, err
	}
	if p.IsClient() {
		trainee.Notes = ""
	}
	return trainee, nil
}

// UpdateTrainee applies the provided fields. Clients may edit their own profile and health
// questionnaire; coaching fields (notes, status, membership, assessments) are trainer-only.
func (s *TraineeService) UpdateTrainee(p Principal, traineeID string, in models.TraineeInput) error {
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return err
	}
	set, err := traineeFieldsFromInput(in, p.IsTrainer())
	if err != nil {
		return err
	}
	if len(set) == 0 {
		return ErrValidation("nothing to update")
	}
	found, err := s.repository.UpdateFields(traineeID, set)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("client")
	}
	return nil
}

// DeleteTrainee removes a client record and all its data, and unlinks the client's account.
func (s *TraineeService) DeleteTrainee(p Principal, traineeID string) error {
	if !p.IsTrainer() {
		return ErrForbidden("only the trainer can delete a client")
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return err
	}
	return s.cleaner.deleteTrainees([]string{traineeID})
}

// trainerOnlyFields lists fields a client cannot change on their own record.
var trainerOnlyFields = map[string]bool{
	"notes": true, "active_status": true, "membership_type": true, "start_date": true,
	"fitness_tests": true, "lab_tests": true,
}

// traineeFieldsFromInput validates the provided fields and returns them as a $set document.
// When the caller is not a trainer, trainer-only fields are dropped (the app may send the whole
// record back; those values are simply never written).
func traineeFieldsFromInput(in models.TraineeInput, isTrainer bool) (bson.M, error) {
	set := bson.M{}
	texts := []struct {
		field    string
		v        *string
		required bool
		max      int
	}{
		{"name", in.Name, true, 80},
		{"phone_number", in.PhoneNumber, false, 20},
		{"email", in.Email, false, 254},
		{"dob", in.DOB, false, 20},
		{"gender", in.Gender, false, 20},
		{"profession", in.Profession, false, 80},
		{"start_date", in.StartDate, false, 20},
		{"membership_type", in.MembershipType, false, 60},
		{"emergency_contact", in.EmergencyContact, false, 120},
		{"medical_history", in.MedicalHistory, false, 2000},
		{"social_handle", in.SocialHandle, false, 80},
		{"goals", in.Goals, false, 1000},
		{"notes", in.Notes, false, 4000},
		{"active_supplements", in.ActiveSupplements, false, 1000},
	}
	for _, t := range texts {
		if t.v == nil {
			continue
		}
		v := strings.TrimSpace(*t.v)
		if err := validateText(t.field, v, t.required, t.max); err != nil {
			return nil, err
		}
		set[t.field] = v
	}
	if in.Height != nil {
		if err := validateNumber("height", *in.Height, 0, 300); err != nil {
			return nil, err
		}
		set["height"] = *in.Height
	}
	if in.ActiveStatus != nil {
		set["active_status"] = *in.ActiveStatus
	}
	if in.ImageURL != nil {
		v := strings.TrimSpace(*in.ImageURL)
		if v != "" {
			u, err := url.Parse(v)
			if err != nil || u.Scheme != "https" || u.Host == "" || len(v) > 500 {
				return nil, ErrValidation("image_url must be an https link")
			}
		}
		set["image_url"] = v
	}
	if in.FitnessTests != nil {
		if err := validateAssessments(len(*in.FitnessTests), func(i int) []string {
			t := (*in.FitnessTests)[i]
			return []string{t.Date, t.Category, t.Test, t.Result1, t.Result2}
		}); err != nil {
			return nil, err
		}
		set["fitness_tests"] = *in.FitnessTests
	}
	if in.LabTests != nil {
		if err := validateAssessments(len(*in.LabTests), func(i int) []string {
			t := (*in.LabTests)[i]
			return []string{t.Date, t.Category, t.Test, t.Value}
		}); err != nil {
			return nil, err
		}
		set["lab_tests"] = *in.LabTests
	}
	if in.HealthQuestionnaire != nil {
		q := in.HealthQuestionnaire
		if len(q.Responses) > 100 {
			return nil, ErrValidation("health questionnaire has too many answers")
		}
		for k := range q.Responses {
			if err := validateText("health questionnaire question", k, true, 200); err != nil {
				return nil, err
			}
		}
		if err := validateText("health questionnaire comments", q.Comments, false, 2000); err != nil {
			return nil, err
		}
		set["health_questionnaire"] = q
	}

	if !isTrainer {
		for field := range set {
			if trainerOnlyFields[field] {
				delete(set, field)
			}
		}
	}
	return set, nil
}

func validateAssessments(n int, fields func(i int) []string) error {
	if n > 500 {
		return ErrValidation("too many assessment entries")
	}
	for i := 0; i < n; i++ {
		for _, f := range fields(i) {
			if err := validateText("assessment value", f, false, 200); err != nil {
				return err
			}
		}
	}
	return nil
}

// applyTraineeFields copies validated create fields onto a new trainee.
func applyTraineeFields(t *models.Trainee, set bson.M) {
	str := func(k string) string { v, _ := set[k].(string); return v }
	t.Name = str("name")
	t.PhoneNumber = str("phone_number")
	t.Email = str("email")
	t.DOB = str("dob")
	t.Gender = str("gender")
	t.Profession = str("profession")
	t.StartDate = str("start_date")
	t.MembershipType = str("membership_type")
	t.EmergencyContact = str("emergency_contact")
	t.MedicalHistory = str("medical_history")
	t.SocialHandle = str("social_handle")
	t.Goals = str("goals")
	t.Notes = str("notes")
	t.ActiveSupplements = str("active_supplements")
	t.ImageURL = str("image_url")
	if v, ok := set["height"].(float64); ok {
		t.Height = v
	}
	if v, ok := set["active_status"].(bool); ok {
		t.ActiveStatus = v
	}
	if v, ok := set["fitness_tests"].([]models.FitnessTest); ok {
		t.FitnessTests = v
	}
	if v, ok := set["lab_tests"].([]models.LabTest); ok {
		t.LabTests = v
	}
	if v, ok := set["health_questionnaire"].(*models.HealthQuestionnaire); ok {
		t.HealthQuestionnaire = v
	}
}
