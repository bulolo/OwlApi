.PHONY: help build-server build-agent docker-build docker-up docker-down dev clean gen-proto

# Default target
help:
	@echo "OwlApi - SQL to API Platform"
	@echo ""
	@echo "Usage:"
	@echo "  make build-server    Build server binary"
	@echo "  make build-agent     Build agent binary"
	@echo "  make docker-build    Build all Docker images"
	@echo "  make docker-up       Start dev services"
	@echo "  make docker-down     Stop dev services"
	@echo "  make dev             Run development environment"
	@echo "  make gen-proto       Generate gRPC code from proto"
	@echo "  make clean           Clean build artifacts"

# Build server binary
build-server:
	cd backend && go build -o ../bin/server ./cmd/server

# Build agent binary
build-agent:
	cd backend && go build -o ../bin/agent ./cmd/agent

# Build all binaries
build: build-server build-agent

# Build Docker images (dev)
docker-build:
	docker compose -f docker-compose.dev.yml build

# Start services (dev)
docker-up:
	docker compose -f docker-compose.dev.yml up -d

# Stop services (dev)
docker-down:
	docker compose -f docker-compose.dev.yml down

# Development mode
dev:
	@echo "Starting development environment..."
	docker compose -f docker-compose.dev.yml up -d db
	@echo "Database started on localhost:5432"
	@echo "Run 'cd backend && go run ./cmd/server' to start the server"
	@echo "Run 'cd frontend && pnpm dev' to start the frontend"

# Generate gRPC code
gen-proto:
	cd backend/proto && buf generate

# Clean build artifacts
clean:
	rm -rf bin/
	docker compose -f docker-compose.dev.yml down -v
