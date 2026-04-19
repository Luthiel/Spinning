# Backend Service Layer

Execution engine and business logic for the Spinning orchestration platform.

## STRUCTURE

```
service/
├── engine/              # DAG execution + WebSocket hub
│   ├── executor.go      # Parallel DAG executor
│   └── ws_hub.go        # WebSocket broadcast hub
├── llm*.go              # LLM providers (interface + implementations)
├── skill_service.go     # Skill business logic
├── flow_service.go      # Flow + template CRUD
├── conflict_service.go  # Conflict detection
└── util.go              # Shared utilities
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add LLM provider | `llm_*.go` pattern | Implement `LLMProvider` interface |
| Modify execution | `engine/executor.go` | DAG scheduler with goroutines |
| Add WebSocket event | `engine/ws_hub.go` | Broadcast to all clients |
| Add skill logic | `skill_service.go` | Clustering + ranking |
| Add flow logic | `flow_service.go` | Export + generation |

## CONVENTIONS

- **Interface pattern**: `llm.go` defines interface, `llm_*.go` implement
- **Provider naming**: `llm_{provider}.go` (openai, opencode, mock)
- **Engine isolation**: All execution logic in `engine/` subdirectory
- **Context propagation**: Use `context.Context` for cancellation

## ANTI-PATTERNS

- **No tests**: No `*_test.go` files — add tests before modifying executor
- **Mock fallback**: LLM falls back to mock if API key missing — log this clearly

## NOTES

- **Executor**: Uses topological sort + goroutine pools for parallel branches
- **WebSocket**: gorilla/websocket with hub pattern for broadcast
- **SQLite**: Pure Go (`glebarez/sqlite`), no CGO required
