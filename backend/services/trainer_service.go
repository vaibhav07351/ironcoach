package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"math"
	"net/url"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type TrainerService struct {
	repository *repositories.TrainerRepository
	users      *repositories.UserRepository
}

// constructor for TrainerService
func NewTrainerService() *TrainerService {
	return &TrainerService{
		repository: repositories.NewTrainerRepository(),
		users:      repositories.NewUserRepository(),
	}
}

// RegisterTrainer creates the profile for a new trainer account. The profile is keyed by the
// trainer's user id; a second profile for the same user or email is a conflict.
func (s *TrainerService) RegisterTrainer(trainer models.Trainer) error {
	if trainer.UserID == "" {
		return errors.New("trainer profile needs a user id")
	}
	now := time.Now()
	trainer.CreatedAt = now
	trainer.UpdatedAt = now
	trainer.DiscoveryVisible = true
	if trainer.TrainerType == "" {
		trainer.TrainerType = "personal"
	}
	if len(trainer.Expertises) == 0 {
		trainer.Expertises = []string{models.ExpertiseOther}
	}

	// Categories/exercises are seeded per trainee (client catalog), not per trainer.
	if err := s.repository.CreateTrainer(trainer); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return ErrConflict("profile_exists", "a trainer profile already exists for this account")
		}
		return err
	}
	return nil
}

// GetMyProfile returns the calling trainer's full profile.
func (s *TrainerService) GetMyProfile(p Principal) (models.Trainer, error) {
	trainer, err := s.repository.FindByUserID(p.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Trainer{}, ErrNotFound("trainer profile")
		}
		return models.Trainer{}, err
	}
	return trainer, nil
}

// UpdateProfile validates and applies the provided profile fields, then returns the profile.
func (s *TrainerService) UpdateProfile(p Principal, in models.TrainerProfileUpdate) (models.Trainer, error) {
	if !p.IsTrainer() {
		return models.Trainer{}, ErrForbidden("trainers only")
	}
	set, err := trainerFieldsFromInput(in)
	if err != nil {
		return models.Trainer{}, err
	}
	if len(set) == 0 {
		return models.Trainer{}, ErrValidation("nothing to update")
	}
	found, err := s.repository.UpdateByUserID(p.UserID, set)
	if err != nil {
		return models.Trainer{}, err
	}
	if !found {
		return models.Trainer{}, ErrNotFound("trainer profile")
	}
	return s.GetMyProfile(p)
}

