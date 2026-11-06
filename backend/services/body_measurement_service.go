package services

import (
	"fmt"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

// maxBodySeriesPoints bounds one metric's chart (about three years of weekly measurements, or a
// year of daily weigh-ins).
const maxBodySeriesPoints = 1000

// metricBounds are the accepted ranges: percent for body fat, centimetres for lengths.
var metricBounds = map[string][2]float64{
	models.MetricBodyFat:   {1, 80},
	models.MetricNeck:      {10, 100},
	models.MetricShoulders: {40, 250},
	models.MetricChest:     {40, 250},
	models.MetricWaist:     {30, 250},
	models.MetricHips:      {40, 250},
	models.MetricUpperArm:  {10, 100},
	models.MetricForearm:   {10, 80},
	models.MetricThigh:     {20, 150},
	models.MetricCalf:      {15, 100},
}

// BodyMeasurementService records and reads body measurements. Bodyweight goes through the
// existing weigh-in store so the Weight section and BMI keep working unchanged.
type BodyMeasurementService struct {
	repo     *repositories.BodyMeasurementRepository
	progress *repositories.ProgressRepository
	weights  *ProgressService
	access   *AccessService
}

func NewBodyMeasurementService() *BodyMeasurementService {
	return &BodyMeasurementService{
		repo:     repositories.NewBodyMeasurementRepository(),
		progress: repositories.NewProgressRepository(),
		weights:  NewProgressService(),
		access:   NewAccessService(),
	}
}

func validateMetric(metric string) error {
	if metric == models.MetricBodyweight || models.IsBodyMetric(metric) {
		return nil
	}
	return ErrValidation("metric is not supported")
}

// Record stores the day's value of a metric (recording again the same day replaces it).
func (s *BodyMeasurementService) Record(p Principal, in models.BodyMeasurementInput) error {
	if err := validateMetric(in.Metric); err != nil {
		return err
	}
	if in.Metric == models.MetricBodyweight {
		return s.weights.AddWeightProgress(p, models.WeightBMIProgress{TraineeID: in.TraineeID, Date: in.Date, Weight: in.Value})
	}
	if err := validateDate("date", in.Date); err != nil {
		return err
	}
	if err := validateNotFuture("date", in.Date, p.Location(), time.Now()); err != nil {
		return err
	}
	bounds := metricBounds[in.Metric]
	if err := validateNumber(in.Metric, in.Value, bounds[0], bounds[1]); err != nil {
		return err
	}
	if _, err := s.access.AuthorizeTrainee(p, in.TraineeID); err != nil {
		return err
	}
	return s.repo.Upsert(in.TraineeID, in.Metric, in.Date, round1(in.Value))
}

// Delete removes the day's value of a body metric (bodyweight is managed in the Weight section).
func (s *BodyMeasurementService) Delete(p Principal, traineeID, metric, date string) error {
	if !models.IsBodyMetric(metric) {
		return ErrValidation("metric is not supported")
	}
	if err := validateDate("date", date); err != nil {
		return err
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return err
	}
	found, err := s.repo.Delete(traineeID, metric, date)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("measurement")
	}
	return nil
}

// Summary returns every metric (bodyweight first) with its latest and previous value, in the
// fixed display order, including metrics never recorded (latest = nil).
func (s *BodyMeasurementService) Summary(traineeID string) ([]models.BodyMetricSummary, error) {
	latest, err := s.repo.LatestTwo(traineeID)
	if err != nil {
		return nil, err
	}
	weights, err := s.progress.LatestTwoWeights(traineeID)
	if err != nil {
		return nil, err
	}
	out := make([]models.BodyMetricSummary, 0, len(models.BodyMetrics)+1)
	out = append(out, summaryOf(models.MetricBodyweight, weights))
	for _, m := range models.BodyMetrics {
		out = append(out, summaryOf(m, latest[m]))
	}
	return out, nil
}

// summaryOf builds a summary from up to two values, newest first.
func summaryOf(metric string, values []models.DatedValue) models.BodyMetricSummary {
	sum := models.BodyMetricSummary{Metric: metric}
	if len(values) > 0 {
		v := values[0]
		sum.Latest = &v
	}
	if len(values) > 1 {
		v := values[1]
		sum.Previous = &v
	}
	return sum
}

// Series returns one metric's values over a range (1m, 3m, 6m, 1y, all), oldest first.
func (s *BodyMeasurementService) Series(p Principal, traineeID, metric, rangeKey string) ([]models.DatedValue, error) {
	if err := validateMetric(metric); err != nil {
		return nil, err
	}
	if rangeKey == "" {
		rangeKey = "6m"
	}
	if !IsValidStatsRange(rangeKey) {
		return nil, ErrValidation(fmt.Sprintf("range %q must be 1m, 3m, 6m, 1y or all", rangeKey))
	}
	from := ""
	if days, ok := rangeDays[rangeKey]; ok {
		from = localDate(time.Now().AddDate(0, 0, -days), p.Location())
	}
	if metric == models.MetricBodyweight {
		return s.progress.WeightSeries(traineeID, from, maxBodySeriesPoints)
	}
	return s.repo.Series(traineeID, metric, from, maxBodySeriesPoints)
}
