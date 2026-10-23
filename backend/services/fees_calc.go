package services

import (
	"ironcoach/models"
	"regexp"
	"sort"
)

const (
	packageStatusActive  = "active"
	packageStatusUsedUp  = "used_up"
	packageStatusExpired = "expired"
)

// upiIDPattern matches a UPI address such as "name@bank" (letters, digits, dot, dash, underscore).
var upiIDPattern = regexp.MustCompile(`^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,31}$`)

func validUPIID(v string) bool { return upiIDPattern.MatchString(v) }

// buildPackageViews adds usage to each package. attended are the client's attended dates
// (YYYY-MM-DD, any order). Session packages are used up in the order they started: each one takes
// the earliest attended days on or after its start date that an earlier package has not already
// taken, up to its session count. Monthly packages only report how many days fall inside them.
// Nothing is stored, so deleting an attendance day or a package always gives consistent numbers.
func buildPackageViews(pkgs []models.Package, attended []string, today string) []models.PackageView {
	days := append([]string(nil), attended...)
	sort.Strings(days)
	taken := make([]bool, len(days))

	views := make([]models.PackageView, 0, len(pkgs))
	for _, pkg := range pkgs {
		view := models.PackageView{Package: pkg, Status: packageStatusActive}
		switch pkg.Kind {
		case models.PackageKindSessions:
			for i, d := range days {
				if view.SessionsUsed >= pkg.Sessions {
					break
				}
				if taken[i] || d < pkg.StartDate {
					continue
				}
				taken[i] = true
				view.SessionsUsed++
			}
			view.SessionsLeft = pkg.Sessions - view.SessionsUsed
			if view.SessionsLeft == 0 {
				view.Status = packageStatusUsedUp
			}
		case models.PackageKindMonthly:
			for _, d := range days {
				if d >= pkg.StartDate && d <= pkg.EndDate {
					view.Attended++
				}
			}
			if today > pkg.EndDate {
				view.Status = packageStatusExpired
			}
		}
		views = append(views, view)
	}
	return views
}

// money splits a client's position into what is due and what is overpaid. Both are never
// negative: due = total sold minus total paid, credit = the opposite.
func money(totalPaise, paidPaise int64) (due, credit int64) {
	if totalPaise > paidPaise {
		return totalPaise - paidPaise, 0
	}
	return 0, paidPaise - totalPaise
}