func trainerFieldsFromInput(in models.TrainerProfileUpdate) (bson.M, error) {
	set := bson.M{}
	texts := []struct {
		field string
		v     *string
		max   int
	}{
		{"name", in.Name, 80}, {"headline", in.Headline, 120}, {"bio", in.Bio, 2000},
		{"speciality", in.Speciality, 120}, {"city", in.City, 80}, {"area", in.Area, 80},
		{"pincode", in.Pincode, 10}, {"address", in.Address, 300}, {"availability", in.Availability, 500},
		{"social_handle", in.SocialHandle, 80}, {"phone_number", in.PhoneNumber, 15},
	}
	for _, t := range texts {
		if t.v == nil {
			continue
		}
		v := strings.TrimSpace(*t.v)
		if err := validateText(t.field, v, t.field == "name", t.max); err != nil {
			return nil, err
		}
		set[t.field] = v
	}
	if in.UPIID != nil {
		upi := strings.TrimSpace(*in.UPIID)
		if upi != "" && !validUPIID(upi) {
			return nil, ErrValidation("upi_id must look like name@bank")
		}
		set["upi_id"] = upi
	}
	if in.Expertises != nil {
		normalized, ok := models.NormalizeExpertises(*in.Expertises)
		if !ok {
			return nil, ErrValidation("invalid expertise code")
		}
		set["expertises"] = normalized
	}
	if in.Latitude != nil || in.Longitude != nil {
		if in.Latitude == nil || in.Longitude == nil {
			return nil, ErrValidation("latitude and longitude must be set together")
		}
		if err := validateNumber("latitude", *in.Latitude, -90, 90); err != nil {
			return nil, err
		}
		if err := validateNumber("longitude", *in.Longitude, -180, 180); err != nil {
			return nil, err
		}
		set["latitude"] = *in.Latitude
		set["longitude"] = *in.Longitude
	}
	if in.HourlyRate != nil {
		if err := validateNumber("hourly_rate", *in.HourlyRate, 0, 100000); err != nil {
			return nil, err
		}
		set["hourly_rate"] = *in.HourlyRate
	}
	if in.Experience != nil {
		if *in.Experience < 0 || *in.Experience > 70 {
			return nil, ErrValidation("experience must be between 0 and 70 years")
		}
		set["experience"] = *in.Experience
	}
	if in.TrainerType != nil {
		if !models.TrainerTypes[*in.TrainerType] {
			return nil, ErrValidation("trainer_type must be personal, group, online or rehabilitation")
		}
		set["trainer_type"] = *in.TrainerType
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
	if in.DiscoveryVisible != nil {
		set["discovery_visible"] = *in.DiscoveryVisible
	}
	return set, nil
}

// roundTo rounds v to the given number of decimals.
func roundTo(v float64, decimals int) float64 {
	p := math.Pow(10, float64(decimals))
	return math.Round(v*p) / p
}

// DiscoverTrainers ranks visible coaches for a client: interest matches first, then nearby,
// each by distance. interestsOverride (from the query) replaces the client's saved interests.
func (s *TrainerService) DiscoverTrainers(p Principal, lat, lng float64, limit int, interestsOverride []string) ([]models.DiscoverTrainer, error) {
	if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		return nil, ErrValidation("lat/lng out of range")
	}
	clientInterests := interestsOverride
	if len(clientInterests) == 0 {
		user, err := s.users.FindByID(p.UserID)
		if err != nil {
			return nil, err
		}
		clientInterests = user.Interests
	}
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	const minMatchFill = 8

	trainers, err := s.repository.FindDiscoveryVisible()
	if err != nil {
		return nil, err
	}

	interests, _ := models.NormalizeExpertises(clientInterests)
	hasCoords := lat != 0 || lng != 0

	type ranked struct {
		item  models.DiscoverTrainer
		match bool
	}
	rankedItems := make([]ranked, 0, len(trainers))
	for _, t := range trainers {
		expertises := models.EffectiveExpertises(t.Expertises)
		// Only an approximate location (about 1 km) is ever shared with clients.
		item := models.DiscoverTrainer{
			ID:          t.UserID,
			Name:        t.Name,
			ImageURL:    t.ImageURL,
			Headline:    t.Headline,
			Bio:         t.Bio,
			Speciality:  t.Speciality,
			Expertises:  expertises,
			Experience:  t.Experience,
			HourlyRate:  t.HourlyRate,
			TrainerType: t.TrainerType,
			City:        t.City,
			Area:        t.Area,
			Latitude:    roundTo(t.Latitude, 2),
			Longitude:   roundTo(t.Longitude, 2),
			Rating:      t.Rating,
			RatingCount: t.RatingCount,
		}
		if hasCoords && (t.Latitude != 0 || t.Longitude != 0) {
			item.DistanceKm = roundTo(haversineKm(lat, lng, t.Latitude, t.Longitude), 1)
		} else {
			item.DistanceKm = -1
		}
		isMatch := models.ExpertiseOverlap(interests, expertises)
		if isMatch {
			item.MatchTier = "match"
		} else {
			item.MatchTier = "nearby"
		}
		rankedItems = append(rankedItems, ranked{item: item, match: isMatch})
	}

	sortByDistance := func(a, b models.DiscoverTrainer) bool {
		di, dj := a.DistanceKm, b.DistanceKm
		if di < 0 && dj < 0 {
			return a.Name < b.Name
		}
		if di < 0 {
			return false
		}
		if dj < 0 {
			return true
		}
		return di < dj
	}

	matches := make([]models.DiscoverTrainer, 0)
	nearby := make([]models.DiscoverTrainer, 0)
	for _, r := range rankedItems {
		if r.match {
			matches = append(matches, r.item)
		} else {
			nearby = append(nearby, r.item)
		}
	}
	sort.SliceStable(matches, func(i, j int) bool { return sortByDistance(matches[i], matches[j]) })
	sort.SliceStable(nearby, func(i, j int) bool { return sortByDistance(nearby[i], nearby[j]) })

	results := matches
	if len(results) < minMatchFill {
		need := minMatchFill - len(results)
		if need > len(nearby) {
			need = len(nearby)
		}
		results = append(results, nearby[:need]...)
	}
	// If still under limit and we have more nearby, fill up to limit
	if len(results) < limit && len(nearby) > 0 {
		start := 0
		if len(matches) < minMatchFill {
			start = minMatchFill - len(matches)
			if start > len(nearby) {
				start = len(nearby)
			}
		}
		for i := start; i < len(nearby) && len(results) < limit; i++ {
			results = append(results, nearby[i])
		}
	}

	if len(results) > limit {
		results = results[:limit]
	}
	return results, nil
}

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}
