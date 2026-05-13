package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/bulolo/owlapi/internal/config"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pkg/logger"
	"github.com/bulolo/owlapi/internal/repo/postgres"
	"github.com/bulolo/owlapi/internal/service"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadServerConfig()
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
	endpointRepo := &postgres.APIEndpointRepo{DB: db}
	releaseRepo := &postgres.EndpointReleaseRepo{DB: db}
	releaseSvc := service.NewEndpointReleaseService(releaseRepo, endpointRepo)

	seed(ctx, users, tenants, tenantUsers, gatewaySvc,
		&postgres.ProjectRepo{DB: db},
		&postgres.DataSourceRepo{DB: db},
		&postgres.ScriptRepo{DB: db},
		&postgres.APIGroupRepo{DB: db},
		endpointRepo,
		releaseSvc,
	)
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

// ── repos bundle ─────────────────────────────────────────────────────────────

type repos struct {
	users       *postgres.UserRepo
	tenants     *postgres.TenantRepo
	tenantUsers *postgres.TenantUserRepo
	gateways    service.GatewayService
	projects    *postgres.ProjectRepo
	dataSources *postgres.DataSourceRepo
	scripts     *postgres.ScriptRepo
	groups      *postgres.APIGroupRepo
	endpoints   *postgres.APIEndpointRepo
	releases    service.EndpointReleaseService
}

// ── helpers ───────────────────────────────────────────────────────────────────

func ensureUser(ctx context.Context, r *repos, email, name, pwd string, isSuperAdmin bool) *domain.User {
	now := time.Now()
	u := &domain.User{Email: email, Name: name, PasswordHash: hashPwd(pwd), IsSuperAdmin: isSuperAdmin, CreatedAt: now, UpdatedAt: now}
	if existing, _ := r.users.GetByEmail(ctx, email); existing != nil {
		slog.Info("User already exists", "email", email)
		return existing
	}
	if err := r.users.Create(ctx, u); err != nil {
		slog.Error("Failed to create user", "email", email, "error", err)
		os.Exit(1)
	}
	slog.Info("Created user", "email", email)
	return u
}

func ensureTenant(ctx context.Context, r *repos, slug, name string) *domain.Tenant {
	now := time.Now()
	t := &domain.Tenant{Name: name, Slug: slug, Plan: domain.PlanFree, Status: domain.TenantActive, MaxReleaseVersions: 5, CreatedAt: now, UpdatedAt: now}
	if existing, _ := r.tenants.GetBySlug(ctx, slug); existing != nil {
		slog.Info("Tenant already exists", "slug", slug)
		return existing
	}
	if err := r.tenants.Create(ctx, t); err != nil {
		slog.Error("Failed to create tenant", "slug", slug, "error", err)
		os.Exit(1)
	}
	slog.Info("Created tenant", "slug", slug)
	return t
}

func ensureTenantUser(ctx context.Context, r *repos, tenantID, userID int64, role domain.UserRole) {
	now := time.Now()
	if _, err := r.tenantUsers.GetByTenantAndUser(ctx, tenantID, userID); err == nil {
		return
	}
	if err := r.tenantUsers.Create(ctx, &domain.TenantUser{TenantID: tenantID, UserID: userID, Role: role, JoinedAt: now}); err != nil {
		slog.Error("Failed to add tenant user", "tenantID", tenantID, "userID", userID, "error", err)
		os.Exit(1)
	}
	slog.Info("Linked user to tenant", "tenantID", tenantID, "userID", userID, "role", role)
}

func ensureGateway(ctx context.Context, r *repos, tenantID int64, name, token string, isPlatform bool) *domain.Gateway {
	// For platform gateways list with tenantID=0, list returns all platform gateways.
	gws, _, _ := r.gateways.List(ctx, tenantID, domain.ListParams{Page: 1, Size: 0})
	for _, g := range gws {
		if g.Name == name && g.IsPlatform == isPlatform {
			slog.Info("Gateway already exists", "name", name)
			return g
		}
	}
	gw := &domain.Gateway{TenantID: tenantID, Name: name, Token: token, IsPlatform: isPlatform}
	if err := r.gateways.Create(ctx, gw); err != nil {
		slog.Error("Failed to create gateway", "name", name, "error", err)
		os.Exit(1)
	}
	slog.Info("Created gateway", "name", name, "is_platform", isPlatform)
	return gw
}

