package services

import (
	"testing"

	"ironcoach/models"
)

func TestCanAccessTrainee(t *testing.T) {
	trainee := models.Trainee{ID: "t1", TrainerID: "coach@x.com", UserID: "u-client"}

	cases := []struct {
		name string
		p    Principal
		want bool
	}{
		{"owning trainer", Principal{UserID: "u-coach", Role: models.RoleTrainer, TrainerKey: "coach@x.com"}, true},
		{"other trainer", Principal{UserID: "u-other", Role: models.RoleTrainer, TrainerKey: "other@x.com"}, false},
		{"trainer with empty key", Principal{UserID: "u-coach", Role: models.RoleTrainer}, false},
		{"linked client", Principal{UserID: "u-client", Role: models.RoleClient, TraineeID: "t1"}, true},
		{"client of another trainee", Principal{UserID: "u-client", Role: models.RoleClient, TraineeID: "t2"}, false},
		{"unlinked client", Principal{UserID: "u-client", Role: models.RoleClient}, false},
		// Stale link on the user but the trainee now points at someone else (e.g. after leave/re-invite).
		{"client whose trainee was re-linked", Principal{UserID: "u-old", Role: models.RoleClient, TraineeID: "t1"}, false},
		{"unknown role", Principal{UserID: "u-client", Role: "admin", TraineeID: "t1", TrainerKey: "coach@x.com"}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := canAccessTrainee(tc.p, trainee); got != tc.want {
				t.Fatalf("canAccessTrainee = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestPrincipalFromUser(t *testing.T) {
	// A trainer's key is always their own user id, even if a stale trainer_id is stored.
	trainer := principalFromUser(models.User{ID: "u1", Email: "a@x.com", Role: models.RoleTrainer, TrainerID: "a@x.com"})
	if trainer.TrainerKey != "u1" {
		t.Fatalf("trainer key = %q, want user id u1", trainer.TrainerKey)
	}
	if trainer.Timezone != DefaultTimezone {
		t.Fatalf("missing timezone should default, got %q", trainer.Timezone)
	}
	client := principalFromUser(models.User{ID: "u2", Email: "c@x.com", Role: models.RoleClient, TrainerID: "u1", TraineeID: "t1", Timezone: "Asia/Dubai"})
	if client.TrainerKey != "u1" || client.TraineeID != "t1" || client.Location().String() != "Asia/Dubai" {
		t.Fatalf("unexpected client principal %+v", client)
	}
}
