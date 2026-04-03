package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"github.com/hongjunyao/owlapi/internal/repo/postgres"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadFromEnv()
	logger.Init(cfg.LogLevel)
	slog.Info("Running backend init...")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Retry DB connection (PG may need a moment after healthcheck passes)
	var (
		pgRepo *postgres.Repository
		err    error
	)
	for i := 0; i < 10; i++ {
		pgRepo, err = postgres.NewRepository(ctx, cfg.DatabaseURL)
		if err == nil {
			break
		}
		slog.Warn("DB not ready, retrying...", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		slog.Error("Failed to connect database", "error", err)
		os.Exit(1)
	}

	userRepo := &postgres.UserRepo{R: pgRepo}
	tenantRepo := &postgres.TenantRepo{R: pgRepo}
	memberRepo := &postgres.MemberRepo{R: pgRepo}

	// Seed demo tenant & admin (idempotent)
	seedDemoData(ctx, userRepo, tenantRepo, memberRepo)

	fmt.Println("✅ Backend init completed.")
}

func seedDemoData(ctx context.Context, users *postgres.UserRepo, tenants *postgres.TenantRepo, members *postgres.MemberRepo) {
	// Skip if admin already exists
	if existing, _ := users.GetByEmail(ctx, "admin@owlapi.cn"); existing != nil {
		slog.Info("Demo data already exists, skipping seed.")
		return
	}

	now := time.Now()

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		os.Exit(1)
	}

	admin := &domain.User{
		ID: "u_seed_admin", Email: "admin@owlapi.cn", Name: "Admin",
		PasswordHash: string(hash), CreatedAt: now, UpdatedAt: now,
	}
	if err := users.Create(ctx, admin); err != nil {
		slog.Error("Failed to create admin user", "error", err)
		os.Exit(1)
	}

	tenant := &domain.Tenant{
		ID: "t_seed_default", Name: "研发中心", Slug: "default",
		Plan: domain.PlanFree, Status: domain.TenantActive, CreatedAt: now, UpdatedAt: now,
	}
	if err := tenants.Create(ctx, tenant); err != nil {
		slog.Error("Failed to create demo tenant", "error", err)
		os.Exit(1)
	}

	if err := members.Add(ctx, &domain.TenantMember{
		TenantID: tenant.ID, UserID: admin.ID, Role: domain.RoleAdmin, JoinedAt: now,
	}); err != nil {
		slog.Error("Failed to add member", "error", err)
		os.Exit(1)
	}

	slog.Info("🦉 Seeded default tenant", "slug", "default", "admin", "admin@owlapi.cn")
}
