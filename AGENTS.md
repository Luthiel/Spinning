# Spinning — Project Knowledge Base

**Generated:** 2026-04-19  
**Commit:** 27bc6d1  
**Branch:** feature_0416_agents_integration

## OVERVIEW

Skill orchestration platform (React 19 + Go 1.23). Visual DAG workflow builder with conflict detection, LLM-based generation, and real-time execution.

## STRUCTURE

```
.
├── frontend/           # React + Vite + TypeScript
│   ├── src/components/ # Feature-based organization
│   ├── src/store/      # Zustand state management
│   └── src/services/   # API + WebSocket clients
├── backend/            # Go + Gin + SQLite
│   ├── cmd/server/     # Entry point
│   ├── internal/api/   # HTTP handlers
│   ├── internal/service/ # Business logic + execution engine
│   └── internal/model/ # GORM models
├── Makefile            # Unified build orchestration
└── docs/               # Documentation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `backend/internal/api/router.go` | 22 endpoints registered |
| Add skill node type | `frontend/src/components/Canvas/nodes/` | Extend existing patterns |
| Change execution logic | `backend/internal/service/engine/` | DAG executor + WebSocket hub |
| State management | `frontend/src/store/` | flowStore, skillStore, executionStore |
| Database schema | `backend/internal/model/` | GORM models |
| LLM integration | `backend/internal/service/llm_*.go` | Mock, OpenAI, OpenCode providers |
| WebSocket events | `frontend/src/services/websocket.ts` | Real-time execution status |

## CODE MAP

### Backend (Go)

| Symbol | Type | File | Role |
|--------|------|------|------|
| `main` | func | `cmd/server/main.go` | Entry point |
| `SetupRouter` | func | `internal/api/router.go` | Route registration |
| `ExecuteFlow` | func | `internal/service/engine/executor.go` | DAG execution |
| `Skill` | struct | `internal/model/skill.go` | Skill entity |
| `Flow` | struct | `internal/model/flow.go` | Flow entity |

### Frontend (React/TypeScript)

| Symbol | Type | File | Role |
|--------|------|------|------|
| `App` | component | `src/App.tsx` | Root component |
| `FlowCanvas` | component | `src/components/Canvas/FlowCanvas.tsx` | ReactFlow canvas |
| `useFlowStore` | hook | `src/store/flowStore.ts` | Flow state |
| `api` | service | `src/services/api.ts` | HTTP client |

## CONVENTIONS

### Frontend
- **Components**: Feature-based organization (`Canvas/`, `Panel/`, `Execution/`)
- **Styling**: Tailwind + shadcn/ui pattern (`components/ui/`)
- **State**: Zustand stores in `src/store/`
- **Imports**: `@/` alias points to `src/`

### Backend
- **Standard Go layout**: `cmd/`, `internal/`
- **Layered architecture**: api → service → model → db
- **Execution engine**: Isolated in `service/engine/`

### Build
- **Go**: Custom paths in Makefile (`GOROOT`, `GOPATH`) — non-standard
- **Frontend**: Vite with proxy to backend (`/api`, `/ws`)

## ANTI-PATTERNS (THIS PROJECT)

- **No tests**: No `*_test.go`, no `*.test.ts` — documented as technical debt
- **No CI/CD**: Missing `.github/workflows/`
- **No root .gitignore**: Only in `frontend/`
- **Hardcoded Go paths**: Makefile sets `GOROOT`, `GOPATH` — breaks standard Go setup
- **Pin to patch version**: `go.mod` specifies `1.23.4` — prefer `1.23`

## UNIQUE STYLES

- **Node types**: Custom ReactFlow nodes (Skill, Condition, Gateway, Start/End, MCP)
- **Conflict detection**: Real-time overlap detection with resolution recommendations
- **LLM abstraction**: Multiple providers (mock, OpenAI, OpenCode) via interface
- **MCP compatibility**: Skill definitions follow Model Context Protocol format

## COMMANDS

```bash
# Development (both frontend + backend)
make dev

# Build
make build                    # Both
make build-backend            # Go binary
make build-frontend           # Vite production

# Install
cd frontend && npm install    # Frontend deps

# Clean
make clean                    # Remove artifacts
```

## NOTES

- **No LSP servers**: gopls, typescript-language-server not installed
- **SQLite**: Pure Go implementation (`glebarez/sqlite`), no CGO
- **WebSocket**: gorilla/websocket for real-time execution status
- **LLM fallback**: Mock generation if `LLM_API_KEY` not set
- **Seed data**: 12 demo skills + 4 templates auto-created on first run
