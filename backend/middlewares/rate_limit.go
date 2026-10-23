package middlewares

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// tokenBucket implements a token bucket. It is guarded by its own mutex because the same
// bucket is shared by concurrent requests from one client.
type tokenBucket struct {
	mu         sync.Mutex
	tokens     float64
	lastRefill time.Time
	lastAccess time.Time
	maxTokens  float64
	refillRate float64 // tokens per second
}

func newTokenBucket(maxTokens int, refillRate float64, now time.Time) *tokenBucket {
	return &tokenBucket{
		tokens:     float64(maxTokens),
		lastRefill: now,
		lastAccess: now,
		maxTokens:  float64(maxTokens),
		refillRate: refillRate,
	}
}

func (tb *tokenBucket) allow(now time.Time) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	tb.tokens += now.Sub(tb.lastRefill).Seconds() * tb.refillRate
	if tb.tokens > tb.maxTokens {
		tb.tokens = tb.maxTokens
	}
	tb.lastRefill = now
	tb.lastAccess = now

	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true
	}
	return false
}

func (tb *tokenBucket) idleSince(cutoff time.Time) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	return tb.lastAccess.Before(cutoff)
}

// keyedRateLimiter keeps one bucket per key (client IP).
type keyedRateLimiter struct {
	mu         sync.Mutex
	buckets    map[string]*tokenBucket
	refillRate float64
	maxTokens  int
}

func newKeyedRateLimiter(maxRequests int, per time.Duration, burst int) *keyedRateLimiter {
	l := &keyedRateLimiter{
		buckets:    make(map[string]*tokenBucket),
		refillRate: float64(maxRequests) / per.Seconds(),
		maxTokens:  burst,
	}
	go l.cleanupLoop()
	return l
}

func (l *keyedRateLimiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	b, ok := l.buckets[key]
	if !ok {
		b = newTokenBucket(l.maxTokens, l.refillRate, now)
		l.buckets[key] = b
	}
	l.mu.Unlock()
	return b.allow(now)
}

// cleanupLoop drops buckets idle for 10 minutes so memory does not grow with unique IPs.
// Limiters live for the life of the process, so the loop never needs to stop.
func (l *keyedRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		l.mu.Lock()
		for k, b := range l.buckets {
			if b.idleSince(cutoff) {
				delete(l.buckets, k)
			}
		}
		l.mu.Unlock()
	}
}

// RateLimitMiddleware rate-limits by client IP. The IP comes from gin's ClientIP, which only
// honours X-Forwarded-For when the direct peer is a trusted proxy (configured in main via
// SetTrustedProxies), so clients cannot spoof their address with a header.
func RateLimitMiddleware(maxRequests int, per time.Duration, burst int) gin.HandlerFunc {
	limiter := newKeyedRateLimiter(maxRequests, per, burst)

	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}

		if !limiter.allow(ip) {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
			c.Header("X-RateLimit-Window", per.String())
			c.Header("Retry-After", "60")
			abortJSON(c, http.StatusTooManyRequests, "rate_limited", "too many requests, please slow down")
			return
		}
		c.Next()
	}
}
