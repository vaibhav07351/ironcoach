package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"sort"
	"time"
)

const (
	todaySlippingMax = 20
	todayDuesMax     = 20
)

// TodayService builds the trainer's Today screen: who trained, who is slipping, requests and
// dues. It runs a fixed number of queries however many clients the trainer has.
type TodayService struct {
	trainees   *repositories.TraineeRepository
	requests   *repositories.CoachRequestRepository
	attendance *repositories.AttendanceRepository
	adherence  *AdherenceService
	fees       *FeesService
}

func NewTodayService() *TodayService {
	return &TodayService{
		trainees:   repositories.NewTraineeRepository(),
		requests:   repositories.NewCoachRequestRepository(),
		attendance: repositories.NewAttendanceRepository(),
		adherence:  NewAdherenceService(),
		fees:       NewFeesService(),
	}
}

// Overview returns the trainer's Today data in the trainer's own time zone.
func (s *TodayService) Overview(p Principal) (models.TodayOverview, error) {
	if !p.IsTrainer() {
		return models.TodayOverview{}, ErrForbidden("trainers only")
	}
	loc := p.Location()
	today := localDate(time.Now(), loc)

	roster, err := s.trainees.ListActiveRefs(p.TrainerKey)
	if err != nil {
		return models.TodayOverview{}, err
	}
	ids, byID := indexRoster(roster)

	summaries, err := s.adherence.SummariesForRefs(roster, loc)
	if err != nil {
		return models.TodayOverview{}, err
	}
	attendedToday, err := s.attendance.TraineesOnDate(ids, today)
	if err != nil {
		return models.TodayOverview{}, err
	}
	dues, err := s.fees.duesFor(ids)
	if err != nil {
		return models.TodayOverview{}, err
	}
	pending, err := s.requests.CountPendingForTrainer(p.TrainerKey)
	if err != nil {
		return models.TodayOverview{}, err
	}

	out := models.TodayOverview{
		Date:            today,
		ClientCount:     len(roster),
		TrainedToday:    []models.TodayClient{},
		AttendedToday:   []models.TodayClient{},
		Slipping:        []models.AdherenceSummary{},
		Dues:            []models.DueItem{},
		PendingRequests: pending,
	}
	for _, sum := range summaries {
		if sum.TrainedToday {
			out.TrainedToday = append(out.TrainedToday, models.TodayClient{TraineeID: sum.TraineeID, Name: sum.TraineeName})
		}
		if sum.AtRisk && len(out.Slipping) < todaySlippingMax {
			out.Slipping = append(out.Slipping, sum)
		}
	}
	for _, t := range roster {
		if attendedToday[t.ID] {
			out.AttendedToday = append(out.AttendedToday, models.TodayClient{TraineeID: t.ID, Name: t.Name})
		}
	}
	out.Dues, out.DuesTotalPaise = topDues(dues, byID, todayDuesMax)
	return out, nil
}

// Dues returns every active client who owes money, largest first, one page at a time, plus the
// total owed by all of them. The client list uses it to show a dues badge on each row.
func (s *TodayService) Dues(p Principal, page Pagination) (items []models.DueItem, totalPaise int64, count int, err error) {
	if !p.IsTrainer() {
		return nil, 0, 0, ErrForbidden("trainers only")
	}
	roster, err := s.trainees.ListActiveRefs(p.TrainerKey)
	if err != nil {
		return nil, 0, 0, err
	}
	ids, byID := indexRoster(roster)
	dues, err := s.fees.duesFor(ids)
	if err != nil {
		return nil, 0, 0, err
	}
	all, totalPaise := topDues(dues, byID, len(dues))
	count = len(all)
	if page.Offset >= len(all) {
		return []models.DueItem{}, totalPaise, count, nil
	}
	end := page.Offset + page.Limit
	if end > len(all) {
		end = len(all)
	}
	return all[page.Offset:end], totalPaise, count, nil
}

// indexRoster returns the ids of the roster and a lookup by id.
func indexRoster(roster []models.TraineeRef) ([]string, map[string]models.TraineeRef) {
	ids := make([]string, 0, len(roster))
	byID := make(map[string]models.TraineeRef, len(roster))
	for _, t := range roster {
		ids = append(ids, t.ID)
		byID[t.ID] = t
	}
	return ids, byID
}

// topDues returns the largest dues first (ties by name) capped at max, and the total owed by
// everyone.
func topDues(dues map[string]int64, byID map[string]models.TraineeRef, max int) ([]models.DueItem, int64) {
	items := make([]models.DueItem, 0, len(dues))
	var total int64
	for id, due := range dues {
		ref, ok := byID[id]
		if !ok {
			continue
		}
		total += due
		items = append(items, models.DueItem{TraineeID: id, Name: ref.Name, PhoneNumber: ref.PhoneNumber, DuePaise: due})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].DuePaise != items[j].DuePaise {
			return items[i].DuePaise > items[j].DuePaise
		}
		return items[i].Name < items[j].Name
	})
	if len(items) > max {
		items = items[:max]
	}
	return items, total
}
