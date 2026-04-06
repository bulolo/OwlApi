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
	now := time.Now()

	superadmin := &domain.User{
		Email: "superadmin@owlapi.cn", Name: "SuperAdmin",
		PasswordHash: hashPwd("superadmin123"), IsSuperAdmin: true,
		CreatedAt: now, UpdatedAt: now,
	}
	if existing, _ := users.GetByEmail(ctx, superadmin.Email); existing == nil {
		if err := users.Create(ctx, superadmin); err != nil {
			slog.Error("Failed to create superadmin", "error", err)
			os.Exit(1)
		}
		slog.Info("Created superadmin", "id", superadmin.ID, "email", superadmin.Email)
	} else {
		superadmin = existing
		slog.Info("Superadmin already exists", "id", superadmin.ID)
	}

	tenant := &domain.Tenant{
		Name: "研发中心", Slug: "default",
		Plan: domain.PlanFree, Status: domain.TenantActive,
		CreatedAt: now, UpdatedAt: now,
	}
	if existing, _ := tenants.GetBySlug(ctx, tenant.Slug); existing == nil {
		if err := tenants.Create(ctx, tenant); err != nil {
			slog.Error("Failed to create default tenant", "error", err)
			os.Exit(1)
		}
		slog.Info("Created default tenant", "id", tenant.ID, "slug", tenant.Slug)
	} else {
		tenant = existing
		slog.Info("Default tenant already exists", "id", tenant.ID)
	}

	admin := &domain.User{
		Email: "admin@owlapi.cn", Name: "Admin",
		PasswordHash: hashPwd("admin123"), IsSuperAdmin: false,
		CreatedAt: now, UpdatedAt: now,
	}
	if existing, _ := users.GetByEmail(ctx, admin.Email); existing == nil {
		if err := users.Create(ctx, admin); err != nil {
			slog.Error("Failed to create tenant admin", "error", err)
			os.Exit(1)
		}
		slog.Info("Created tenant admin", "id", admin.ID, "email", admin.Email)
	} else {
		admin = existing
		slog.Info("Tenant admin already exists", "id", admin.ID)
	}

	if _, err := tenantUsers.GetByTenantAndUser(ctx, tenant.ID, admin.ID); err != nil {
		if err := tenantUsers.Create(ctx, &domain.TenantUser{
			TenantID: tenant.ID, UserID: admin.ID, Role: domain.RoleAdmin, JoinedAt: now,
		}); err != nil {
			slog.Error("Failed to add tenant admin user", "error", err)
			os.Exit(1)
		}
		slog.Info("Added tenant admin user", "user", admin.Email, "tenant", tenant.Slug)
	} else {
		slog.Info("Tenant admin association already exists")
	}

	gw := &domain.Gateway{
		TenantID: tenant.ID,
		Name:     "内置网关",
		Token:    os.Getenv("OWLAPI_GATEWAY_TOKEN"),
	}
	// Note: GatewayRepository doesn't have GetByName, but we can list and check
	gws, _ := gatewaySvc.List(ctx, tenant.ID)
	var foundGw *domain.Gateway
	for _, g := range gws {
		if g.Name == gw.Name {
			foundGw = g
			break
		}
	}
	if foundGw == nil {
		if err := gatewaySvc.Create(ctx, gw); err != nil {
			slog.Error("Failed to create dev gateway", "error", err)
			os.Exit(1)
		}
		slog.Info("Created dev gateway", "id", gw.ID, "token", gw.Token)
	} else {
		gw = foundGw
		slog.Info("Dev gateway already exists", "id", gw.ID)
	}
	t := tenant.ID

	// 5. 内置演示数据源
	ds := &domain.DataSource{
		TenantID: t,
		Name:     "内置 SQLite",
		IsDual:   false,
		Type:     "sqlite",
		Envs: []*domain.DataSourceEnv{
			{Env: "prod", DSN: "/data/owlapi_demo.db", GatewayID: gw.ID},
		},
	}
	if existing, err := projects.GetDataSourceByName(ctx, t, ds.Name); err == nil && existing != nil {
		ds = existing
		slog.Info("Demo datasource already exists", "id", ds.ID)
	} else {
		if err := projects.CreateDataSource(ctx, ds); err != nil {
			slog.Error("Failed to create demo datasource", "error", err)
			os.Exit(1)
		}
		slog.Info("Created demo datasource", "id", ds.ID)
	}

	// 6. 演示项目
	proj := &domain.Project{
		TenantID:    t,
		Name:        "电商平台 API",
		Description: "经典电商场景演示：用户、商品、订单的完整 CRUD 接口",
	}
	if existing, err := projects.GetProjectByName(ctx, t, proj.Name); err == nil && existing != nil {
		proj = existing
		slog.Info("Demo project already exists", "id", proj.ID)
	} else {
		if err := projects.CreateProject(ctx, proj); err != nil {
			slog.Error("Failed to create demo project", "error", err)
			os.Exit(1)
		}
		slog.Info("Created demo project", "id", proj.ID)
	}
	p, d := proj.ID, ds.ID

	// 7. 预设脚本
	scriptPagination := &domain.Script{
		TenantID: t, Name: "分页参数处理", Type: "pre",
		Description: "支持 is_pager=0/1 控制分页，自动换算 limit/offset 或移除 LIMIT 子句",
		Code: `// 前置脚本 — 分页参数处理
// 入参: params = { page, size, is_pager, ... }
// is_pager: 0 不分页(返回全部) / 1 分页(默认)
// 不注入 limit/offset 时，引擎自动去掉 SQL 中的 LIMIT 子句
function main(params) {
  var isPager = Number(params.is_pager) !== 0;
  if (isPager) {
    var page = Number(params.page || 1);
    var size = Number(params.size || 10);
    params.limit = String(size);
    params.offset = String((page - 1) * size);
  }
  return params;
}`,
	}
	if existing, err := projects.GetScriptByName(ctx, t, scriptPagination.Name); err == nil && existing != nil {
		scriptPagination = existing
		slog.Info("Pagination script already exists", "id", scriptPagination.ID)
	} else {
		if err := projects.CreateScript(ctx, scriptPagination); err != nil {
			slog.Error("Failed to create pagination script", "error", err)
			os.Exit(1)
		}
		slog.Info("Created pagination script", "id", scriptPagination.ID)
	}

	scriptStdResponse := &domain.Script{
		TenantID: t, Name: "标准列表响应", Type: "post",
		Description: "包装为 { code, data: { list, pagination }, msg } 格式，支持分页/不分页",
		Code: `// 后置脚本 — 列表响应包装
// data: SQL 查询结果数组
// params: 请求参数（引擎自动注入 _total 为真实总数）
function main(data, params) {
  var isPager = Number(params.is_pager) !== 0;
  var total = Number(params._total || data.length);

  if (isPager) {
    return {
      code: 0,
      data: {
        list: data,
        pagination: {
          is_pager: 1,
          page: Number(params.page || 1),
          size: Number(params.size || 10),
          total: total
        }
      },
      msg: "请求成功"
    };
  }

  return {
    code: 0,
    data: {
      list: data,
      pagination: {
        is_pager: 0,
        page: 1,
        size: total,
        total: total
      }
    },
    msg: "请求成功"
  };
}`,
	}
	if existing, err := projects.GetScriptByName(ctx, t, scriptStdResponse.Name); err == nil && existing != nil {
		scriptStdResponse = existing
		slog.Info("Std response script already exists", "id", scriptStdResponse.ID)
	} else {
		if err := projects.CreateScript(ctx, scriptStdResponse); err != nil {
			slog.Error("Failed to create std response script", "error", err)
			os.Exit(1)
		}
		slog.Info("Created std response script", "id", scriptStdResponse.ID)
	}

	scriptDetailResponse := &domain.Script{
		TenantID: t, Name: "详情响应", Type: "post",
		Description: "包装为 { code, data: 单条记录, msg } 格式",
		Code: `// 后置脚本 — 详情响应
//
// 原始 data: [{ "id": 1, "name": "张三", ... }]  (通常一条)
// 查无数据时 data 为空数组 []
//
function main(data, params) {
  return {
    code: 0,
    data: data.length > 0 ? data[0] : null,
    msg: data.length > 0 ? "请求成功" : "数据不存在"
  };
}`,
	}
	if existing, err := projects.GetScriptByName(ctx, t, scriptDetailResponse.Name); err == nil && existing != nil {
		scriptDetailResponse = existing
		slog.Info("Detail response script already exists", "id", scriptDetailResponse.ID)
	} else {
		if err := projects.CreateScript(ctx, scriptDetailResponse); err != nil {
			slog.Error("Failed to create detail response script", "error", err)
			os.Exit(1)
		}
		slog.Info("Created detail response script", "id", scriptDetailResponse.ID)
	}

	scriptWriteResponse := &domain.Script{
		TenantID: t, Name: "写操作响应", Type: "post",
		Description: "包装为 { code, data: { affected_rows }, msg } 格式",
		Code: `// 后置脚本 — 写操作响应
//
// 原始 data: [{ "affected_rows": 1 }]
// affected_rows=0 表示没有匹配的数据被修改/删除
//
function main(data, params) {
  var affected = data.length > 0 ? data[0].affected_rows : 0;
  return {
    code: 0,
    data: { affected_rows: affected },
    msg: affected > 0 ? "操作成功" : "无数据变更"
  };
}`,
	}
	if existing, err := projects.GetScriptByName(ctx, t, scriptWriteResponse.Name); err == nil && existing != nil {
		scriptWriteResponse = existing
		slog.Info("Write response script already exists", "id", scriptWriteResponse.ID)
	} else {
		if err := projects.CreateScript(ctx, scriptWriteResponse); err != nil {
			slog.Error("Failed to create write response script", "error", err)
			os.Exit(1)
		}
		slog.Info("Created write response script", "id", scriptWriteResponse.ID)
	}

	slog.Info("Demo scripts checked/created")

	// 8. 演示 API 分组
	demoGroups := []*domain.APIGroup{
		{TenantID: t, ProjectID: p, Name: "用户管理", Description: "用户账户与权限设置"},
		{TenantID: t, ProjectID: p, Name: "商品中心", Description: "产品目录与库存管理"},
		{TenantID: t, ProjectID: p, Name: "订单中心", Description: "交易记录与履约流程"},
		{TenantID: t, ProjectID: p, Name: "数据统计", Description: "业务指标与报表分析"},
	}

	groupsByID := make(map[string]int64)
	for _, g := range demoGroups {
		if existing, err := projects.GetAPIGroupByName(ctx, t, p, g.Name); err == nil && existing != nil {
			groupsByID[g.Name] = existing.ID
			slog.Info("Demo group already exists", "name", g.Name, "id", existing.ID)
		} else {
			if err := projects.CreateAPIGroup(ctx, g); err != nil {
				slog.Error("Failed to create demo group", "name", g.Name, "error", err)
				os.Exit(1)
			}
			groupsByID[g.Name] = g.ID
			slog.Info("Created demo group", "name", g.Name, "id", g.ID)
		}
	}

	// 9. 演示 API 接口
	pre := scriptPagination.ID
	postList := scriptStdResponse.ID
	postDetail := scriptDetailResponse.ID
	postWrite := scriptWriteResponse.ID

	pagerDefs := []domain.ParamDef{
		{Name: "page", Type: "integer", Required: false, Default: "1", Desc: "页码，默认 1"},
		{Name: "size", Type: "integer", Required: false, Default: "10", Desc: "每页条数，默认 10"},
		{Name: "is_pager", Type: "integer", Required: false, Default: "1", Desc: "是否分页：1 分页(默认) / 0 不分页"},
	}

	demoEndpoints := []*domain.APIEndpoint{
		// ---- 用户 ----
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["用户管理"], Path: "/api/users/list", Methods: []string{"POST"},
			Summary: "获取用户列表", Description: "返回用户列表，支持分页",
			SQL:         "SELECT id, name, email, role, created_at FROM users ORDER BY id LIMIT :limit OFFSET :offset",
			Params:      []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs,
			PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["用户管理"], Path: "/api/users/detail", Methods: []string{"POST"},
			Summary: "获取用户详情", Description: "根据 ID 查询单个用户信息",
			SQL:    "SELECT id, name, email, role, created_at FROM users WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["用户管理"], Path: "/api/users/create", Methods: []string{"POST"},
			Summary: "创建用户", Description: "新增一个用户",
			SQL:    "INSERT INTO users (name, email, role) VALUES (:name, :email, :role)",
			Params: []string{"name", "email", "role"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "用户姓名"},
				{Name: "email", Type: "string", Required: true, Desc: "邮箱地址"},
				{Name: "role", Type: "string", Required: false, Default: "user", Desc: "角色：admin / user / viewer"},
			}},

		// ---- 商品 ----
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["商品中心"], Path: "/api/products/list", Methods: []string{"POST"},
			Summary: "获取商品列表", Description: "返回商品列表，支持分页",
			SQL:         "SELECT id, name, price, stock, category FROM products ORDER BY id LIMIT :limit OFFSET :offset",
			Params:      []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs,
			PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["商品中心"], Path: "/api/products/detail", Methods: []string{"POST"},
			Summary: "获取商品详情", Description: "根据 ID 查询单个商品信息",
			SQL:    "SELECT id, name, price, stock, category FROM products WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["商品中心"], Path: "/api/products/search", Methods: []string{"POST"},
			Summary: "搜索商品", Description: "按分类和价格区间筛选商品，支持分页",
			SQL:         "SELECT id, name, price, stock, category FROM products WHERE category = :category AND price >= :min_price AND price <= :max_price ORDER BY id LIMIT :limit OFFSET :offset",
			Params:      []string{"category", "min_price", "max_price", "page", "size", "is_pager"},
			PreScriptID: pre, PostScriptID: postList,
			ParamDefs: []domain.ParamDef{
				{Name: "category", Type: "string", Required: true, Default: "electronics", Desc: "分类：electronics / peripherals / books"},
				{Name: "min_price", Type: "number", Required: false, Default: "0", Desc: "最低价格"},
				{Name: "max_price", Type: "number", Required: false, Default: "99999", Desc: "最高价格"},
				{Name: "page", Type: "integer", Required: false, Default: "1", Desc: "页码，默认 1"},
				{Name: "size", Type: "integer", Required: false, Default: "10", Desc: "每页条数，默认 10"},
				{Name: "is_pager", Type: "integer", Required: false, Default: "1", Desc: "是否分页：1 分页(默认) / 0 不分页"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["商品中心"], Path: "/api/products/update-stock", Methods: []string{"POST"},
			Summary: "更新库存", Description: "修改指定商品的库存数量",
			SQL:    "UPDATE products SET stock = :stock WHERE id = :id",
			Params: []string{"id", "stock"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "stock", Type: "integer", Required: true, Default: "100", Desc: "新库存数量"},
			}},

		// ---- 订单 ----
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["订单中心"], Path: "/api/orders/list", Methods: []string{"POST"},
			Summary: "获取订单列表", Description: "返回订单列表（含用户和商品信息），支持分页",
			SQL:         "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id ORDER BY o.id DESC LIMIT :limit OFFSET :offset",
			Params:      []string{"page", "size", "is_pager"}, ParamDefs: pagerDefs,
			PreScriptID: pre, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["订单中心"], Path: "/api/orders/detail", Methods: []string{"POST"},
			Summary: "获取订单详情", Description: "根据 ID 查询单个订单（含关联信息）",
			SQL:    "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE o.id = :id",
			Params: []string{"id"}, PostScriptID: postDetail,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["订单中心"], Path: "/api/orders/create", Methods: []string{"POST"},
			Summary: "创建订单", Description: "新增订单，状态默认 pending",
			SQL:    "INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES (:user_id, :product_id, :quantity, :total, 'pending')",
			Params: []string{"user_id", "product_id", "quantity", "total"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "user_id", Type: "integer", Required: true, Default: "1", Desc: "下单用户 ID"},
				{Name: "product_id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "quantity", Type: "integer", Required: true, Default: "1", Desc: "购买数量"},
				{Name: "total", Type: "number", Required: true, Desc: "订单总金额"},
			}},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["订单中心"], Path: "/api/orders/delete", Methods: []string{"POST"},
			Summary: "删除订单", Description: "根据 ID 删除订单",
			SQL:    "DELETE FROM orders WHERE id = :id",
			Params: []string{"id"}, PostScriptID: postWrite,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"},
			}},

		// ---- 统计 ----
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["数据统计"], Path: "/api/stats/revenue", Methods: []string{"POST"},
			Summary: "分类销售统计", Description: "按商品分类统计订单数和销售额",
			SQL:    "SELECT p.category, COUNT(o.id) AS order_count, SUM(o.total) AS revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.category ORDER BY revenue DESC",
			Params: []string{}, PostScriptID: postList},
		{TenantID: t, ProjectID: p, DataSourceID: d, GroupID: groupsByID["数据统计"], Path: "/api/stats/top-customers", Methods: []string{"POST"},
			Summary: "用户消费排行", Description: "按消费总额降序排列",
			SQL:    "SELECT u.name, u.email, COUNT(o.id) AS orders, SUM(o.total) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.name, u.email ORDER BY total_spent DESC",
			Params: []string{}, PostScriptID: postList},
	}

	for _, ep := range demoEndpoints {
		if existing, err := projects.GetAPIEndpointByPath(ctx, t, ep.Path); err == nil && existing != nil {
			slog.Info("Demo endpoint already exists", "path", ep.Path, "id", existing.ID)
			continue
		}
		if err := projects.CreateAPIEndpoint(ctx, ep); err != nil {
			slog.Error("Failed to create demo endpoint", "path", ep.Path, "error", err)
			os.Exit(1)
		}
	}
	slog.Info("Created demo API endpoints", "count", len(demoEndpoints))

	slog.Info("🦉 Seed completed!")
}
