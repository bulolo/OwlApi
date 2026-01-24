# ==============================================================================
# OwlApi Project Makefile
# ------------------------------------------------------------------------------
# 命名规范 / Naming Convention:
#   dev-*  : 开发环境操作 (Hot-Reload, Debug Mode)
#   prod-* : 生产环境操作 (Production, Cluster Mode)
#   (none) : 通用工具 (Utils)
# ==============================================================================

.PHONY: help
.PHONY: gen-proto clean
.PHONY: dev-up dev-down dev-build
.PHONY: prod-up prod-down prod-build prod-logs

# ------------------------------------------------------------------------------
# 1. 帮助与概览 (Help)
# ------------------------------------------------------------------------------

help:
	@echo "OwlApi - SQL to API 智能网关平台"
	@echo ""
	@echo "🐳 开发环境 (Development):"
	@echo "  make dev-up            启动全栈热更新环境 (Air + Next.js HMR)"
	@echo "  make dev-down          停止并移除开发容器"
	@echo "  make dev-build         构建开发镜像"
	@echo ""
	@echo "🚀 生产环境 (Production):"
	@echo "  make prod-up           启动生产级集群 (Docker Compose Cluster)"
	@echo "  make prod-down         停止生产集群"
	@echo "  make prod-build        构建生产镜像"
	@echo "  make prod-logs         查看生产环境日志"
	@echo ""
	@echo "🛠️  通用工具 (Utils):"
	@echo "  make gen-proto         生成 gRPC 代码"
	@echo "  make clean             清理所有环境与缓存"

# ------------------------------------------------------------------------------
# 2. 开发环境 (Development - Hot Reload)
# ------------------------------------------------------------------------------

dev-build:
	@echo ">>> 🐳 [DEV] 正在构建开发镜像..."
	docker compose -f docker-compose.dev.yml build

dev-up:
	@echo ">>> 🐳 [DEV] 正在启动热更新环境 (前台日志模式)..."
	@echo "    - Frontend: http://localhost:3000"
	@echo "    - API:      http://localhost:8080"
	@echo "    (按 Ctrl+C 停止服务)"
	docker compose -f docker-compose.dev.yml up

dev-down:
	@echo ">>> 🛑 [DEV] 正在停止开发环境..."
	docker compose -f docker-compose.dev.yml down

# ------------------------------------------------------------------------------
# 3. 生产环境 (Production - Cluster)
# ------------------------------------------------------------------------------

prod-build:
	@echo ">>> 🏭 [PROD] 正在构建生产镜像..."
	docker compose -f deploy/cluster/docker-compose.yml build

prod-up:
	@echo ">>> 🚀 [PROD] 正在启动生产集群..."
	docker compose -f deploy/cluster/docker-compose.yml up -d
	@echo "✅ 生产集群已启动 (后台运行)"

prod-down:
	@echo ">>> 🛑 [PROD] 正在停止生产集群..."
	docker compose -f deploy/cluster/docker-compose.yml down

prod-logs:
	docker compose -f deploy/cluster/docker-compose.yml logs -f

# ------------------------------------------------------------------------------
# 4. 通用工具 (Utils)
# ------------------------------------------------------------------------------

gen-proto:
	@echo ">>> 🔄 生成 gRPC 代码..."
	cd backend/proto && buf generate

clean:
	@echo ">>> 🧹 清理环境..."
	rm -rf bin/
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f deploy/cluster/docker-compose.yml down -v
