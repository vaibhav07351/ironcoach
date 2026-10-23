package main

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/middlewares"
	"ironcoach/repositories"
	"ironcoach/routes"
	"ironcoach/services"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	_ "time/tzdata" // zone data embedded so IANA names work in the minimal container image
)

// Default proxies trusted to set X-Forwarded-For: Caddy reaches the API over the private Docker
// network. Override with TRUSTED_PROXIES (comma-separated IPs/CIDRs).
const defaultTrustedProxies = "127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	database.ConnectDB()
	if failed := repositories.EnsureIndexes(); failed > 0 {
		slog.Warn("some indexes are missing; queries still work but may be slower or allow duplicates", "collections_failed", failed)
	}
	middlewares.Configure(services.NewAccessService())

	router, err := routes.NewRouter(routes.RouterConfig{
		TrustedProxies: splitList(envOr("TRUSTED_PROXIES", defaultTrustedProxies)),
		AllowedOrigins: allowedOrigins(),
	})
	if err != nil {
		slog.Error("router setup failed", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              ":" + envOr("PORT", "8080"),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second, // uploads on slow mobile networks
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "err", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown: on SIGTERM (docker stop / redeploy) finish in-flight requests, then
	// close the database connection.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	slog.Info("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "err", err)
	}
	if err := database.Disconnect(ctx); err != nil {
		slog.Error("database disconnect failed", "err", err)
	}
	slog.Info("server stopped")
}

// allowedOrigins returns browser origins allowed by CORS. The mobile app does not need CORS;
// this only matters for the Expo web build. Localhost is allowed outside production.
func allowedOrigins() []string {
	origins := splitList(envOr("CORS_ALLOWED_ORIGINS", "https://ironcoach.expo.app"))
	if os.Getenv("ENV") != "production" {
		origins = append(origins, "http://localhost:8081", "http://localhost:8080")
	}
	return origins
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func splitList(s string) []string {
	var out []string
	for _, v := range strings.Split(s, ",") {
		if v = strings.TrimSpace(v); v != "" {
			out = append(out, v)
		}
	}
	return out
}
