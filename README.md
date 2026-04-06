# Spinning — Skill 编排平台

面向多开发者协作场景的 Skill 编排工具，解决不同开发者开发的 Skill 之间的**冲突解决、权责归属、流程编排**（串行、并行、条件判断）问题。

## 功能特性

| 功能 | 说明 |
|------|------|
| 可视化拖拽编排 | 基于 ReactFlow 的画布，支持从侧边面板拖拽 Skill 到画布，通过连线定义流程 |
| 多节点类型 | Skill 节点、条件节点（菱形）、并行网关（fork/join）、起点/终点 |
| 节点状态 & 统计 | 每个节点展示运行状态指示灯（idle/running/success/error）和累计调用次数 |
| Prompt 自然语言编排 | 输入自然语言描述，LLM 解析后自动生成 DAG 流程 |
| Skill 聚类排名 | 按 category 聚类 + 调用频次/capability 综合排名 |
| 冲突检测 & 解决推荐 | 实时检测节点间冲突（输入重叠、输出冲突、能力重复、资源竞争），推荐解决方案 |
| 格式化模板 | 预置 4 个编排模板（NLP Pipeline、审批流、爬取摘要、ETL），支持保存自定义模板 |
| 流程执行引擎 | Go DAG 执行引擎，支持 goroutine 并行分支调度 + 条件分支 |
| 实时状态推送 | WebSocket 实时推送节点执行状态和日志 |
| MCP 协议兼容 | Skill 定义兼容 MCP（Model Context Protocol）格式 |

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 8.x | 构建工具 |
| ReactFlow (`@xyflow/react`) | 12.x | 画布/节点编排 |
| Tailwind CSS | 3.4 | 样式系统 |
| Radix UI | - | 无障碍 UI 原语 |
| Zustand | 5.x | 状态管理 |
| Axios | 1.x | HTTP 客户端 |
| dagre (`@dagrejs/dagre`) | 3.x | DAG 自动布局 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Go | 1.23 | 运行时 |
| Gin | 1.10 | HTTP 框架 |
| GORM | 1.25 | ORM |
| SQLite (`glebarez/sqlite`) | - | 纯 Go 实现，无需 CGO |
| gorilla/websocket | 1.5 | 实时通信 |

## 项目结构

```
Spinning/
├── Makefile
├── LICENSE
├── README.md
├── frontend/                          # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/                # ReactFlow 画布
│   │   │   │   ├── FlowCanvas.tsx     # 主画布
│   │   │   │   ├── CanvasToolbar.tsx  # 工具栏（保存/执行/布局/模板/导出）
│   │   │   │   ├── NodeDetailPanel.tsx# 节点详情面板
│   │   │   │   ├── nodes/             # 自定义节点
│   │   │   │   │   ├── SkillNode.tsx        # Skill 节点（状态灯+调用次数）
│   │   │   │   │   ├── ConditionNode.tsx    # 条件节点（菱形）
│   │   │   │   │   ├── GatewayNode.tsx      # 并行网关（fork/join）
│   │   │   │   │   └── StartEndNode.tsx     # 起点/终点
│   │   │   │   └── edges/
│   │   │   │       └── CustomEdge.tsx       # 自定义连线（串行/并行/条件）
│   │   │   ├── Panel/
│   │   │   │   ├── SkillPanel.tsx     # Skill 列表（搜索/过滤/拖拽）
│   │   │   │   ├── SkillClusterView.tsx # 聚类视图
│   │   │   │   └── SkillRankingView.tsx # 排名视图
│   │   │   ├── Prompt/
│   │   │   │   └── PromptInput.tsx    # 自然语言编排输入
│   │   │   ├── Conflict/
│   │   │   │   └── ConflictPanel.tsx  # 冲突检测 & 解决方案选择
│   │   │   ├── Execution/
│   │   │   │   ├── ExecutionPanel.tsx # 执行控制面板 + 日志
│   │   │   │   └── TemplateSelector.tsx # 模板选择器
│   │   │   └── ui/                    # 基础 UI 组件（shadcn 风格）
│   │   ├── store/
│   │   │   ├── flowStore.ts           # 编排流程状态
│   │   │   ├── skillStore.ts          # Skill 列表状态
│   │   │   └── executionStore.ts      # 执行状态
│   │   ├── services/
│   │   │   ├── api.ts                 # REST API 客户端
│   │   │   └── websocket.ts           # WebSocket 客户端
│   │   ├── types/
│   │   │   └── index.ts               # 全量类型定义
│   │   └── utils/
│   │       └── dagLayout.ts           # Dagre 自动布局算法
│   ├── package.json
│   └── vite.config.ts
├── backend/                           # Go 后端
│   ├── cmd/server/main.go             # 入口
│   ├── internal/
│   │   ├── api/
│   │   │   ├── router.go              # 路由注册（22 个端点）
│   │   │   └── handler/
│   │   │       ├── skill.go           # Skill CRUD + 聚类 + 排名
│   │   │       ├── flow.go            # Flow CRUD + 导出 + 生成 + 执行 + WS
│   │   │       └── conflict.go        # 冲突检测
│   │   ├── model/
│   │   │   ├── skill.go               # Skill/Cluster/Ranking 模型
│   │   │   ├── flow.go                # Flow/Node/Edge/Template 模型
│   │   │   └── conflict.go            # ConflictReport 模型
│   │   ├── service/
│   │   │   ├── skill_service.go       # Skill 业务逻辑
│   │   │   ├── flow_service.go        # Flow + 模板 CRUD
│   │   │   ├── conflict_service.go    # 冲突检测 & 推荐
│   │   │   ├── llm_service.go         # LLM Prompt→DAG 生成
│   │   │   └── engine/
│   │   │       ├── executor.go        # DAG 执行引擎（并行调度）
│   │   │       └── ws_hub.go          # WebSocket 广播
│   │   └── db/
│   │       ├── database.go            # SQLite 初始化
│   │       └── seed.go                # 12 个示例 Skill + 4 个模板
│   └── go.mod
```

