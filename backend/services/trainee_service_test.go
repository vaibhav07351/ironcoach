package services

import (
	"testing"

	"ironcoach/models"
)

func strp(s string) *string { return &s }

func TestTraineeFieldsClientCannotChangeCoachFields(t *testing.T) {
	active := false
	in := models.TraineeInput{
		Goals:          strp("Run 10k"),
		Notes:          strp("trainer private note"),
		ActiveStatus:   &active,
		MembershipType: strp("vip"),
		FitnessTests:   &[]models.FitnessTest{{Date: "2026-10-01", Test: "Plank"}},
	}

	set, err := traineeFieldsFromInput(in, false)
	if err != nil {
		t.Fatal(err)
	}
	if set["goals"] != "Run 10k" {
		t.Fatalf("client should be able to edit goals, got %+v", set)
	}
	for _, f := range []string{"notes", "active_status", "membership_type", "fitness_tests"} {
		if _, ok := set[f]; ok {
			t.Fatalf("client update must not include %s", f)
		}
	}

	set, err = traineeFieldsFromInput(in, true)
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range []string{"notes", "active_status", "membership_type", "fitness_tests"} {
		if _, ok := set[f]; !ok {
			t.Fatalf("trainer update should include %s", f)
		}
	}
}

func TestTraineeFieldsValidation(t *testing.T) {
	long := make([]byte, 81)
	for i := range long {
		long[i] = 'a'
	}
	height := 900.0
	cases := []struct {
		name string
		in   models.TraineeInput
	}{
		{"blank name", models.TraineeInput{Name: strp("   ")}},
		{"name too long", models.TraineeInput{Name: strp(string(long))}},
		{"height out of range", models.TraineeInput{Height: &height}},
		{"non-https image", models.TraineeInput{ImageURL: strp("http://example.com/a.jpg")}},
		{"javascript image", models.TraineeInput{ImageURL: strp("javascript:alert(1)")}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := traineeFieldsFromInput(tc.in, true); !IsKind(err, KindValidation) {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}

	// Clearing the photo is allowed.
	set, err := traineeFieldsFromInput(models.TraineeInput{ImageURL: strp("")}, true)
	if err != nil || set["image_url"] != "" {
		t.Fatalf("clearing image should be allowed: %v %+v", err, set)
	}
}

func TestValidInviteCode(t *testing.T) {
	for code, want := range map[string]bool{
		"ABC234":  true,
		"ABC23":   false,
		"ABC2345": false,
		"ABC10I":  false, // 0, 1 and I are excluded from the alphabet
		"abc234":  false, // callers upper-case first
	} {
		if got := validInviteCode(code); got != want {
			t.Errorf("validInviteCode(%q) = %v, want %v", code, got, want)
		}
	}
}
