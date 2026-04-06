# Spinning — Skill Orchestration Platform

A skill orchestration tool for multi-developer collaboration, solving **conflict resolution, ownership attribution, and workflow orchestration** (serial, parallel, conditional) between skills developed by different developers.

## Features

| Feature | Description |
|---------|-------------|
| Visual Drag-and-Drop Orchestration | Canvas based on ReactFlow — drag skills from the sidebar to the canvas and define flows by connecting nodes |
| Multiple Node Types | Skill nodes, condition nodes (diamond), parallel gates (fork/join), start/end nodes |
| Node Status & Stats | Each node displays a status indicator (idle/running/success/error) and cumulative call count |
| Prompt-based Natural Language Orchestration | Enter natural language descriptions; LLM parses and auto-generates a DAG workflow |
| Skill Clustering & Ranking | Cluster by category + rank by call frequency and capability coverage |
| Conflict Detection & Resolution Recommendations | Real-time detection of conflicts between nodes (input overlap, output conflict, capability duplication, resource contention) with recommended resolutions |
| Flow Templates | 4 built-in templates (NLP Pipeline, Approval Flow, Scrape & Summarize, ETL Pipeline) with support for custom templates |
| Flow Execution Engine | Go DAG execution engine with goroutine-based parallel branch scheduling and conditional branching |
| Real-time Status Push | WebSocket-based real-time push of node execution status and logs |
| MCP Protocol Compatibility | Skill definitions compatible with MCP (Model Context Protocol) format |

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 8.x | Build tool |
| ReactFlow (`@xyflow/react`) | 12.x | Canvas / node orchestration |
| Tailwind CSS | 3.4 | Styling system |
| Radix UI | — | Accessible UI primitives |
| Zustand | 5.x | State management |
| Axios | 1.x | HTTP client |
| dagre (`@dagrejs/dagre`) | 3.x | DAG auto-layout |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.23 | Runtime |
| Gin | 1.10 | HTTP framework |
| GORM | 1.25 | ORM |
| SQLite (`glebarez/sqlite`) | — | Pure Go implementation, no CGO required |
| gorilla/websocket | 1.5 | Real-time communication |

## Project Structure

```
Spinning/
├── Makefile
├── LICENSE
├── README.md
├── frontend/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/                # ReactFlow canvas
│   │   │   │   ├── FlowCanvas.tsx     # Main canvas
│   │   │   │   ├── CanvasToolbar.tsx  # Toolbar (save/execute/layout/template/export)
│   │   │   │   ├── NodeDetailPanel.tsx# Node detail panel
│   │   │   │   ├── nodes/             # Custom nodes
│   │   │   │   │   ├── SkillNode.tsx        # Skill node (status light + call count)
│   │   │   │   │   ├── ConditionNode.tsx    # Condition node (diamond)
│   │   │   │   │   ├── GatewayNode.tsx      # Parallel gateway (fork/join)
│   │   │   │   │   └── StartEndNode.tsx     # Start/End nodes
│   │   │   │   └── edges/
│   │   │   │       └── CustomEdge.tsx       # Custom edges (serial/parallel/conditional)
│   │   │   ├── Panel/
│   │   │   │   ├── SkillPanel.tsx     # Skill list (search/filter/drag)
│   │   │   │   ├── SkillClusterView.tsx # Cluster view
│   │   │   │   └── SkillRankingView.tsx # Ranking view
│   │   │   ├── Prompt/
│   │   │   │   └── PromptInput.tsx    # Natural language orchestration input
│   │   │   ├── Conflict/
│   │   │   │   └── ConflictPanel.tsx  # Conflict detection & resolution selection
│   │   │   ├── Execution/
│   │   │   │   ├── ExecutionPanel.tsx # Execution control panel + logs
│   │   │   │   └── TemplateSelector.tsx # Template selector
│   │   │   └── ui/                    # Base UI components (shadcn style)
│   │   ├── store/
│   │   │   ├── flowStore.ts           # Flow orchestration state
│   │   │   ├── skillStore.ts          # Skill list state
│   │   │   └── executionStore.ts      # Execution state
│   │   ├── services/
│   │   │   ├── api.ts                 # REST API client
│   │   │   └── websocket.ts           # WebSocket client
│   │   ├── types/
│   │   │   └── index.ts               # Full type definitions
│   │   └── utils/
│   │       └── dagLayout.ts           # Dagre auto-layout algorithm
│   ├── package.json
│   └── vite.config.ts
├── backend/                           # Go backend
│   ├── cmd/server/main.go             # Entry point
│   ├── internal/
│   │   ├── api/
│   │   │   ├── router.go              # Route registration (22 endpoints)
│   │   │   └── handler/
│   │   │       ├── skill.go           # Skill CRUD + clustering + ranking
│   │   │       ├── flow.go            # Flow CRUD + export + generate + execute + WS
│   │   │       └── conflict.go        # Conflict detection
│   │   ├── model/
│   │   │   ├── skill.go               # Skill/Cluster/Ranking models
│   │   │   ├── flow.go                # Flow/Node/Edge/Template models
│   │   │   └── conflict.go            # ConflictReport model
│   │   ├── service/
│   │   │   ├── skill_service.go       # Skill business logic
│   │   │   ├── flow_service.go        # Flow + template CRUD
│   │   │   ├── conflict_service.go    # Conflict detection & recommendations
│   │   │   ├── llm_service.go         # LLM prompt → DAG generation
│   │   │   └── engine/
│   │   │       ├── executor.go        # DAG executor (parallel scheduling)
│   │   │       └── ws_hub.go          # WebSocket broadcast hub
│   │   └── db/
│   │       ├── database.go            # SQLite initialization
│   │       └── seed.go                # 12 demo skills + 4 templates
│   └── go.mod
```

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Go ≥ 1.23

