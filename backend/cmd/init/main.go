package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/bulolo/owlapi/internal/config"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/edition"
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

	// 取 installation_id → 定 edition → 跑 EE 迁移（顺序同 server，见 cmd/server/main.go 说明）。
	installationID, err := db.EnsureInstallationID(ctx)
	if err != nil {
		slog.Warn("failed to resolve installation_id", "err", err)
	}
	edition.Init(cfg.Edition, cfg.LicenseKey, installationID)
	if err := db.MigrateEE(); err != nil {
		slog.Error("Failed to run EE migrations", "error", err)
		os.Exit(1)
	}

	users := &postgres.UserRepo{DB: db}
	tenants := &postgres.TenantRepo{DB: db}
	tenantUsers := &postgres.TenantUserRepo{DB: db}
	gatewayRepo := &postgres.GatewayRepo{DB: db}
	gatewaySvc := service.NewGatewayService(gatewayRepo)
	endpointRepo := &postgres.APIEndpointRepo{DB: db}
	versionRepo := &postgres.EndpointVersionRepo{DB: db}
	activeVersionRepo := &postgres.EndpointActiveVersionRepo{DB: db}
	activationLogRepo := &postgres.EndpointActivationLogRepo{DB: db}
	scriptRepo := &postgres.ScriptRepo{DB: db}
	dsRepo := &postgres.DataSourceRepo{DB: db}
	envRepo := &postgres.ProjectEnvironmentRepo{DB: db}
	bindingRepo := &postgres.EndpointDatasourceBindingRepo{DB: db}
	versionSvc := service.NewEndpointVersionService(versionRepo, activeVersionRepo, activationLogRepo, endpointRepo, scriptRepo, dsRepo)
	envSvc := service.NewEnvironmentService(envRepo, bindingRepo, activeVersionRepo, dsRepo)

	seed(ctx, users, tenants, tenantUsers, gatewaySvc,
		&postgres.ProjectRepo{DB: db},
		dsRepo,
		scriptRepo,
		&postgres.APIGroupRepo{DB: db},
		endpointRepo,
		activeVersionRepo,
		versionSvc,
		envSvc,
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
	users         *postgres.UserRepo
	tenants       *postgres.TenantRepo
	tenantUsers   *postgres.TenantUserRepo
	gateways      service.GatewayService
	projects      *postgres.ProjectRepo
	dataSources   *postgres.DataSourceRepo
	scripts       *postgres.ScriptRepo
	groups        *postgres.APIGroupRepo
	endpoints     *postgres.APIEndpointRepo
	activeVersion *postgres.EndpointActiveVersionRepo
	versions      service.EndpointVersionService
	envs          service.EnvironmentService
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
	t := &domain.Tenant{Name: name, Slug: slug, Status: domain.TenantActive, MaxReleaseVersions: 5, CreatedAt: now, UpdatedAt: now}
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
		DSN: dsn, GatewayID: gatewayID,
	}
	if err := r.dataSources.Create(ctx, ds); err != nil {
		slog.Error("Failed to create datasource", "name", name, "error", err)
		os.Exit(1)
	}
	slog.Info("Created datasource", "name", name)
	return ds
}

// ensureProjectEnvAndBinding makes sure the project has its default "prod" env
// and binds the default "main" alias to the supplied datasource. Returns the env.
func ensureProjectEnvAndBinding(ctx context.Context, r *repos, tenantID, projectID, datasourceID int64) *domain.ProjectEnvironment {
	env, err := r.envs.CreateInitial(ctx, tenantID, projectID)
	if err != nil {
		slog.Error("Failed to create initial env", "project_id", projectID, "error", err)
		os.Exit(1)
	}
	if err := r.envs.UpsertBinding(ctx, tenantID, env.ID, "main", datasourceID); err != nil {
		slog.Error("Failed to bind main alias", "env_id", env.ID, "error", err)
		os.Exit(1)
	}
	return env
}

// ensureBinding upserts a (env, alias) → datasource binding. Used to register
// extra aliases beyond "main" on the same env (e.g. an "analytics" alias
// pointing at a warehouse DB).
func ensureBinding(ctx context.Context, r *repos, tenantID, envID int64, alias string, datasourceID int64) {
	if err := r.envs.UpsertBinding(ctx, tenantID, envID, alias, datasourceID); err != nil {
		slog.Error("Failed to upsert alias binding", "env_id", envID, "alias", alias, "error", err)
		os.Exit(1)
	}
	slog.Info("Bound alias", "env_id", envID, "alias", alias, "datasource_id", datasourceID)
}

