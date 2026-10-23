package middlewares

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimitIgnoresSpoofedForwardedFor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// No trusted proxies: X-Forwarded-For must be ignored entirely.
	if err := r.SetTrustedProxies(nil); err != nil {
		t.Fatal(err)
	}
	r.GET("/x", RateLimitMiddleware(2, time.Hour, 2), func(c *gin.Context) { c.Status(http.StatusOK) })

	codes := []int{}
	for i := 0; i < 4; i++ {
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		req.RemoteAddr = "203.0.113.7:1234"
		// A different fake client IP on every request used to bypass the limiter.
		req.Header.Set("X-Forwarded-For", "198.51.100."+string(rune('1'+i)))
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		codes = append(codes, w.Code)
	}
	if codes[2] != http.StatusTooManyRequests || codes[3] != http.StatusTooManyRequests {
		t.Fatalf("expected requests 3 and 4 to be limited, got %v", codes)
	}
}

func TestTokenBucketConcurrentUse(t *testing.T) {
	l := newKeyedRateLimiter(1000, time.Minute, 100)
	var wg sync.WaitGroup
	var mu sync.Mutex
	allowed := 0
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if l.allow("same-ip") {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	// Burst is 100; a little refill may happen during the test but never close to 200.
	if allowed < 100 || allowed > 110 {
		t.Fatalf("allowed = %d, want about 100", allowed)
	}
}
