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
	"github.com/hongjunyao/owlapi/internal/service"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadFromEnv()
	logger.Init(cfg.LogLevel)
	slog.Info("Running backend init...")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	var (
		db  *postgres.DB
		err error
	)
	for i := 0; i < 10; i++ {
		db, err = postgres.NewDB(ctx, cfg.DatabaseURL)
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

	users := &postgres.UserRepo{DB: db}
	tenants := &postgres.TenantRepo{DB: db}
	tenantUsers := &postgres.TenantUserRepo{DB: db}
	gatewayRepo := &postgres.GatewayRepo{DB: db}
	gatewaySvc := service.NewGatewayService(gatewayRepo)

	seed(ctx, users, tenants, tenantUsers, gatewaySvc, &postgres.ProjectRepo{DB: db})
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

func seed(ctx context.Context, users *postgres.UserRepo, tenants *postgres.TenantRepo, tenantUsers *postgres.TenantUserRepo, gatewaySvc service.GatewayService, projects *postgres.ProjectRepo) {
	if existing, _ := users.GetByEmail(ctx, "superadmin@owlapi.cn"); existing != nil {
		slog.Info("Seed data already exists, skipping.")
		return
	}

	now := time.Now()

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

	admin := &domain.User{
		Email: "admin@owlapi.cn", Name: "Admin",
		PasswordHash: hashPwd("admin123"), IsSuperAdmin: false,
		CreatedAt: now, UpdatedAt: now,
	}
	if err := users.Create(ctx, admin); err != nil {
		slog.Error("Failed to create tenant admin", "error", err)
		os.Exit(1)
	}
	if err := tenantUsers.Create(ctx, &domain.TenantUser{
		TenantID: tenant.ID, UserID: admin.ID, Role: domain.RoleAdmin, JoinedAt: now,
	}); err != nil {
		slog.Error("Failed to add tenant admin user", "error", err)
		os.Exit(1)
	}
	slog.Info("Created tenant admin", "email", admin.Email, "tenant", tenant.Slug)

	gw := &domain.Gateway{
		TenantID: tenant.ID,
		Name:     "内置网关",
		Token:    os.Getenv("OWLAPI_GATEWAY_TOKEN"),
	}
	if err := gatewaySvc.Create(ctx, gw); err != nil {
		slog.Error("Failed to create dev gateway", "error", err)
		os.Exit(1)
	}
	slog.Info("Created dev gateway", "id", gw.ID, "tenant_id", tenant.ID, "token", gw.Token)

	// 5. 内置演示数据源（绑定到内置网关，使用 SQLite）
	ds := &domain.DataSource{
		TenantID: tenant.ID,
		Name:     "内置 SQLite",
		IsDual:   false,
		Type:     "sqlite",
		Envs: []*domain.DataSourceEnv{
			{Env: "prod", DSN: "/data/owlapi_demo.db", GatewayID: gw.ID},
		},
	}
	if err := projects.CreateDataSource(ctx, ds); err != nil {
		slog.Error("Failed to create demo datasource", "error", err)
		os.Exit(1)
	}
	slog.Info("Created demo datasource", "id", ds.ID, "type", ds.Type)

	// 6. 演示项目（绑定到内置 SQLite 数据源）
	proj := &domain.Project{
		TenantID:     tenant.ID,
		Name:         "演示项目",
		Description:  "使用内置 SQLite 数据源的演示项目",
		DataSourceID: ds.ID,
	}
	if err := projects.CreateProject(ctx, proj); err != nil {
		slog.Error("Failed to create demo project", "error", err)
		os.Exit(1)
	}
	slog.Info("Created demo project", "id", proj.ID, "datasource_id", ds.ID)

	// 7. 演示 API 接口
	demoEndpoints := []*domain.APIEndpoint{
		{TenantID: tenant.ID, ProjectID: proj.ID, Path: "/users", Methods: []string{"GET"}, SQL: "SELECT id, name, email, role, created_at FROM users", Params: []string{}},
		{TenantID: tenant.ID, ProjectID: proj.ID, Path: "/products", Methods: []string{"GET"}, SQL: "SELECT id, name, price, stock, category FROM products", Params: []string{}},
		{TenantID: tenant.ID, ProjectID: proj.ID, Path: "/orders", Methods: []string{"GET"}, SQL: "SELECT o.id, u.name as user_name, p.name as product_name, o.quantity, o.total, o.status FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id", Params: []string{}},
	}
	for _, ep := range demoEndpoints {
		if err := projects.CreateAPIEndpoint(ctx, ep); err != nil {
			slog.Error("Failed to create demo endpoint", "path", ep.Path, "error", err)
			os.Exit(1)
		}
	}
	slog.Info("Created demo API endpoints", "count", len(demoEndpoints))

	slog.Info("🦉 Seed completed!")
}
