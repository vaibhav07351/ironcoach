package controllers

import (
	"ironcoach/models"
	"ironcoach/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ExerciseLogController serves the per-exercise Track / History / Graph endpoints.
type ExerciseLogController struct {
	service *services.ExerciseLogService
}

func NewExerciseLogController() *ExerciseLogController {
	return &ExerciseLogController{service: services.NewExerciseLogService()}
}

// GetDay returns one exercise's sets on a day plus the previous session and PR flags.
func (ctrl *ExerciseLogController) GetDay(c *gin.Context) {
	day, err := ctrl.service.GetDay(principal(c), c.Param("trainee_id"), c.Param("exercise_id"), c.Param("date"))
	if err != nil {
		respondError(c, err, "load_failed")
		return
	}
	c.JSON(http.StatusOK, day)
}

// SaveDay replaces one exercise's sets on a day (an empty list removes it from the day).
func (ctrl *ExerciseLogController) SaveDay(c *gin.Context) {
	var in models.ExerciseDayInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondBindError(c, err)
		return
	}
	saved, err := ctrl.service.SaveDay(principal(c), c.Param("trainee_id"), c.Param("exercise_id"), c.Param("date"), in)
	if err != nil {
		respondError(c, err, "save_failed")
		return
	}
	c.JSON(http.StatusOK, saved)
}

// History lists past sessions, newest first. Query: before (YYYY-MM-DD), limit (max 100), offset.
func (ctrl *ExerciseLogController) History(c *gin.Context) {
	page := pageFromQuery(c, 30, 100)
	sessions, err := ctrl.service.History(principal(c), c.Param("trainee_id"), c.Param("exercise_id"), c.Query("before"), page)
	if err != nil {
		respondError(c, err, "history_failed")
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// Stats returns graph series, bests and the rep-max table. Query: range (1m, 3m, 6m, 1y, all).
func (ctrl *ExerciseLogController) Stats(c *gin.Context) {
	stats, err := ctrl.service.Stats(principal(c), c.Param("trainee_id"), c.Param("exercise_id"), c.Query("range"))
	if err != nil {
		respondError(c, err, "stats_failed")
		return
	}
	c.JSON(http.StatusOK, stats)
}

// ActivityMix counts logged days per activity. Query: days (default 30, max 365).
func (ctrl *ExerciseLogController) ActivityMix(c *gin.Context) {
	days, _ := strconv.Atoi(c.Query("days"))
	mix, err := ctrl.service.ActivityMix(principal(c), c.Param("trainee_id"), days)
	if err != nil {
		respondError(c, err, "activity_mix_failed")
		return
	}
	c.JSON(http.StatusOK, mix)
}

// LoggedDates lists days with any log. Query: from, to (YYYY-MM-DD, at most 62 days apart).
func (ctrl *ExerciseLogController) LoggedDates(c *gin.Context) {
	dates, err := ctrl.service.LoggedDates(c.Param("trainee_id"), c.Query("from"), c.Query("to"))
	if err != nil {
		respondError(c, err, "dates_failed")
		return
	}
	c.JSON(http.StatusOK, dates)
}
