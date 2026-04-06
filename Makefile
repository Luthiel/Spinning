GOROOT := $(HOME)/go
GOPATH := $(HOME)/gopath
GO     := $(GOROOT)/bin/go
GOTOOLCHAIN := local

export GOROOT GOPATH GOTOOLCHAIN

.PHONY: all dev build backend frontend clean

all: build

## ── Development ──────────────────────────────────────────────
dev: ## Start both backend and frontend in dev mode
	@echo "Starting Spinning dev servers..."
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Start Go backend on :8080
	@cd backend && $(GO) run ./cmd/server/main.go

dev-frontend: ## Start Vite dev server on :5173
	@cd frontend && npm run dev

## ── Build ────────────────────────────────────────────────────
build: build-backend build-frontend ## Build everything

build-backend: ## Build Go binary
	@echo "Building backend..."
	@cd backend && $(GO) build -o bin/spinning ./cmd/server/main.go
	@echo "Backend built: backend/bin/spinning"

build-frontend: ## Build frontend for production
	@echo "Building frontend..."
	@cd frontend && npm run build
	@echo "Frontend built: frontend/dist/"

## ── Install ──────────────────────────────────────────────────
install-frontend: ## Install frontend dependencies
	@cd frontend && npm install

tidy-backend: ## Tidy Go modules
	@cd backend && $(GO) mod tidy

## ── Clean ────────────────────────────────────────────────────
clean: ## Remove build artifacts
	@rm -rf backend/bin backend/data frontend/dist
	@echo "Cleaned"

## ── Help ─────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