## 快速开始

### 前置要求

- Node.js ≥ 20
- Go ≥ 1.23

### 启动开发环境

```bash
# 1. 安装前端依赖
cd frontend && npm install && cd ..

# 2. 构建并启动后端
cd backend
go build -o bin/spinning ./cmd/server/main.go
./bin/spinning                    # 后端运行在 :8080

# 3. 新终端启动前端
cd frontend
npm run dev                       # 前端运行在 :5173，自动代理 /api 到 :8080
```

或使用 Makefile 一键启动：

```bash
make install-frontend              # 安装前端依赖
make dev                           # 同时启动后端 + 前端
```

### 构建生产版本

```bash
make build                         # 构建前端 (dist/) + 后端 (bin/spinning)
```

### 环境变量

后端支持通过环境变量配置：

```bash
LLM_API_KEY=sk-...                # LLM API Key（不设则使用 mock 生成）
LLM_BASE_URL=https://api.openai.com/v1  # LLM API 地址
LLM_MODEL=gpt-4o-mini             # LLM 模型名
DB_PATH=./data/spinning.db        # SQLite 数据库路径
PORT=8080                         # 后端端口
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/skills` | 获取 Skill 列表（支持 `?search=&category=&sort=`） |
| `GET` | `/api/skills/:id` | 获取 Skill 详情 |
| `POST` | `/api/skills` | 创建 Skill |
| `PUT` | `/api/skills/:id` | 更新 Skill |
| `DELETE` | `/api/skills/:id` | 删除 Skill |
| `GET` | `/api/skills/clusters` | 获取聚类结果 |
| `GET` | `/api/skills/rankings` | 获取排名 |
| `GET` | `/api/flows` | 获取 Flow 列表 |
| `POST` | `/api/flows` | 创建 Flow |
| `GET` | `/api/flows/:id` | 获取 Flow（含 nodes + edges） |
| `PUT` | `/api/flows/:id` | 更新 Flow（nodes + edges 整体替换） |
| `DELETE` | `/api/flows/:id` | 删除 Flow |
| `POST` | `/api/flows/:id/export` | 导出 Flow 为 JSON / YAML |
| `POST` | `/api/flows/generate` | Prompt 自然语言 → DAG |
| `POST` | `/api/flows/:id/execute` | 执行 Flow（返回 execution_id） |
| `GET` | `/api/templates` | 获取模板列表 |
| `POST` | `/api/templates` | 创建模板 |
| `GET` | `/api/templates/:id` | 获取模板 |
| `DELETE` | `/api/templates/:id` | 删除模板 |
| `POST` | `/api/conflicts/detect` | 检测冲突 |
| `POST` | `/api/conflicts/:id/resolve` | 应用冲突解决方案 |
| `WS` | `/ws/execution/:id` | 实时执行状态推送 |

## 内置数据

启动后自动灌入 12 个示例 Skill：

| Skill | 类别 | 能力 |
|-------|------|------|
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

以及 4 个预置编排模板：NLP Pipeline、审批流、爬取摘要、ETL Pipeline。

## License

MIT