// ensureExtraEnv 创建一个非默认 env（如 "dev"），并复制 prod 的 alias 绑定。
// 用户进 demo 项目第一眼就能看到多 env 模型 + 现成的绑定，不需要自己摸索。
// 故意不把 endpoint 上线到这个 env——让用户去版本管理里手动点"上线到 dev"，
// 体验两段式发布流程。
func ensureExtraEnv(ctx context.Context, r *repos, tenantID, projectID int64, name string, srcEnvID int64) *domain.ProjectEnvironment {
	if existing, _ := r.envs.GetByName(ctx, tenantID, projectID, name); existing != nil {
		slog.Info("Env already exists", "project_id", projectID, "name", name)
		return existing
	}
	// copy_from = srcEnvID, copy_bindings = true 让 dev 复用 prod 的物理库（demo 简化）
	env, err := r.envs.Create(ctx, tenantID, projectID, name, false, srcEnvID, true)
	if err != nil {
		slog.Error("Failed to create extra env", "name", name, "error", err)
		os.Exit(1)
	}
	slog.Info("Created extra env", "name", name, "project_id", projectID)
	return env
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

// ensureEndpoints 两段式发布：CreateVersion 拍快照，再对每个 env 执行 Activate。
// 多个 env 共用同一个版本 ID，流水统一显示"切换到 vN"，语义一致。
func ensureEndpoints(ctx context.Context, r *repos, tenant *domain.Tenant, projectID, publisherID int64, envIDs []int64, eps []*domain.APIEndpoint) {
	created := 0
	for _, ep := range eps {
		needsVersion := false
		versionMsg := "seed: 初始版本（由系统初始化脚本创建）"

		existing, err := r.endpoints.GetByPathAndMethod(ctx, tenant.ID, projectID, ep.Path, ep.Method)
		if err != nil || existing == nil {
			if err := r.endpoints.Create(ctx, ep); err != nil {
				slog.Error("Failed to create endpoint", "path", ep.Path, "error", err)
				os.Exit(1)
			}
			existing = ep
			created++
			needsVersion = true
		} else {
			needsBackfill := false
			if len(existing.ResponseDefs) == 0 && len(ep.ResponseDefs) > 0 {
				existing.ResponseDefs = ep.ResponseDefs
				needsBackfill = true
			}
			if len(ep.PostScripts) > 0 && len(existing.PostScripts) == 0 {
				existing.PostScripts = ep.PostScripts
				needsBackfill = true
			}
			if needsBackfill {
				if err := r.endpoints.Update(ctx, existing); err != nil {
					slog.Warn("Failed to backfill endpoint", "path", ep.Path, "error", err)
				} else {
					needsVersion = true
					versionMsg = "seed: 补充字段定义与脚本配置"
				}
			}
		}

		// 任一 env 尚无激活版本时补发
		if !needsVersion {
			for _, envID := range envIDs {
				if _, err := r.activeVersion.Get(ctx, tenant.ID, existing.ID, envID); err != nil {
					needsVersion = true
					break
				}
			}
		}

		if needsVersion {
			// 建一个版本快照，然后对每个 env 各记一条 publish 流水。
			v, err := r.versions.Publish(ctx, tenant.ID, existing.ID, envIDs[0], publisherID, versionMsg, tenant.MaxReleaseVersions)
			if err != nil {
				slog.Error("Failed to publish version", "path", ep.Path, "error", err)
				os.Exit(1)
			}
			for _, envID := range envIDs[1:] {
				if err := r.versions.PublishToEnv(ctx, tenant.ID, existing.ID, envID, v.ID, v.Version, publisherID); err != nil {
					slog.Error("Failed to publish to env", "path", ep.Path, "env", envID, "error", err)
					os.Exit(1)
				}
			}
		}
	}
	slog.Info("Endpoints checked/created/activated", "created", created, "total", len(eps))
}

// lib builds a chain step that references a library script by ID.
func lib(id int64) domain.ScriptStep {
	return domain.ScriptStep{Source: domain.ScriptStepLibrary, ScriptID: id}
}

// copyBuiltinsToTenant 把平台内置脚本复制进某个租户的脚本库（幂等：已存在同名副本则复用），
// 返回指向「租户副本」的 platformScripts，供接口引用各自租户的副本而非平台原件。
func copyBuiltinsToTenant(ctx context.Context, r *repos, tenantID int64, ps platformScripts) platformScripts {
	cp := func(src *domain.Script) *domain.Script {
		if src == nil {
			return nil
		}
		if existing, _ := r.scripts.GetByName(ctx, tenantID, src.Name); existing != nil {
			return existing
		}
		c := &domain.Script{TenantID: tenantID, Name: src.Name, Type: src.Type, Code: src.Code, Description: src.Description}
		if err := r.scripts.Create(ctx, c); err != nil {
			slog.Error("Failed to copy builtin into tenant library", "tenant", tenantID, "name", src.Name, "error", err)
			os.Exit(1)
		}
		return c
	}
	return platformScripts{
		paramValidation: cp(ps.paramValidation),
		pagination:      cp(ps.pagination),
		pagerValidation: cp(ps.pagerValidation),
		stdResponse:     cp(ps.stdResponse),
		detailResponse:  cp(ps.detailResponse),
		writeResponse:   cp(ps.writeResponse),
	}
}

// ── platform scripts ──────────────────────────────────────────────────────────

type platformScripts struct {
	pagination      *domain.Script
	pagerValidation *domain.Script
	stdResponse     *domain.Script
	detailResponse  *domain.Script
	writeResponse   *domain.Script
	paramValidation *domain.Script
}

func seedPlatformScripts(ctx context.Context, r *repos) platformScripts {
	type def struct {
		ptr     **domain.Script
		name    string
		oldName string // non-empty triggers a rename from oldName → name
		stype   string
		desc    string
		code    string
	}

	var ps platformScripts
	defs := []def{
		{
			ptr: &ps.paramValidation, name: "参数校验模板", oldName: "参数校验示例", stype: "pre",
			desc: "通用参数校验模板：复制到接口后，按需填写顶部 rules（必填 / 最大长度 / 正整数），校验逻辑自动套用。默认 rules 为空（直接引用时不校验任何字段）。失败 return { error } 中断——字符串默认 400，对象 { status, message } 可自定义状态码。",
			code: `// 前置脚本 — 参数校验模板（复制到接口后填写下方 rules）
// 失败时 return { error } 中断：字符串 → 400，{ status, message } → 自定义状态码
function main(params) {
  var rules = {
    required: [],    // 必填字段，如 ["keyword"]
    maxLength: {},   // 最大长度，如 { keyword: 50 }
    positiveInt: [], // 须为正整数的字段，如 ["age"]
  };

  for (var i = 0; i < rules.required.length; i++) {
    var r = rules.required[i];
    if (!params[r]) return { error: r + " 不能为空" };
  }
  for (var f in rules.maxLength) {
    if (params[f] && params[f].length > rules.maxLength[f]) {
      return { error: f + " 长度不能超过 " + rules.maxLength[f] + " 个字符" };
    }
  }
  for (var j = 0; j < rules.positiveInt.length; j++) {
    var k = rules.positiveInt[j], v = params[k];
    if (v !== undefined && v !== "" && (isNaN(parseInt(v, 10)) || parseInt(v, 10) < 1)) {
      return { error: { status: 422, message: k + " 必须为正整数" } };
    }
  }
  return params;
}`,
		},
		{
			ptr: &ps.pagination, name: "分页参数处理", stype: "pre",
			desc: "支持 is_pager=0/1 控制分页，自动换算 limit/offset；is_pager=0 时清除 limit/offset 防止误触发",
			code: `// 前置脚本 — 分页参数处理
// is_pager: "1" 或未传 = 分页；"0" = 不分页
function main(params) {
  var isPager = params.is_pager !== "0";
  if (!isPager) {
    delete params.limit;
    delete params.offset;
    return params;
  }
  var page = Math.max(1, parseInt(params.page, 10) || 1);
  var size = Math.max(1, parseInt(params.size, 10) || 10);
  params.limit = String(size);
  params.offset = String((page - 1) * size);
  return params;
}`,
		},
		{
			ptr: &ps.pagerValidation, name: "分页参数校验", stype: "pre",
			desc: "校验列表接口通用的分页参数 page / size（须为正整数，size 不超过 1000）；is_pager=0（全量）时 page/size 不参与查询，故跳过校验。可多接口直接引用，失败 422。",
			code: `// 前置脚本 — 分页参数校验（通用，可多接口直接引用）
// 只校验所有列表接口共有的 page / size，与具体业务字段无关，故适合放库复用。
function main(params) {
  // is_pager=0 为全量模式：page/size 不参与查询，无需校验
  if (params.is_pager === "0") {
    return params;
  }
  if (params.page !== undefined && params.page !== "") {
    var page = parseInt(params.page, 10);
    if (isNaN(page) || page < 1) {
      return { error: { status: 422, message: "page 必须为正整数" } };
    }
  }
  if (params.size !== undefined && params.size !== "") {
    var size = parseInt(params.size, 10);
    if (isNaN(size) || size < 1) {
      return { error: { status: 422, message: "size 必须为正整数" } };
    }
    if (size > 1000) {
      return { error: { status: 422, message: "size 不能超过 1000（如需全量请传 is_pager=0）" } };
    }
  }
  return params;
}`,
		},
		{
			ptr: &ps.stdResponse, name: "标准分页列表响应", oldName: "标准列表响应", stype: "post",
			desc: "包装为 { code, data: { list, pagination }, msg } 格式，支持分页/不分页",
			code: `// 后置脚本 — 列表响应包装
// is_pager: "1" 或未传 = 分页；"0" = 不分页
function main(data, params) {
  var isPager = params.is_pager !== "0";
  if (isPager) {
    return {
      code: 0,
      data: {
        list: data,
        pagination: {
          is_pager: 1,
          page: Math.max(1, parseInt(params.page, 10) || 1),
          size: Math.max(1, parseInt(params.size, 10) || 10),
          total: Number(params._total || 0),
        },
      },
      msg: "请求成功",
    };
  }
  return {
    code: 0,
    data: {
      list: data,
      pagination: {
        is_pager: 0,
        page: 1,
        size: data.length,
        total: data.length,
      },
    },
    msg: "请求成功",
  };
}
// schema() 声明本接口的响应结构，仅用于生成接口文档与 SDK 类型，不参与运行时执行。
// 字段值用类型名占位（"integer" / "string" / "boolean"），对象表示嵌套结构，
// 数组用 [] 表示（[] 内为空时元素结构由实际数据推断）。
function schema() {
  return {
    code: "integer",
    data: {
      list: [],
      pagination: {
        is_pager: "integer",
        page: "integer",
        size: "integer",
        total: "integer",
      },
    },
    msg: "string",
  };
}`,
		},
		{
			ptr: &ps.detailResponse, name: "详情响应", stype: "post",
			desc: "包装为 { code, data: 单条记录, msg } 格式",
			code: `// 后置脚本 — 详情响应
function main(data, params) {
  return {
    code: 0,
    data: data.length > 0 ? data[0] : null,
    msg: data.length > 0 ? "请求成功" : "数据不存在",
  };
}
// schema() 声明本接口的响应结构，仅用于生成接口文档与 SDK 类型，不参与运行时执行。
// data 为单条记录，字段随 SQL 而变，故用 {} 表示对象、不固定其内部结构。
function schema() {
  return { code: "integer", data: {}, msg: "string" };
}`,
		},
		{
			ptr: &ps.writeResponse, name: "写操作响应", stype: "post",
			desc: "包装为 { code, data: {}, msg } 格式，affected_rows 仅用于判断消息文案",
			code: `// 后置脚本 — 写操作响应
function main(data, params) {
  var affected = data.length > 0 ? data[0].affected_rows : 0;
  return {
    code: 0,
    data: {},
    msg: affected > 0 ? "操作成功" : "无数据变更",
  };
}
// schema() 声明本接口的响应结构，仅用于生成接口文档与 SDK 类型，不参与运行时执行。
// 写操作不回传记录，data 固定为空对象，故用 {} 表示。
function schema() {
  return { code: "integer", data: {}, msg: "string" };
}`,
		},
	}

	for _, d := range defs {
		// Try lookup by current name first.
		existing, err := r.scripts.GetByName(ctx, 0, d.name)
		if err != nil || existing == nil {
			// Try the old name (rename case).
			if d.oldName != "" {
				existing, err = r.scripts.GetByName(ctx, 0, d.oldName)
			}
		}
		if err == nil && existing != nil {
			needsUpdate := existing.Code != d.code || existing.Name != d.name || existing.Description != d.desc
			if needsUpdate {
				existing.Name = d.name
				existing.Code = d.code
				existing.Description = d.desc
				if err := r.scripts.UpdatePlatform(ctx, existing); err != nil {
					slog.Error("Failed to update platform script", "name", d.name, "error", err)
					os.Exit(1)
				}
				slog.Info("Updated platform script", "name", d.name)
			}
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
	activeVersion *postgres.EndpointActiveVersionRepo,
	versionSvc service.EndpointVersionService,
	envSvc service.EnvironmentService,
) {
	r := &repos{
		users: users, tenants: tenants, tenantUsers: tenantUsers,
		gateways: gatewaySvc, projects: projects, dataSources: dataSources,
		scripts: scripts, groups: groups, endpoints: endpoints,
		activeVersion: activeVersion, versions: versionSvc, envs: envSvc,
	}

	// SuperAdmin 是平台级身份（users.is_superadmin = true），与 tenant_users 是正交的：
	//   • RequireTenantRole 中间件自动豁免超管，无需 tenant_users 表行
	//   • /my/tenants 对超管返回全租户列表
	// 因此这里只建超管账号，不需要往 tenant_users 里塞虚假的"admin"记录。
	_ = ensureUser(ctx, r, "superadmin@owlapi.cn", "SuperAdmin", "superadmin123", true)

	ps := seedPlatformScripts(ctx, r)

	// 平台内置网关：不属于任何租户，所有租户共享
	gwToken := os.Getenv("OWLAPI_GATEWAY_TOKEN")
	gw := ensureGateway(ctx, r, 0, "内置网关", gwToken, true)

	seedEcommerce(ctx, r, ps, gw)
	// 第二个示例租户：仅已授权时 seed；未授权（社区版）只保留 default（默认组织）单租户。
	if edition.IsLicensed() {
		seedCMS(ctx, r, ps, gw)
	}

	slog.Info("🦉 Seed completed!")
}

// ── tenant 1: 研发中心 / ecommerce ────────────────────────────────────────────

func seedEcommerce(ctx context.Context, r *repos, ps platformScripts, gw *domain.Gateway) *domain.Tenant {
	// default 租户统一用通用名「默认组织」（CE/EE 一致）；EE 多租户演示的第二个租户仍叫「内容平台」。
	tenant := ensureTenant(ctx, r, "default", "默认组织")
	admin := ensureUser(ctx, r, "admin@owlapi.cn", "Admin", "admin123", false)
	ensureTenantUser(ctx, r, tenant.ID, admin.ID, domain.RoleAdmin)

	// 演示"一个项目跨两个库"的场景：业务库 (main) 跑 OLTP，数仓库 (analytics) 跑统计。
	dsMain := ensureDataSource(ctx, r, tenant.ID, gw.ID, "内置 SQLite (电商-业务)", "sqlite", "/data/owlapi_ecommerce_demo.db", true)
	dsWarehouse := ensureDataSource(ctx, r, tenant.ID, gw.ID, "内置 SQLite (电商-数仓)", "sqlite", "/data/owlapi_ecommerce_warehouse_demo.db", true)
	proj := ensureProject(ctx, r, tenant.ID, "ecommerce", "电商平台 API", "经典电商场景演示：用户/商品/订单 (业务库) + 统计聚合 (数仓库)")

	t, p := tenant.ID, proj.ID
	// main alias → 业务库；同时再绑一个 analytics alias → 数仓库。
	env := ensureProjectEnvAndBinding(ctx, r, t, p, dsMain.ID)
	ensureBinding(ctx, r, t, env.ID, "analytics", dsWarehouse.ID)
	devEnv := ensureExtraEnv(ctx, r, t, p, "dev", env.ID)

	groupIDs := ensureGroups(ctx, r, t, p, []struct{ name, desc string }{
		{"用户管理", "用户账户与权限设置"},
		{"商品中心", "产品目录与库存管理"},
		{"订单中心", "交易记录与履约流程"},
		{"数据统计", "业务指标与报表分析"},
	})

	// 把平台内置脚本复制进本租户库，接口引用各自的副本（而非平台原件）。
	tps := copyBuiltinsToTenant(ctx, r, t, ps)
	pre := []domain.ScriptStep{lib(tps.pagerValidation.ID), lib(tps.pagination.ID)}
	postList := []domain.ScriptStep{lib(tps.stdResponse.ID)}
	postDetail := []domain.ScriptStep{lib(tps.detailResponse.ID)}
	postWrite := []domain.ScriptStep{lib(tps.writeResponse.ID)}

	// 演示「用户列表」接口的两条两步链（前置链 + 后置链各 2 个脚本）：
	//   前置链：内联 参数校验 → 库 分页参数处理
	//   后置链：内联 邮箱脱敏 → 库 标准分页列表响应
	// 校验只限制每页条数（默认 size=10 不受影响），保证 demo 开箱即用。
	validateSize := domain.ScriptStep{Source: domain.ScriptStepInline, Name: "参数校验", Code: `// 前置脚本 — 参数校验（接口专属，内联）
// 分页模式下限制每页条数；is_pager=0（全量）不限制
function main(params) {
  if (params.is_pager !== "0" && Number(params.size) > 1000) {
    return { error: { status: 422, message: "size 不能超过 1000" } };
  }
  return params;
}`}
	maskEmail := domain.ScriptStep{Source: domain.ScriptStepInline, Name: "邮箱脱敏", Code: `// 后置脚本 — 邮箱脱敏（接口专属，内联）
// data 为 SQL 结果行数组，处理后交给链尾的「标准分页列表响应」包装
function main(data, params) {
  return data.map(function (row) {
    if (row.email) {
      row.email = row.email.replace(/^(.).*(@.*)$/, "$1***$2");
    }
    return row;
  });
}`}
	preUsers := []domain.ScriptStep{validateSize, lib(tps.pagination.ID)}
	postListMasked := []domain.ScriptStep{maskEmail, lib(tps.stdResponse.ID)}

	pagerDefs := []domain.ParamDef{
		{Name: "page", Type: "integer", Default: "1", Desc: "页码"},
		{Name: "size", Type: "integer", Default: "10", Desc: "每页条数"},
		{Name: "is_pager", Type: "integer", Default: "1", Desc: "是否分页：1/0"},
	}
	// 全量接口（预聚合统计）：固定 is_pager=0，「标准分页列表响应」据此走全量分支。
	fullDefs := []domain.ParamDef{
		{Name: "is_pager", Type: "integer", Default: "0", Desc: "是否分页：0=全量"},
	}

	writeResp := []domain.ResponseDef{{Name: "affected_rows", Type: "integer"}}
	userFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "name", Type: "string"},
		{Name: "email", Type: "string"}, {Name: "role", Type: "string"},
		{Name: "created_at", Type: "string"},
	}
	productFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "name", Type: "string"},
		{Name: "price", Type: "number"}, {Name: "stock", Type: "integer"},
		{Name: "category", Type: "string"},
	}
	orderFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "customer", Type: "string"},
		{Name: "product", Type: "string"}, {Name: "quantity", Type: "integer"},
		{Name: "total", Type: "number"}, {Name: "status", Type: "string"},
		{Name: "created_at", Type: "string"},
	}
	revenueFields := []domain.ResponseDef{
		{Name: "category", Type: "string"}, {Name: "order_count", Type: "integer"},
		{Name: "revenue", Type: "number"},
	}
	topCustomerFields := []domain.ResponseDef{
		{Name: "name", Type: "string"}, {Name: "email", Type: "string"},
		{Name: "orders", Type: "integer"}, {Name: "total_spent", Type: "number"},
		{Name: "rank", Type: "integer"},
	}
	dailyRevenueFields := []domain.ResponseDef{
		{Name: "day", Type: "string"}, {Name: "order_count", Type: "integer"},
		{Name: "revenue", Type: "number"},
	}

	eps := []*domain.APIEndpoint{
		// 用户
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["用户管理"], Path: "/api/users", Method: "GET",
			Summary: "获取用户列表", SQL: "SELECT id, name, email, role, created_at FROM users ORDER BY id LIMIT :limit OFFSET :offset",
			ParamDefs: pagerDefs, PreScripts: preUsers, PostScripts: postListMasked,
			ResponseDefs: userFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Method: "GET",
			Summary: "获取用户详情", SQL: "SELECT id, name, email, role, created_at FROM users WHERE id = :id",
			PostScripts: postDetail, ResponseDefs: userFields,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["用户管理"], Path: "/api/users", Method: "POST",
			Summary: "创建用户", SQL: "INSERT INTO users (name, email, role) VALUES (:name, :email, :role)",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "用户姓名"},
				{Name: "email", Type: "string", Required: true, Desc: "邮箱地址"},
				{Name: "role", Type: "string", Default: "user", Desc: "角色：admin / user / viewer"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Method: "PUT",
			Summary: "更新用户信息", SQL: "UPDATE users SET name = :name, email = :email, role = :role WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"},
				{Name: "name", Type: "string", Required: true, Desc: "用户姓名"},
				{Name: "email", Type: "string", Required: true, Desc: "邮箱地址"},
				{Name: "role", Type: "string", Default: "user", Desc: "角色"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["用户管理"], Path: "/api/users/:id", Method: "DELETE",
			Summary: "删除用户", SQL: "DELETE FROM users WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"}}},

		// 商品
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products", Method: "GET",
			Summary: "获取商品列表", SQL: "SELECT id, name, price, stock, category FROM products ORDER BY id LIMIT :limit OFFSET :offset",
			ParamDefs: pagerDefs, PreScripts: pre, PostScripts: postList,
			ResponseDefs: productFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products/search", Method: "GET",
			Summary: "搜索商品", SQL: "SELECT id, name, price, stock, category FROM products WHERE category = :category AND price >= :min_price AND price <= :max_price ORDER BY id LIMIT :limit OFFSET :offset",
			PreScripts: pre, PostScripts: postList,
			ResponseDefs: productFields,
			ParamDefs: []domain.ParamDef{
				{Name: "category", Type: "string", Required: true, Default: "electronics", Desc: "分类"},
				{Name: "min_price", Type: "number", Default: "0", Desc: "最低价格"},
				{Name: "max_price", Type: "number", Default: "99999", Desc: "最高价格"},
				{Name: "page", Type: "integer", Default: "1"}, {Name: "size", Type: "integer", Default: "10"}, {Name: "is_pager", Type: "integer", Default: "1"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products/:id", Method: "GET",
			Summary: "获取商品详情", SQL: "SELECT id, name, price, stock, category FROM products WHERE id = :id",
			PostScripts: postDetail, ResponseDefs: productFields,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products", Method: "POST",
			Summary: "创建商品", SQL: "INSERT INTO products (name, price, stock, category) VALUES (:name, :price, :stock, :category)",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "商品名称"},
				{Name: "price", Type: "number", Required: true, Desc: "价格"},
				{Name: "stock", Type: "integer", Default: "0", Desc: "初始库存"},
				{Name: "category", Type: "string", Default: "electronics", Desc: "分类"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products/:id/stock", Method: "PUT",
			Summary: "更新库存", SQL: "UPDATE products SET stock = :stock WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "stock", Type: "integer", Required: true, Default: "100", Desc: "新库存"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["商品中心"], Path: "/api/products/:id", Method: "DELETE",
			Summary: "删除商品", SQL: "DELETE FROM products WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"}}},

		// 订单
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["订单中心"], Path: "/api/orders", Method: "GET",
			Summary: "获取订单列表", SQL: "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id ORDER BY o.id DESC LIMIT :limit OFFSET :offset",
			ParamDefs: pagerDefs, PreScripts: pre, PostScripts: postList,
			ResponseDefs: orderFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["订单中心"], Path: "/api/orders", Method: "POST",
			Summary: "创建订单", SQL: "INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES (:user_id, :product_id, :quantity, :total, 'pending')",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "user_id", Type: "integer", Required: true, Default: "1", Desc: "用户 ID"},
				{Name: "product_id", Type: "integer", Required: true, Default: "1", Desc: "商品 ID"},
				{Name: "quantity", Type: "integer", Required: true, Default: "1", Desc: "数量"},
				{Name: "total", Type: "number", Required: true, Desc: "总金额"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Method: "GET",
			Summary: "获取订单详情", SQL: "SELECT o.id, u.name AS customer, p.name AS product, o.quantity, o.total, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE o.id = :id",
			PostScripts: postDetail, ResponseDefs: orderFields,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Method: "PUT",
			Summary: "更新订单状态", SQL: "UPDATE orders SET status = :status WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"},
				{Name: "status", Type: "string", Required: true, Default: "shipped", Desc: "状态：pending / paid / shipped / completed / cancelled"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["订单中心"], Path: "/api/orders/:id", Method: "DELETE",
			Summary: "删除订单", SQL: "DELETE FROM orders WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "订单 ID"}}},

		// 统计 — 走 analytics 别名（数仓库），与业务库（main）拆开
		// 统计接口是预聚合全量结果，不分页；用 postList 返回完整列表，is_pager=0 表示全量模式
		{TenantID: t, ProjectID: p, DataSourceAlias: "analytics", GroupID: groupIDs["数据统计"], Path: "/api/stats/revenue", Method: "GET",
			Summary: "分类销售统计（数仓预聚合）", SQL: "SELECT category, order_count, revenue FROM category_sales ORDER BY revenue DESC",
			ParamDefs: fullDefs, PostScripts: postList, ResponseDefs: revenueFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "analytics", GroupID: groupIDs["数据统计"], Path: "/api/stats/top-customers", Method: "GET",
			Summary: "用户消费排行（数仓预聚合）", SQL: "SELECT user_name AS name, email, orders, total_spent, rank FROM customer_rank ORDER BY rank",
			ParamDefs: fullDefs, PostScripts: postList, ResponseDefs: topCustomerFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "analytics", GroupID: groupIDs["数据统计"], Path: "/api/stats/daily-revenue", Method: "GET",
			Summary: "每日营收趋势（数仓预聚合）", SQL: "SELECT day, order_count, revenue FROM daily_revenue ORDER BY day",
			ParamDefs: fullDefs, PostScripts: postList, ResponseDefs: dailyRevenueFields},
	}
	ensureEndpoints(ctx, r, tenant, p, admin.ID, []int64{env.ID, devEnv.ID}, eps)
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

	t, p := tenant.ID, proj.ID
	env := ensureProjectEnvAndBinding(ctx, r, t, p, ds.ID)

	groupIDs := ensureGroups(ctx, r, t, p, []struct{ name, desc string }{
		{"文章管理", "文章的创建、编辑与发布"},
		{"分类标签", "内容分类与标签体系"},
		{"评论管理", "用户评论的审核与管理"},
	})

	// 把平台内置脚本复制进本租户库，接口引用各自的副本（而非平台原件）。
	tps := copyBuiltinsToTenant(ctx, r, t, ps)
	pre := []domain.ScriptStep{lib(tps.pagerValidation.ID), lib(tps.pagination.ID)}
	postList := []domain.ScriptStep{lib(tps.stdResponse.ID)}
	postDetail := []domain.ScriptStep{lib(tps.detailResponse.ID)}
	postWrite := []domain.ScriptStep{lib(tps.writeResponse.ID)}

	pagerDefs := []domain.ParamDef{
		{Name: "page", Type: "integer", Default: "1", Desc: "页码"},
		{Name: "size", Type: "integer", Default: "10", Desc: "每页条数"},
		{Name: "is_pager", Type: "integer", Default: "1", Desc: "是否分页：1/0"},
	}

	writeResp := []domain.ResponseDef{{Name: "affected_rows", Type: "integer"}}
	articleListFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "title", Type: "string"},
		{Name: "summary", Type: "string"}, {Name: "author_id", Type: "integer"},
		{Name: "category_id", Type: "integer"}, {Name: "status", Type: "string"},
		{Name: "created_at", Type: "string"},
	}
	articleDetailFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "title", Type: "string"},
		{Name: "content", Type: "string"}, {Name: "summary", Type: "string"},
		{Name: "status", Type: "string"}, {Name: "created_at", Type: "string"},
		{Name: "category", Type: "string"},
	}
	categoryFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "name", Type: "string"},
		{Name: "slug", Type: "string"}, {Name: "description", Type: "string"},
	}
	tagFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "name", Type: "string"},
		{Name: "slug", Type: "string"},
	}
	commentFields := []domain.ResponseDef{
		{Name: "id", Type: "integer"}, {Name: "article_id", Type: "integer"},
		{Name: "author_name", Type: "string"}, {Name: "content", Type: "string"},
		{Name: "status", Type: "string"}, {Name: "created_at", Type: "string"},
	}

	cmsEps := []*domain.APIEndpoint{
		// 文章
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["文章管理"], Path: "/api/articles", Method: "GET",
			Summary: "获取文章列表", SQL: "SELECT id, title, summary, author_id, category_id, status, created_at FROM articles ORDER BY id DESC LIMIT :limit OFFSET :offset",
			ParamDefs: pagerDefs, PreScripts: pre, PostScripts: postList,
			ResponseDefs: articleListFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Method: "GET",
			Summary: "获取文章详情", SQL: "SELECT a.id, a.title, a.content, a.summary, a.status, a.created_at, c.name AS category FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.id = :id",
			PostScripts: postDetail, ResponseDefs: articleDetailFields,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["文章管理"], Path: "/api/articles", Method: "POST",
			Summary: "创建文章", SQL: "INSERT INTO articles (title, content, summary, author_id, category_id, status) VALUES (:title, :content, :summary, :author_id, :category_id, :status)",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "title", Type: "string", Required: true, Desc: "文章标题"},
				{Name: "content", Type: "string", Required: true, Desc: "正文内容（Markdown）"},
				{Name: "summary", Type: "string", Desc: "摘要"},
				{Name: "author_id", Type: "integer", Required: true, Default: "1", Desc: "作者 ID"},
				{Name: "category_id", Type: "integer", Default: "1", Desc: "分类 ID"},
				{Name: "status", Type: "string", Default: "draft", Desc: "状态：draft / published"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Method: "PUT",
			Summary: "更新文章", SQL: "UPDATE articles SET title = :title, content = :content, summary = :summary, status = :status WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"},
				{Name: "title", Type: "string", Required: true, Desc: "标题"},
				{Name: "content", Type: "string", Required: true, Desc: "正文"},
				{Name: "summary", Type: "string", Desc: "摘要"},
				{Name: "status", Type: "string", Default: "draft", Desc: "状态：draft / published"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["文章管理"], Path: "/api/articles/:id", Method: "DELETE",
			Summary: "删除文章", SQL: "DELETE FROM articles WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}},

		// 分类
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["分类标签"], Path: "/api/categories", Method: "GET",
			Summary: "获取分类列表", SQL: "SELECT id, name, slug, description FROM categories ORDER BY id",
			PostScripts: postList, ResponseDefs: categoryFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["分类标签"], Path: "/api/categories", Method: "POST",
			Summary: "创建分类", SQL: "INSERT INTO categories (name, slug, description) VALUES (:name, :slug, :description)",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "分类名称"},
				{Name: "slug", Type: "string", Required: true, Desc: "URL 标识"},
				{Name: "description", Type: "string", Desc: "描述"},
			}},

		// 标签
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["分类标签"], Path: "/api/tags", Method: "GET",
			Summary: "获取标签列表", SQL: "SELECT id, name, slug FROM tags ORDER BY id",
			PostScripts: postList, ResponseDefs: tagFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["分类标签"], Path: "/api/tags", Method: "POST",
			Summary: "创建标签", SQL: "INSERT INTO tags (name, slug) VALUES (:name, :slug)",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "name", Type: "string", Required: true, Desc: "标签名称"},
				{Name: "slug", Type: "string", Required: true, Desc: "URL 标识"},
			}},

		// 评论
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["评论管理"], Path: "/api/articles/:id/comments", Method: "GET",
			Summary: "获取文章评论", SQL: "SELECT id, article_id, author_name, content, status, created_at FROM comments WHERE article_id = :id ORDER BY id DESC LIMIT :limit OFFSET :offset",
			ParamDefs:  append([]domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"}}, pagerDefs...),
			PreScripts: pre, PostScripts: postList, ResponseDefs: commentFields},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["评论管理"], Path: "/api/articles/:id/comments", Method: "POST",
			Summary: "发表评论", SQL: "INSERT INTO comments (article_id, author_name, content, status) VALUES (:id, :author_name, :content, 'pending')",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{
				{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "文章 ID"},
				{Name: "author_name", Type: "string", Required: true, Desc: "评论者名称"},
				{Name: "content", Type: "string", Required: true, Desc: "评论内容"},
			}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["评论管理"], Path: "/api/comments/:id", Method: "DELETE",
			Summary: "删除评论", SQL: "DELETE FROM comments WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "评论 ID"}}},
		{TenantID: t, ProjectID: p, DataSourceAlias: "main", GroupID: groupIDs["评论管理"], Path: "/api/comments/:id/approve", Method: "PUT",
			Summary: "审核通过评论", SQL: "UPDATE comments SET status = 'approved' WHERE id = :id",
			PostScripts: postWrite, ResponseDefs: writeResp,
			ParamDefs: []domain.ParamDef{{Name: "id", Type: "integer", Required: true, Default: "1", Desc: "评论 ID"}}},
	}
	ensureEndpoints(ctx, r, tenant, p, editor.ID, []int64{env.ID}, cmsEps)
}