### Start Development Environment

```bash
# 1. Install frontend dependencies
cd frontend && npm install && cd ..

# 2. Build and start backend
cd backend
go build -o bin/spinning ./cmd/server/main.go
./bin/spinning                    # Backend runs on :8080

# 3. Start frontend in a new terminal
cd frontend
npm run dev                       # Frontend runs on :5173, proxies /api to :8080
```

Or use the Makefile for one-command startup:

```bash
make install-frontend              # Install frontend dependencies
make dev                           # Start backend + frontend concurrently
```

### Production Build

```bash
make build                         # Build frontend (dist/) + backend (bin/spinning)
```

### Environment Variables

The backend supports configuration via environment variables:

```bash
LLM_API_KEY=sk-...                # LLM API key (falls back to mock generation if not set)
LLM_BASE_URL=https://api.openai.com/v1  # LLM API base URL
LLM_MODEL=gpt-4o-mini             # LLM model name
DB_PATH=./data/spinning.db        # SQLite database path
PORT=8080                         # Backend port
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/skills` | List skills (supports `?search=&category=&sort=`) |
| `GET` | `/api/skills/:id` | Get skill details |
| `POST` | `/api/skills` | Create a skill |
| `PUT` | `/api/skills/:id` | Update a skill |
| `DELETE` | `/api/skills/:id` | Delete a skill |
| `GET` | `/api/skills/clusters` | Get clustering results |
| `GET` | `/api/skills/rankings` | Get rankings |
| `GET` | `/api/flows` | List flows |
| `POST` | `/api/flows` | Create a flow |
| `GET` | `/api/flows/:id` | Get flow (with nodes + edges) |
| `PUT` | `/api/flows/:id` | Update flow (replaces nodes + edges) |
| `DELETE` | `/api/flows/:id` | Delete a flow |
| `POST` | `/api/flows/:id/export` | Export flow as JSON / YAML |
| `POST` | `/api/flows/generate` | Natural language prompt → DAG |
| `POST` | `/api/flows/:id/execute` | Execute a flow (returns execution_id) |
| `GET` | `/api/templates` | List templates |
| `POST` | `/api/templates` | Create a template |
| `GET` | `/api/templates/:id` | Get template |
| `DELETE` | `/api/templates/:id` | Delete a template |
| `POST` | `/api/conflicts/detect` | Detect conflicts |
| `POST` | `/api/conflicts/:id/resolve` | Apply a conflict resolution |
| `WS` | `/ws/execution/:id` | Real-time execution status push |

## Seed Data

The database is automatically seeded with 12 demo skills on first launch:

| Skill | Category | Capabilities |
|-------|----------|-------------|
| Text Translator | nlp, transform | translation, multilingual |
| Sentiment Analyzer | nlp, ai | sentiment-analysis, emotion-detection |
| Keyword Extractor | nlp | keyword-extraction, ner |
| Text Summarizer | nlp, ai | summarization |
| ML Classifier | ai, data | classification, ml-inference |
| OCR Extractor | image, data | ocr, image-processing |
| Semantic Search | search, ai | semantic-search, vector-search |
| Notification Sender | notify | email, slack, sms, webhook |
| Data Transformer | data, transform | data-transformation, etl |
| Code Generator | code | code-generation, templating |
| Input Validator | data | validation, schema-check |
| Web Scraper | data, search | web-scraping, html-parsing |

Plus 4 built-in orchestration templates: NLP Pipeline, Approval Flow, Scrape & Summarize, and ETL Pipeline.

## License

MIT
