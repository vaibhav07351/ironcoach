package services

import (
	"ironcoach/models"
	"testing"
	"time"
)

func sessionsPkg(start string, n int) models.Package {
	return models.Package{Kind: models.PackageKindSessions, StartDate: start, Sessions: n, AmountPaise: 100}
}

func TestBuildPackageViewsUsesSessionsInOrder(t *testing.T) {
	pkgs := []models.Package{sessionsPkg("2026-10-01", 2), sessionsPkg("2026-10-05", 3)}
	// 09-30 is before any package; 10-02 and 10-03 fill the first; 10-06 and 10-07 go to the second.
	attended := []string{"2026-10-07", "2026-09-30", "2026-10-03", "2026-10-02", "2026-10-06"}

	views := buildPackageViews(pkgs, attended, "2026-10-10")

	if views[0].SessionsUsed != 2 || views[0].SessionsLeft != 0 || views[0].Status != packageStatusUsedUp {
		t.Errorf("first package: %+v", views[0])
	}
	if views[1].SessionsUsed != 2 || views[1].SessionsLeft != 1 || views[1].Status != packageStatusActive {
		t.Errorf("second package: %+v", views[1])
	}
}

func TestBuildPackageViewsMonthly(t *testing.T) {
	pkgs := []models.Package{{Kind: models.PackageKindMonthly, StartDate: "2026-10-01", EndDate: "2026-10-31"}}
	attended := []string{"2026-09-30", "2026-10-02", "2026-10-31", "2026-11-01"}

	if v := buildPackageViews(pkgs, attended, "2026-10-15")[0]; v.Attended != 2 || v.Status != packageStatusActive {
		t.Errorf("during: %+v", v)
	}
	if v := buildPackageViews(pkgs, attended, "2026-11-01")[0]; v.Status != packageStatusExpired {
		t.Errorf("after end: %+v", v)
	}
}

func TestMoney(t *testing.T) {
	cases := []struct{ total, paid, due, credit int64 }{
		{600000, 400000, 200000, 0},
		{600000, 600000, 0, 0},
		{600000, 700000, 0, 100000},
		{0, 0, 0, 0},
	}
	for _, c := range cases {
		due, credit := money(c.total, c.paid)
		if due != c.due || credit != c.credit {
			t.Errorf("money(%d,%d) = %d,%d want %d,%d", c.total, c.paid, due, credit, c.due, c.credit)
		}
	}
}

func TestValidUPIID(t *testing.T) {
	for v, want := range map[string]bool{
		"ravi@okhdfc": true, "ravi.k-1@ybl": true, "ravi": false, "@ybl": false,
		"ravi@": false, "ra vi@ybl": false, "ravi@ybl;x": false,
	} {
		if got := validUPIID(v); got != want {
			t.Errorf("validUPIID(%q) = %v, want %v", v, got, want)
		}
	}
}

func TestNormalizePackageInput(t *testing.T) {
	loc := loadLocation("Asia/Kolkata")
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, loc)

	ok := models.PackageInput{Kind: "sessions", AmountPaise: 600000, Sessions: 12}
	if err := normalizePackageInput(&ok, loc, now); err != nil {
		t.Fatal(err)
	}
	if ok.StartDate != "2026-10-24" || ok.Name != "12 sessions" {
		t.Errorf("defaults not applied: %+v", ok)
	}

	bad := map[string]models.PackageInput{
		"unknown kind":      {Kind: "weekly", AmountPaise: 100},
		"zero amount":       {Kind: "sessions", Sessions: 1},
		"huge amount":       {Kind: "sessions", Sessions: 1, AmountPaise: maxAmountPaise + 1},
		"no sessions":       {Kind: "sessions", AmountPaise: 100},
		"too many sessions": {Kind: "sessions", AmountPaise: 100, Sessions: 501},
		"sessions + end":    {Kind: "sessions", AmountPaise: 100, Sessions: 1, EndDate: "2026-11-01"},
		"monthly no end":    {Kind: "monthly", AmountPaise: 100},
		"monthly reversed":  {Kind: "monthly", AmountPaise: 100, StartDate: "2026-10-10", EndDate: "2026-10-01"},
		"monthly too long":  {Kind: "monthly", AmountPaise: 100, StartDate: "2026-01-01", EndDate: "2027-12-31"},
		"monthly sessions":  {Kind: "monthly", AmountPaise: 100, EndDate: "2026-11-01", Sessions: 3},
		"bad date":          {Kind: "sessions", AmountPaise: 100, Sessions: 1, StartDate: "24/10/2026"},
		"start far ahead":   {Kind: "sessions", AmountPaise: 100, Sessions: 1, StartDate: "2030-01-01"},
		"bad client id":     {Kind: "sessions", AmountPaise: 100, Sessions: 1, ClientID: "x"},
	}
	for name, in := range bad {
		in := in
		if err := normalizePackageInput(&in, loc, now); !IsKind(err, KindValidation) {
			t.Errorf("%s: want validation error, got %v", name, err)
		}
	}
}

func TestNormalizePaymentInput(t *testing.T) {
	loc := loadLocation("Asia/Kolkata")
	now := time.Date(2026, 10, 24, 10, 0, 0, 0, loc)

	ok := models.PaymentInput{AmountPaise: 400000}
	if err := normalizePaymentInput(&ok, loc, now); err != nil || ok.Date != "2026-10-24" {
		t.Fatalf("default date: %+v %v", ok, err)
	}
	for name, in := range map[string]models.PaymentInput{
		"zero":   {},
		"future": {AmountPaise: 1, Date: "2026-12-01"},
		"format": {AmountPaise: 1, Date: "yesterday"},
	} {
		in := in
		if err := normalizePaymentInput(&in, loc, now); !IsKind(err, KindValidation) {
			t.Errorf("%s: want validation error, got %v", name, err)
		}
	}
}

func TestTopDues(t *testing.T) {
	byID := map[string]models.TraineeRef{
		"a": {ID: "a", Name: "Asha"}, "b": {ID: "b", Name: "Bala"}, "c": {ID: "c", Name: "Chitra"},
	}
	// "gone" is not an active client any more: it must not count toward the total.
	items, total := topDues(map[string]int64{"a": 100, "b": 300, "c": 100, "gone": 999}, byID, 2)
	if total != 500 {
		t.Errorf("total = %d, want 500", total)
	}
	if len(items) != 2 || items[0].TraineeID != "b" || items[1].TraineeID != "a" {
		t.Errorf("items = %+v", items)
	}
}
