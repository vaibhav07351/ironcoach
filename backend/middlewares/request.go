package middlewares

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
)

const requestIDKey = "request_id"

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9._-]{8,64}$`)

// RequestContext assigns a request id (reusing a well-formed incoming X-Request-ID), echoes it in
// the response, and writes one structured access log line per request.
func RequestContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if !validRequestID.MatchString(id) {
			id = newRequestID()
		}
		c.Set(requestIDKey, id)
		c.Header("X-Request-ID", id)

		start := time.Now()
		c.Next()

		level := slog.LevelInfo
		status := c.Writer.Status()
		if status >= 500 {
			level = slog.LevelError
		} else if status >= 400 {
			level = slog.LevelWarn
		}
		slog.Log(c.Request.Context(), level, "http request",
			"request_id", id,
			"method", c.Request.Method,
			"route", c.FullPath(),
			"status", status,
			"duration_ms", time.Since(start).Milliseconds(),
			"user_id", c.GetString("user_id"),
			"ip", c.ClientIP(),
		)
	}
}

// RequestID returns the id assigned by RequestContext.
func RequestID(c *gin.Context) string {
	return c.GetString(requestIDKey)
}

func newRequestID() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "unknown-request"
	}
	return hex.EncodeToString(b)
}

// LimitBody caps request bodies (JSON endpoints). Paths with their own larger limit are skipped.
func LimitBody(maxBytes int64, skipPaths ...string) gin.HandlerFunc {
	skip := make(map[string]bool, len(skipPaths))
	for _, p := range skipPaths {
		skip[p] = true
	}
	return func(c *gin.Context) {
		if c.Request.Body != nil && !skip[c.Request.URL.Path] {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
