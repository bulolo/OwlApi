# ==============================================================================
# Makefile - OwlApi 项目管理脚本
# ==============================================================================
# 支持环境: macOS, Linux, WSL2
# 核心功能: 开发环境启停, 生产环境部署, 代码生成, 项目清理
# ==============================================================================

.PHONY: help \
	dev-init dev-up dev-down dev-build dev-rebuild dev-restart dev-restart-backend dev-logs dev-logs-backend dev-clean dev-db-psql \
	prod-init prod-up prod-up-build prod-down prod-rebuild prod-restart prod-logs prod-clean check-prod-env \
	gen-proto gen-sdk clean \
 publish-ce-github

# ------------------------------------------------------------------------------
# 1. 跨平台配置 (Cross-Platform Config)
# ------------------------------------------------------------------------------
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    SED_I := sed -i ''
else
    SED_I := sed -i
endif

DEV_COMPOSE  := docker compose -f docker-compose.dev.yml
PROD_COMPOSE := docker compose -f deploy/docker-compose.yml

# ------------------------------------------------------------------------------
# 2. 帮助信息 (Help)
# ------------------------------------------------------------------------------
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " 🦉 OwlApi - SQL to API 智能网关平台"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " 💻 系统检测: $(UNAME_S)"
	@echo ""
	@echo " 🛠️  [开发环境] (Development Environment)"
	@echo "  make dev-init            初始化开发环境配置 (复制 .env.example)"
	@echo "  make dev-up              启动全栈热更新环境 (前台运行, 查看日志)"
	@echo "  make dev-down            停止开发容器"
	@echo "  make dev-build           构建开发镜像"
	@echo "  make dev-rebuild         重建并启动开发环境 (后台运行)"
	@echo "  make dev-restart         重启开发环境所有服务"
	@echo "  make dev-restart-backend 仅重启后端服务 (backend)"
	@echo "  make dev-logs            查看开发环境所有服务日志"
	@echo "  make dev-logs-backend    查看开发环境后端日志"
	@echo "  make dev-clean           停止容器并删除数据卷 (重置数据库)"
	@echo "  make dev-db-psql         进入开发环境数据库终端"
	@echo ""
	@echo " 🚀 [生产环境] (Production Environment)"
	@echo "  make prod-init           初始化生产环境配置"
	@echo "  make prod-up             启动生产集群 (后台运行, 拉取远端镜像)"
	@echo "  make prod-up-build       启动生产集群并在本地构建"
	@echo "  make prod-rebuild        无缓存重新构建并启动生产环境"
	@echo "  make prod-down           停止生产集群"
	@echo "  make prod-restart        重启生产环境所有服务"
	@echo "  make prod-logs           查看生产环境日志"
	@echo "  make prod-clean          停止容器并删除数据卷 (❗危险：清空生产数据)"
	@echo ""
	@echo " 🧩 [通用命令] (Common Commands)"
	@echo "  make gen-proto           生成 gRPC 代码 (buf generate)"
	@echo "  make gen-sdk             从 OpenAPI 生成前端 TypeScript SDK"
	@echo "  make clean               清理所有环境与缓存"
	@echo "  make help                显示此帮助信息"
	@echo ""
	@echo " 📦 [发布同步] (Release & Sync)"
	@echo "  make             从 ee 生成 Community Edition (CE) 分支"
	@echo "  make   将 origin/ce 同步并推送到 GitHub 公开仓库"
	@echo ""
	@echo " ⚠️  Windows 用户注意: 请使用 WSL2 或 Git Bash 运行 make 命令"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ------------------------------------------------------------------------------
# 3. [开发环境] Development Targets
# ------------------------------------------------------------------------------
# 初始化开发环境配置
dev-init:
	@echo "🔧 [OwlApi] 正在初始化开发环境配置..."
	@cp backend/.env.example backend/.env
	@$(SED_I) 's/^ENVIRONMENT=.*/ENVIRONMENT=dev/g' backend/.env
	@$(SED_I) 's/^DEBUG=.*/DEBUG=true/g' backend/.env
	@echo "✅ [OwlApi] 开发环境配置文件已生成: backend/.env"

dev-build:
	@echo "🐳 [DEV] 正在构建开发镜像..."
	$(DEV_COMPOSE) build

dev-up:
	@echo "🐳 [DEV] 正在启动热更新环境 (前台日志模式)..."
	@echo "    - Admin:    http://localhost:8001"
	@echo "    - API:      http://localhost:3000"
	@echo "    - Docs:     http://localhost:8003"
	@echo "    - Postgres: localhost:5433"
	@echo "    (按 Ctrl+C 停止服务)"
	$(DEV_COMPOSE) up

