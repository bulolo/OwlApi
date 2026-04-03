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
	tenantUserRepo := &postgres.TenantUserRepo{R: pgRepo}

	seed(ctx, userRepo, tenantRepo, tenantUserRepo)

	fmt.Println("✅ Backend init completed.")
}

func hashPwd(pwd string) string {
	h, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		os.Exit(1)
	}
	return string(h)
}

func seed(ctx context.Context, users *postgres.UserRepo, tenants *postgres.TenantRepo, tenantUsers *postgres.TenantUserRepo) {
	// Idempotent: skip if superadmin already exists
	if existing, _ := users.GetByEmail(ctx, "superadmin@owlapi.cn"); existing != nil {
		slog.Info("Seed data already exists, skipping.")
		return
	}

	now := time.Now()

	// 1. 超级管理员 (平台级，不属于任何租户)
	superadmin := &domain.User{
		Email: "superadmin@owlapi.cn", Name: "SuperAdmin",
		PasswordHash: hashPwd("superadmin123"), IsSuperAdmin: true,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := users.Create(ctx, superadmin); err != nil {
		slog.Error("Failed to create superadmin", "error", err)
		os.Exit(1)
	}
	slog.Info("Created superadmin", "id", superadmin.ID, "email", superadmin.Email)

	// 2. 默认租户
	tenant := &domain.Tenant{
		Name: "研发中心", Slug: "default",
		Plan: domain.PlanFree, Status: domain.TenantActive,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := tenants.Create(ctx, tenant); err != nil {
		slog.Error("Failed to create default tenant", "error", err)
		os.Exit(1)
	}
	slog.Info("Created default tenant", "id", tenant.ID, "slug", tenant.Slug)

	// 3. 租户管理员 (属于 default 租户)
	admin := &domain.User{
		Email: "admin@owlapi.cn", Name: "Admin",
		PasswordHash: hashPwd("admin123"), IsSuperAdmin: false,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := users.Create(ctx, admin); err != nil {
		slog.Error("Failed to create tenant admin", "error", err)
		os.Exit(1)
	}
	if err := tenantUsers.Add(ctx, &domain.TenantUser{
		TenantID: tenant.ID, UserID: admin.ID, Role: domain.RoleAdmin, JoinedAt: now,
	}); err != nil {
		slog.Error("Failed to add tenant admin user", "error", err)
		os.Exit(1)
	}
	slog.Info("Created tenant admin", "email", admin.Email, "tenant", tenant.Slug)

	slog.Info("🦉 Seed completed!")
}