func ensureDataSource(ctx context.Context, r *repos, tenantID, gatewayID int64, name, dsType, dsn string, isPlatform bool) *domain.DataSource {
	if existing, err := r.dataSources.GetByName(ctx, tenantID, name); err == nil && existing != nil {
		slog.Info("DataSource already exists", "name", name)
		return existing
	}
	ds := &domain.DataSource{
		TenantID: tenantID, Name: name, Type: dsType, IsPlatform: isPlatform,
		Envs: []*domain.DataSourceEnv{{Env: "prod", DSN: dsn, GatewayID: gatewayID}},
	}
	if err := r.dataSources.Create(ctx, ds); err != nil {
		slog.Error("Failed to create datasource", "name", name, "error", err)
		os.Exit(1)
	}
	slog.Info("Created datasource", "name", name)
	return ds
}

func ensureProject(ctx context.Context, r *repos, tenantID int64, slug, name, desc string) *domain.Project {
	if existing, err := r.projects.GetByName(ctx, tenantID, name); err == nil && existing != nil {
		slog.Info("Project already exists", "name", name)
		return existing
	}
	proj := &domain.Project{TenantID: tenantID, Slug: slug, Name: name, Description: desc}
	if err := r.projects.Create(ctx, proj); err != nil {
		slog.Error("Failed to create project", "name", name, "error", err)
		os.Exit(1)
	}
	slog.Info("Created project", "name", name)
	return proj
}

func ensureGroups(ctx context.Context, r *repos, tenantID, projectID int64, defs []struct{ name, desc string }) map[string]int64 {
	ids := make(map[string]int64)
	for _, g := range defs {
		if existing, err := r.groups.GetByName(ctx, tenantID, projectID, g.name); err == nil && existing != nil {
			ids[g.name] = existing.ID
			continue
		}
		ag := &domain.APIGroup{TenantID: tenantID, ProjectID: projectID, Name: g.name, Description: g.desc}
		if err := r.groups.Create(ctx, ag); err != nil {
			slog.Error("Failed to create group", "name", g.name, "error", err)
			os.Exit(1)
		}
		ids[g.name] = ag.ID
	}
	return ids
}

func ensureEndpoints(ctx context.Context, r *repos, tenantID, projectID, publisherID int64, eps []*domain.APIEndpoint) {
	created := 0
	for _, ep := range eps {
		method := ""
		if len(ep.Methods) > 0 {
			method = ep.Methods[0]
		}
		existing, err := r.endpoints.GetByPathAndMethod(ctx, tenantID, projectID, ep.Path, method)
		if err != nil || existing == nil {
			if err := r.endpoints.Create(ctx, ep); err != nil {
				slog.Error("Failed to create endpoint", "path", ep.Path, "error", err)
				os.Exit(1)
			}
			existing = ep
			created++
		}
		if existing.Status != "published" {
			if _, err := r.releases.Publish(ctx, tenantID, existing.ID, publisherID, "初始发布", 10); err != nil {
				slog.Error("Failed to publish endpoint", "path", ep.Path, "error", err)
				os.Exit(1)
			}
		}
	}
	slog.Info("Endpoints checked/created/published", "created", created, "total", len(eps))
}

// ── platform scripts ──────────────────────────────────────────────────────────

type platformScripts struct {
	pagination     *domain.Script
	stdResponse    *domain.Script
	detailResponse *domain.Script
	writeResponse  *domain.Script
}

