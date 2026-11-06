package models

import "time"

// Body measurement metric codes. Lengths are stored in centimetres; body fat in percent.
// Bodyweight is not stored here: it stays in the weigh-in (progress) collection.
const (
	MetricBodyweight = "bodyweight"
	MetricBodyFat    = "body_fat"
	MetricNeck       = "neck"
	MetricShoulders  = "shoulders"
	MetricChest      = "chest"
	MetricWaist      = "waist"
	MetricHips       = "hips"
	MetricUpperArm   = "upper_arm"
	MetricForearm    = "forearm"
	MetricThigh      = "thigh"
	MetricCalf       = "calf"
)

// BodyMetrics is the ordered list of metrics stored in body_measurements (bodyweight excluded).
var BodyMetrics = []string{
	MetricBodyFat, MetricNeck, MetricShoulders, MetricChest, MetricWaist, MetricHips,
	MetricUpperArm, MetricForearm, MetricThigh, MetricCalf,
}

// IsBodyMetric reports whether m is stored in body_measurements.
func IsBodyMetric(m string) bool {
	for _, b := range BodyMetrics {
		if b == m {
			return true
		}
	}
	return false
}

// BodyMeasurement is one value of one metric on one day (unique per trainee, metric, date).
type BodyMeasurement struct {
	ID        string    `bson:"_id,omitempty" json:"id"`
	TraineeID string    `bson:"trainee_id" json:"trainee_id"`
	Metric    string    `bson:"metric" json:"metric"`
	Date      string    `bson:"date" json:"date"`
	Value     float64   `bson:"value" json:"value"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// BodyMeasurementInput is the accepted body for recording a value.
type BodyMeasurementInput struct {
	TraineeID string  `json:"trainee_id" binding:"required"`
	Metric    string  `json:"metric" binding:"required"`
	Date      string  `json:"date" binding:"required"`
	Value     float64 `json:"value"`
}

// DatedValue is a value with its date.
type DatedValue struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// BodyMetricSummary is the latest value of a metric and the one before it (for the change).
type BodyMetricSummary struct {
	Metric   string      `json:"metric"`
	Latest   *DatedValue `json:"latest"`
	Previous *DatedValue `json:"previous"`
}
