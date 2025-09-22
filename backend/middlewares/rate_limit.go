package middlewares

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
	"fmt"
	"github.com/gin-gonic/gin"
)

// tokenBucket implements a token bucket rate limiter
type tokenBucket struct {
	tokens      float64
	lastRefill  time.Time
	maxTokens   float64
	refillRate  float64 // tokens per second
}

func newTokenBucket(maxTokens int, refillRate float64) *tokenBucket {
	return &tokenBucket{
		tokens:     float64(maxTokens),
		lastRefill: time.Now(),
		maxTokens:  float64(maxTokens),
		refillRate: refillRate,
	}
}

func (tb *tokenBucket) allow() bool {
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()
	
	// Add tokens based on elapsed time
	tb.tokens += elapsed * tb.refillRate
	if tb.tokens > tb.maxTokens {
		tb.tokens = tb.maxTokens
	}
	tb.lastRefill = now

	// Check if we have at least one token
	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true
	}
	return false
}

// limiterEntry holds a token bucket and its last access time
type limiterEntry struct {
	bucket     *tokenBucket
	lastAccess time.Time
}

// ipRateLimiter manages rate limiting per IP address
type ipRateLimiter struct {
	limiters     map[string]*limiterEntry
	mu           sync.RWMutex
	refillRate   float64
	maxTokens    int
	cleanupTicker *time.Ticker
	done         chan struct{}
}

func newIPRateLimiter(maxRequests int, per time.Duration, burst int) *ipRateLimiter {
	refillRate := float64(maxRequests) / per.Seconds()
	
	limiter := &ipRateLimiter{
		limiters:   make(map[string]*limiterEntry),
		refillRate: refillRate,
		maxTokens:  burst,
		done:       make(chan struct{}),
	}

	// Start cleanup goroutine to prevent memory leaks
	limiter.startCleanup()
	
	return limiter
}

func (irl *ipRateLimiter) startCleanup() {
	irl.cleanupTicker = time.NewTicker(5 * time.Minute)
	go func() {
		for {
			select {
			case <-irl.cleanupTicker.C:
				irl.cleanup()
			case <-irl.done:
				irl.cleanupTicker.Stop()
				return
			}
		}
	}()
}

func (irl *ipRateLimiter) cleanup() {
	irl.mu.Lock()
	defer irl.mu.Unlock()
	
	cutoff := time.Now().Add(-10 * time.Minute) // Remove entries older than 10 minutes
	for ip, entry := range irl.limiters {
		if entry.lastAccess.Before(cutoff) {
			delete(irl.limiters, ip)
		}
	}
}

func (irl *ipRateLimiter) allow(ip string) bool {
	irl.mu.RLock()
	entry, exists := irl.limiters[ip]
	irl.mu.RUnlock()

	if !exists {
		irl.mu.Lock()
		// Double-check pattern
		if entry, exists = irl.limiters[ip]; !exists {
			entry = &limiterEntry{
				bucket:     newTokenBucket(irl.maxTokens, irl.refillRate),
				lastAccess: time.Now(),
			}
			irl.limiters[ip] = entry
		}
		irl.mu.Unlock()
	}

	// Update last access time
	irl.mu.Lock()
	entry.lastAccess = time.Now()
	irl.mu.Unlock()

	return entry.bucket.allow()
}

func (irl *ipRateLimiter) stop() {
	close(irl.done)
}

// RateLimitMiddleware returns a Gin middleware that rate-limits by client IP.
// maxRequests: maximum number of requests allowed in the given time period
// per: time period for the rate limit
// burst: maximum number of tokens in the bucket (burst capacity)
func RateLimitMiddleware(maxRequests int, per time.Duration, burst int) gin.HandlerFunc {
	limiter := newIPRateLimiter(maxRequests, per, burst)

	return func(c *gin.Context) {
		// Skip rate limiting for health checks and preflight requests
		if c.Request.Method == http.MethodOptions || c.FullPath() == "/" {
			c.Next()
			return
		}

		ip := extractClientIP(c)
		if ip == "" {
			ip = "unknown"
		}

		if !limiter.allow(ip) {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
			c.Header("X-RateLimit-Window", per.String())
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": "Too many requests, please slow down",
			})
			return
		}

		c.Next()
	}
}

// extractClientIP extracts the real client IP from various headers
func extractClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (can contain multiple IPs)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// Take the first valid IP from the comma-separated list
		for _, ip := range strings.Split(xff, ",") {
			ip = strings.TrimSpace(ip)
			if parsedIP := net.ParseIP(ip); parsedIP != nil && !isPrivateIP(parsedIP) {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xrip := c.GetHeader("X-Real-IP"); xrip != "" {
		if parsedIP := net.ParseIP(xrip); parsedIP != nil {
			return xrip
		}
	}

	// Check CF-Connecting-IP (Cloudflare)
	if cfip := c.GetHeader("CF-Connecting-IP"); cfip != "" {
		if parsedIP := net.ParseIP(cfip); parsedIP != nil {
			return cfip
		}
	}

	// Fallback to Gin's ClientIP method
	return c.ClientIP()
}

// isPrivateIP checks if an IP address is private/internal
func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	// Check for private IPv4 ranges
	if ip4 := ip.To4(); ip4 != nil {
		// 10.0.0.0/8
		if ip4[0] == 10 {
			return true
		}
		// 172.16.0.0/12
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
	}
	return false
}