func seedPlatformScripts(ctx context.Context, r *repos) platformScripts {
	type def struct {
		ptr   **domain.Script
		name  string
		stype string
		desc  string
		code  string
	}

	var ps platformScripts
	defs := []def{
		{&ps.pagination, "分页参数处理", "pre",
			"支持 is_pager=0/1 控制分页，自动换算 limit/offset 或移除 LIMIT 子句",
			`// 前置脚本 — 分页参数处理
function main(params) {
  var isPager = Number(params.is_pager) !== 0;
  if (isPager) {
    var page = Number(params.page || 1);
    var size = Number(params.size || 10);
    params.limit = String(size);
    params.offset = String((page - 1) * size);
  }
  return params;
}`},
		{&ps.stdResponse, "标准列表响应", "post",
			"包装为 { code, data: { list, pagination }, msg } 格式，支持分页/不分页",
			`// 后置脚本 — 列表响应包装
function main(data, params) {
  var isPager = Number(params.is_pager) !== 0;
  var total = Number(params._total || data.length);
  if (isPager) {
    return { code: 0, data: { list: data, pagination: { is_pager: 1, page: Number(params.page || 1), size: Number(params.size || 10), total: total } }, msg: "请求成功" };
  }
  return { code: 0, data: { list: data, pagination: { is_pager: 0, page: 1, size: total, total: total } }, msg: "请求成功" };
}`},
		{&ps.detailResponse, "详情响应", "post",
			"包装为 { code, data: 单条记录, msg } 格式",
			`// 后置脚本 — 详情响应
function main(data, params) {
  return { code: 0, data: data.length > 0 ? data[0] : null, msg: data.length > 0 ? "请求成功" : "数据不存在" };
}`},
		{&ps.writeResponse, "写操作响应", "post",
			"包装为 { code, data: { affected_rows }, msg } 格式",
			`// 后置脚本 — 写操作响应
function main(data, params) {
  var affected = data.length > 0 ? data[0].affected_rows : 0;
  return { code: 0, data: { affected_rows: affected }, msg: affected > 0 ? "操作成功" : "无数据变更" };
}`},
	}

	for _, d := range defs {
		if existing, err := r.scripts.GetByName(ctx, 0, d.name); err == nil && existing != nil {
			*d.ptr = existing
			continue
		}
		s := &domain.Script{IsPlatform: true, Name: d.name, Type: d.stype, Description: d.desc, Code: d.code}
		if err := r.scripts.Create(ctx, s); err != nil {
			slog.Error("Failed to create platform script", "name", d.name, "error", err)
			os.Exit(1)
		}
		*d.ptr = s
		slog.Info("Created platform script", "name", d.name)
	}
	slog.Info("Platform scripts ready")
	return ps
}

// ── main seed ─────────────────────────────────────────────────────────────────

func seed(ctx context.Context,
	users *postgres.UserRepo, tenants *postgres.TenantRepo, tenantUsers *postgres.TenantUserRepo,
	gatewaySvc service.GatewayService,
	projects *postgres.ProjectRepo, dataSources *postgres.DataSourceRepo,
	scripts *postgres.ScriptRepo, groups *postgres.APIGroupRepo, endpoints *postgres.APIEndpointRepo,
	releaseSvc service.EndpointReleaseService,
) {
	r := &repos{
		users: users, tenants: tenants, tenantUsers: tenantUsers,
		gateways: gatewaySvc, projects: projects, dataSources: dataSources,
		scripts: scripts, groups: groups, endpoints: endpoints, releases: releaseSvc,
	}

	superadmin := ensureUser(ctx, r, "superadmin@owlapi.cn", "SuperAdmin", "superadmin123", true)

	ps := seedPlatformScripts(ctx, r)

	// 平台内置网关：不属于任何租户，所有租户共享
	gwToken := os.Getenv("OWLAPI_GATEWAY_TOKEN")
	gw := ensureGateway(ctx, r, 0, "内置网关", gwToken, true)

	defaultTenant := seedEcommerce(ctx, r, ps, gw)
	seedCMS(ctx, r, ps, gw)

	// superadmin 关联到 default 租户，确保登录后能看到数据
	ensureTenantUser(ctx, r, defaultTenant.ID, superadmin.ID, domain.RoleAdmin)

	slog.Info("🦉 Seed completed!")
}

// ── tenant 1: 研发中心 / ecommerce ────────────────────────────────────────────

