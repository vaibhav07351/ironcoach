package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// NutritionFood is a search hit with macros per 100g (or per serving when grams unknown).
type NutritionFood struct {
	ExternalID  string  `json:"external_id"`
	Name        string  `json:"name"`
	Brand       string  `json:"brand,omitempty"`
	Calories    float64 `json:"calories"`
	Proteins    float64 `json:"proteins"`
	Carbs       float64 `json:"carbs"`
	Fats        float64 `json:"fats"`
	ServingDesc string  `json:"serving_desc,omitempty"`
	Per100g     bool    `json:"per_100g"`
}

type NutritionService struct {
	client *http.Client
	apiKey string
}

func NewNutritionService() *NutritionService {
	return &NutritionService{
		client: &http.Client{Timeout: 8 * time.Second},
		apiKey: strings.TrimSpace(os.Getenv("USDA_API_KEY")),
	}
}

// SearchFoods queries USDA FoodData Central and returns normalized macros.
func (s *NutritionService) SearchFoods(query string, pageSize int) ([]NutritionFood, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, errors.New("query is required")
	}
	if pageSize <= 0 || pageSize > 25 {
		pageSize = 10
	}
	apiKey := s.apiKey
	if apiKey == "" {
		apiKey = "DEMO_KEY"
	}

	endpoint := fmt.Sprintf(
		"https://api.nal.usda.gov/fdc/v1/foods/search?api_key=%s&query=%s&pageSize=%d",
		url.QueryEscape(apiKey),
		url.QueryEscape(query),
		pageSize,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nutrition provider error (%d)", resp.StatusCode)
	}

	var parsed usdaSearchResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}

	out := make([]NutritionFood, 0, len(parsed.Foods))
	for _, f := range parsed.Foods {
		item := NutritionFood{
			ExternalID:  strconv.Itoa(f.FdcID),
			Name:        f.Description,
			Brand:       f.BrandOwner,
			ServingDesc: "per 100g",
			Per100g:     true,
		}
		for _, n := range f.FoodNutrients {
			switch n.NutrientNumber {
			case "208": // Energy (kcal)
				item.Calories = n.Value
			case "203": // Protein
				item.Proteins = n.Value
			case "205": // Carbs
				item.Carbs = n.Value
			case "204": // Fat
				item.Fats = n.Value
			}
			// Fallback by name when nutrientNumber missing
			name := strings.ToLower(n.NutrientName)
			if n.NutrientNumber == "" {
				switch {
				case strings.Contains(name, "energy") && (strings.Contains(name, "kcal") || n.UnitName == "KCAL"):
					item.Calories = n.Value
				case name == "protein":
					item.Proteins = n.Value
				case strings.Contains(name, "carbohydrate"):
					item.Carbs = n.Value
				case name == "total lipid (fat)" || name == "fat":
					item.Fats = n.Value
				}
			}
		}
		if item.Name != "" {
			out = append(out, item)
		}
	}
	return out, nil
}

type usdaSearchResponse struct {
	Foods []usdaFood `json:"foods"`
}

type usdaFood struct {
	FdcID          int               `json:"fdcId"`
	Description    string            `json:"description"`
	BrandOwner     string            `json:"brandOwner"`
	FoodNutrients  []usdaNutrient    `json:"foodNutrients"`
}

type usdaNutrient struct {
	NutrientNumber string  `json:"nutrientNumber"`
	NutrientName   string  `json:"nutrientName"`
	UnitName       string  `json:"unitName"`
	Value          float64 `json:"value"`
}