dev-down:
	@echo "🛑 [DEV] 正在停止开发环境..."
	$(DEV_COMPOSE) down

dev-rebuild:
	@echo "🔧 [DEV] 重建并启动开发环境..."
	$(DEV_COMPOSE) up -d --build

dev-restart:
	$(DEV_COMPOSE) restart

dev-restart-backend:
	$(DEV_COMPOSE) restart backend

dev-logs:
	$(DEV_COMPOSE) logs -f

dev-logs-backend:
	$(DEV_COMPOSE) logs -f backend

dev-clean:
	@echo "🧹 [DEV] 正在尝试深度清理开发环境..."
	@echo "⚠️  警告：此操作将删除所有开发容器相关的数据卷和数据！"
	@read -p "您确定要继续吗？[y/N] " ans && [ $${ans:-N} = y ] || (echo "❌ 操作已取消"; exit 1)
	$(DEV_COMPOSE) down -v
	@echo "✅ 开发环境深度清理完成"

dev-db-psql:
	$(DEV_COMPOSE) exec postgres psql -U postgres -d owlapi

# ------------------------------------------------------------------------------
# 4. [生产环境] Production Targets
# ------------------------------------------------------------------------------
# 前置检查: 确保 .env 存在
check-prod-env:
	@if [ ! -f "deploy/.env" ]; then \
		echo "❌ 未找到 deploy/.env, 请先执行: make prod-init"; \
		exit 1; \
	fi

# 初始化生产环境配置
prod-init:
	@echo "🚀 [OwlApi] 正在初始化生产环境配置..."
	@cp backend/.env.example deploy/.env
	@$(SED_I) 's/^ENVIRONMENT=.*/ENVIRONMENT=prod/g' deploy/.env
	@$(SED_I) 's/^DEBUG=.*/DEBUG=false/g' deploy/.env
	@echo "✅ [OwlApi] 生产环境配置文件已生成: deploy/.env"
	@echo "⚠️  请务必在运行 'make prod-up' 前修改敏感信息 (JWT_SECRET, POSTGRES_PASSWORD 等)！"

prod-up: check-prod-env
	@echo "🚀 [PROD] 正在启动生产集群..."
	$(PROD_COMPOSE) pull
	$(PROD_COMPOSE) up -d
	@echo "✅ 生产集群已启动 (后台运行)"

prod-up-build: check-prod-env
	@echo "🚀 [PROD] 本地构建并启动生产集群..."
	$(PROD_COMPOSE) up -d --build

prod-rebuild: check-prod-env
	@echo "🔧 [PROD] 无缓存重新构建生产环境..."
	$(PROD_COMPOSE) build --no-cache
	$(PROD_COMPOSE) up -d

prod-down: check-prod-env
	@echo "🛑 [PROD] 正在停止生产集群..."
	$(PROD_COMPOSE) down

prod-restart: check-prod-env
	$(PROD_COMPOSE) restart

prod-logs: check-prod-env
	$(PROD_COMPOSE) logs -f

prod-clean: check-prod-env
	@echo "🛑 [危险] 正在尝试深度清理生产环境..."
	@echo "⚠️  警告：此操作将删除所有生产容器相关的数据卷和数据！"
	@read -p "您确定要继续吗？[y/N] " ans && [ $${ans:-N} = y ] || (echo "❌ 操作已取消"; exit 1)
	$(PROD_COMPOSE) down -v
	@echo "✅ 生产环境深度清理完成"

# ------------------------------------------------------------------------------
# 5. [通用命令] Common Targets
# ------------------------------------------------------------------------------
gen-proto:
	@echo "🔄 生成 gRPC 代码..."
	cd backend/proto && buf generate

gen-sdk:
	@echo "🔄 从 OpenAPI spec 生成前端 SDK..."
	cd frontend/admin && pnpm run gen-sdk
	@echo "✅ SDK 已生成"

clean:
	@echo "🧹 清理所有环境..."
	$(DEV_COMPOSE) down -v 2>/dev/null || true
	$(PROD_COMPOSE) down -v 2>/dev/null || true
	rm -rf backend/server backend/init backend/tmp/
	@echo "✅ 清理完成"

# ------------------------------------------------------------------------------
# 6. [发布同步] Release & Sync Targets
# ------------------------------------------------------------------------------