func seedEcommerce(ctx context.Context, r *repos, ps platformScripts, gw *domain.Gateway) *domain.Tenant {
	tenant := ensureTenant(ctx, r, "default", "研发中心")
	admin := ensureUser(ctx, r, "admin@owlapi.cn", "Admin", "admin123", false)
	ensureTenantUser(ctx, r, tenant.ID, admin.ID, domain.RoleAdmin)
	ds := ensureDataSource(ctx, r, tenant.ID, gw.ID, "内置 SQLite (电商)", "sqlite", "/data/owlapi_ecommerce_demo.db", true)
	proj := ensureProject(ctx, r, tenant.ID, "ecommerce", "电商平台 API", "经典电商场景演示：用户、商品、订单的完整 CRUD 接口")

	t, p, d := tenant.ID, proj.ID, ds.ID

	groupIDs := ensureGroups(ctx, r, t, p, []struct{ name, desc string }{
		{"用户管理", "用户账户与权限设置"},
		{"商品中心", "产品目录与库存管理"},
		{"订单中心", "交易记录与履约流程"},
		{"数据统计", "业务指标与报表分析"},
	})

	pre := ps.pagination.ID
	postList := ps.stdResponse.ID
	postDetail := ps.detailResponse.ID
	postWrite := ps.writeResponse.ID

	pagerDefs := []domain.ParamDef{
		{Name: "page", Type: "integer", Default: "1", Desc: "页码"},
		{Name: "size", Type: "integer", Default: "10", Desc: "每页条数"},
		{Name: "is_pager", Type: "integer", Default: "1", Desc: "是否分页：1/0"},
	}

	ensureEndpoints(ctx, r, t, p, 0, []*domain.APIEndpoint{
		// 用户
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["用户管理"], Path: "/api/users", Methods: []string{"GET"},
			Summary: "获取用户列表", SQL: "SELECT id, name, email, role, created_at FROM users ORDER BY id LIMIT :limit OFFSET :offset",
			Params: []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs, PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Methods: []string{"GET"},
			Summary: "获取用户详情", SQL: "SELECT id, name, email, role, created_at FROM users WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["用户管理"], Path: "/api/users", Methods: []string{"POST"},
			Summary: "创建用户", SQL: "INSERT INTO users (name, email, role) VALUES (:name, :email, :role)",
			Params: []string{"name", "email", "role"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "用户姓名"},
				{Name: "email", Type: "string", Required: true, Desc: "邮箱地址"},
				{Name: "role", Type: "string", Default: "user", Desc: "角色：admin / user / viewer"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Methods: []string{"PUT"},
			Summary: "更新用户信息", SQL: "UPDATE users SET name = :name, email = :email, role = :role WHERE id = :id",
			Params: []string{"id", "name", "email", "role"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"},
				{Name: "name", Type: "string", Required: true, Desc: "用户姓名"},
				{Name: "email", Type: "string", Required: true, Desc: "邮箱地址"},
				{Name: "role", Type: "string", Default: "user", Desc: "角色"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Methods: []string{"DELETE"},
			Summary: "删除用户", SQL: "DELETE FROM users WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"}}},

		// 商品
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products", Methods: []string{"GET"},
			Summary: "获取商品列表", SQL: "SELECT id, name, price, stock, category FROM products ORDER BY id LIMIT :limit OFFSET :offset",
			Params: []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs, PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products/search", Methods: []string{"GET"},
			Summary: "搜索商品", SQL: "SELECT id, name, price, stock, category FROM products WHERE category = :category AND price >= :min_price AND price <= :max_price ORDER BY id LIMIT :limit OFFSET :offset",
			Params: []string{"category", "min_price", "max_price", "page", "size", "is_pager"}, PreScriptID: pre, PostScriptID: postList,
			ParamDefs: []domain.ParamDef{
				{Name: "category", Type: "string", Required: true, Default: "electronics", Desc: "分类"},
				{Name: "min_price", Type: "number", Default: "0", Desc: "最低价格"},
				{Name: "max_price", Type: "number", Default: "99999", Desc: "最高价格"},
				{Name: "page", Type: "integer", Default: "1"}, {Name: "size", Type: "integer", Default: "10"}, {Name: "is_pager", Type: "integer", Default: "1"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products/:id", Methods: []string{"GET"},
			Summary: "获取商品详情", SQL: "SELECT id, name, price, stock, category FROM products WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products", Methods: []string{"POST"},
			Summary: "创建商品", SQL: "INSERT INTO products (name, price, stock, category) VALUES (:name, :price, :stock, :category)",
			Params: []string{"name", "price", "stock", "category"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "商品名称"},
				{Name: "price", Type: "number", Required: true, Desc: "价格"},
				{Name: "stock", Type: "integer", Default: "0", Desc: "初始库存"},
				{Name: "category", Type: "string", Default: "electronics", Desc: "分类"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products/:id/stock", Methods: []string{"PUT"},
			Summary: "更新库存", SQL: "UPDATE products SET stock = :stock WHERE id = :id",
			Params: []string{"id", "stock"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "stock", Type: "integer", Required: true, Default: "100", Desc: "新库存"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["商品中心"], Path: "/api/products/:id", Methods: []string{"DELETE"},
			Summary: "删除商品", SQL: "DELETE FROM products WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"}}},

		// 订单
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["订单中心"], Path: "/api/orders", Methods: []string{"GET"},
			Summary: "获取订单列表", SQL: "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id ORDER BY o.id DESC LIMIT :limit OFFSET :offset",
			Params: []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs, PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["订单中心"], Path: "/api/orders", Methods: []string{"POST"},
			Summary: "创建订单", SQL: "INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES (:user_id, :product_id, :quantity, :total, 'pending')",
			Params: []string{"user_id", "product_id", "quantity", "total"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "user_id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"},
				{Name: "product_id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "quantity", Type: "integer", Required: true, Default: "1", Desc: "数量"},
				{Name: "total", Type: "number", Required: true, Desc: "总金额"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Methods: []string{"GET"},
			Summary: "获取订单详情", SQL: "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE o.id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Methods: []string{"PUT"},
			Summary: "更新订单状态", SQL: "UPDATE orders SET status = :status WHERE id = :id",
			Params: []string{"id", "status"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"},
				{Name: "status", Type: "string", Required: true, Default: "shipped", Desc: "状态：pending / paid / shipped / completed / cancelled"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Methods: []string{"DELETE"},
			Summary: "删除订单", SQL: "DELETE FROM orders WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"}}},

		// 统计
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["数据统计"], Path: "/api/stats/revenue", Methods: []string{"GET"},
			Summary: "分类销售统计", SQL: "SELECT p.category, COUNT(o.id) AS order_count, SUM(o.total) AS revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.category ORDER BY revenue DESC",
			PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["数据统计"], Path: "/api/stats/top-customers", Methods: []string{"GET"},
			Summary: "用户消费排行", SQL: "SELECT u.name, u.email, COUNT(o.id) AS orders, SUM(o.total) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.name, u.email ORDER BY total_spent DESC",
			PostScriptID: postList},
	})
	return tenant
}

// ── tenant 2: 内容平台 / cms ──────────────────────────────────────────────────

func seedCMS(ctx context.Context, r *repos, ps platformScripts, sharedGW *domain.Gateway) {
	tenant := ensureTenant(ctx, r, "media", "内容平台")
	editor := ensureUser(ctx, r, "editor@owlapi.cn", "Editor", "editor123", false)
	ensureTenantUser(ctx, r, tenant.ID, editor.ID, domain.RoleAdmin)
	gw := sharedGW
	ds := ensureDataSource(ctx, r, tenant.ID, gw.ID, "内置 SQLite (内容)", "sqlite", "/data/owlapi_cms_demo.db", true)
	proj := ensureProject(ctx, r, tenant.ID, "cms", "内容管理 API", "文章、分类、标签与评论的完整内容管理接口")

	t, p, d := tenant.ID, proj.ID, ds.ID

	groupIDs := ensureGroups(ctx, r, t, p, []struct{ name, desc string }{
		{"文章管理", "文章的创建、编辑与发布"},
		{"分类标签", "内容分类与标签体系"},
		{"评论管理", "用户评论的审核与管理"},
	})

	pre := ps.pagination.ID
	postList := ps.stdResponse.ID
	postDetail := ps.detailResponse.ID
	postWrite := ps.writeResponse.ID

	pagerDefs := []domain.ParamDef{
		{Name: "page", Type: "integer", Default: "1", Desc: "页码"},
		{Name: "size", Type: "integer", Default: "10", Desc: "每页条数"},
		{Name: "is_pager", Type: "integer", Default: "1", Desc: "是否分页：1/0"},
	}

	ensureEndpoints(ctx, r, t, p, 0, []*domain.APIEndpoint{
		// 文章
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["文章管理"], Path: "/api/articles", Methods: []string{"GET"},
			Summary: "获取文章列表", SQL: "SELECT id, title, summary, author_id, category_id, status, created_at FROM articles ORDER BY id DESC LIMIT :limit OFFSET :offset",
			Params: []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs, PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Methods: []string{"GET"},
			Summary: "获取文章详情", SQL: "SELECT a.id, a.title, a.content, a.summary, a.status, a.created_at, c.name AS category FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["文章管理"], Path: "/api/articles", Methods: []string{"POST"},
			Summary: "创建文章", SQL: "INSERT INTO articles (title, content, summary, author_id, category_id, status) VALUES (:title, :content, :summary, :author_id, :category_id, :status)",
			Params: []string{"title", "content", "summary", "author_id", "category_id", "status"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "title", Type: "string", Required: true, Desc: "文章标题"},
				{Name: "content", Type: "string", Required: true, Desc: "正文内容（Markdown）"},
				{Name: "summary", Type: "string", Desc: "摘要"},
				{Name: "author_id", Type: "integer", Required: true, Default: "1", Desc: "作者 ID"},
				{Name: "category_id", Type: "integer", Default: "1", Desc: "分类 ID"},
				{Name: "status", Type: "string", Default: "draft", Desc: "状态：draft / published"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Methods: []string{"PUT"},
			Summary: "更新文章", SQL: "UPDATE articles SET title = :title, content = :content, summary = :summary, status = :status WHERE id = :id",
			Params: []string{"id", "title", "content", "summary", "status"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"},
				{Name: "title", Type: "string", Required: true, Desc: "标题"},
				{Name: "content", Type: "string", Required: true, Desc: "正文"},
				{Name: "summary", Type: "string", Desc: "摘要"},
				{Name: "status", Type: "string", Default: "draft", Desc: "状态：draft / published"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Methods: []string{"DELETE"},
			Summary: "删除文章", SQL: "DELETE FROM articles WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}},

		// 分类
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["分类标签"], Path: "/api/categories", Methods: []string{"GET"},
			Summary: "获取分类列表", SQL: "SELECT id, name, slug, description FROM categories ORDER BY id",
			PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["分类标签"], Path: "/api/categories", Methods: []string{"POST"},
			Summary: "创建分类", SQL: "INSERT INTO categories (name, slug, description) VALUES (:name, :slug, :description)",
			Params: []string{"name", "slug", "description"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "分类名称"},
				{Name: "slug", Type: "string", Required: true, Desc: "URL 标识"},
				{Name: "description", Type: "string", Desc: "描述"},
			}},

		// 标签
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["分类标签"], Path: "/api/tags", Methods: []string{"GET"},
			Summary: "获取标签列表", SQL: "SELECT id, name, slug FROM tags ORDER BY id",
			PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["分类标签"], Path: "/api/tags", Methods: []string{"POST"},
			Summary: "创建标签", SQL: "INSERT INTO tags (name, slug) VALUES (:name, :slug)",
			Params: []string{"name", "slug"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "标签名称"},
				{Name: "slug", Type: "string", Required: true, Desc: "URL 标识"},
			}},

		// 评论
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["评论管理"], Path: "/api/articles/:id/comments", Methods: []string{"GET"},
			Summary: "获取文章评论", SQL: "SELECT id, article_id, author_name, content, status, created_at FROM comments WHERE article_id = :id ORDER BY id DESC LIMIT :limit OFFSET :offset",
			Params:      []string{"id", "page", "size", "is_pager"},
			ParamDefs:   append([]domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}, pagerDefs...),
			PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["评论管理"], Path: "/api/articles/:id/comments", Methods: []string{"POST"},
			Summary: "发表评论", SQL: "INSERT INTO comments (article_id, author_name, content, status) VALUES (:id, :author_name, :content, 'pending')",
			Params: []string{"id", "author_name", "content"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"},
				{Name: "author_name", Type: "string", Required: true, Desc: "评论者名称"},
				{Name: "content", Type: "string", Required: true, Desc: "评论内容"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["评论管理"], Path: "/api/comments/:id", Methods: []string{"DELETE"},
			Summary: "删除评论", SQL: "DELETE FROM comments WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "评论 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupIDs["评论管理"], Path: "/api/comments/:id/approve", Methods: []string{"PUT"},
			Summary: "审核通过评论", SQL: "UPDATE comments SET status = 'approved' WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "评论 ID"}}},
	})
}
