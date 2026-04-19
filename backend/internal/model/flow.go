package model

import "time"

// Flow is the top-level orchestration flow
type Flow struct {
	ID          string     `gorm:"primaryKey" json:"id"`
	Name        string     `gorm:"not null" json:"name"`
	Description string     `json:"description"`
	CreatedBy   string     `json:"created_by"`
	Version     int        `gorm:"default:1" json:"version"`
	Tags        StringSlice `gorm:"type:text" json:"tags"`
	TemplateID  string     `json:"template_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Associations
	Nodes []FlowNode `gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE" json:"nodes"`
	Edges []FlowEdge `gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE" json:"edges"`
}

// FlowNode is a node within a Flow
type FlowNode struct {
	ID            string  `gorm:"primaryKey" json:"id"`
	FlowID        string  `gorm:"not null;index" json:"flow_id,omitempty"`
	Type          string  `gorm:"not null" json:"type"` // skill|condition|parallel_fork|parallel_join|start|end|mcp
	SkillID       string  `json:"skill_id,omitempty"`
	MCPServer     string  `json:"mcp_server,omitempty"`     // MCP server name for mcp type nodes
	MCPTool       string  `json:"mcp_tool,omitempty"`      // MCP tool name for mcp type nodes
	MCPConfig     JSONMap `gorm:"type:text" json:"mcp_config,omitempty"` // MCP configuration
	PositionX     float64 `json:"position_x"`
	PositionY     float64 `json:"position_y"`
	Config        JSONMap `gorm:"type:text" json:"config"`
	Status        string  `gorm:"default:'idle'" json:"status"`
	CallCount     int64   `json:"call_count"`
	ConditionExpr string  `json:"condition_expr,omitempty"`
	Label         string  `json:"label,omitempty"`
	Description   string  `json:"description,omitempty"`
}

// FlowEdge is a directed edge between two nodes
type FlowEdge struct {
	ID           string `gorm:"primaryKey" json:"id"`
	FlowID       string `gorm:"not null;index" json:"flow_id,omitempty"`
	Source       string `gorm:"not null" json:"source"`
	Target       string `gorm:"not null" json:"target"`
	SourceHandle string `json:"source_handle,omitempty"`
	TargetHandle string `json:"target_handle,omitempty"`
	EdgeType     string `gorm:"default:'serial'" json:"edge_type"` // serial|parallel|conditional
	Condition    string `json:"condition,omitempty"`
	Label        string `json:"label,omitempty"`
}

// FlowTemplate is a reusable flow skeleton
type FlowTemplate struct {
	ID          string      `gorm:"primaryKey" json:"id"`
	Name        string      `gorm:"not null" json:"name"`
	Description string      `json:"description"`
	Category    string      `json:"category"`
	IsBuiltin   bool        `gorm:"default:false" json:"is_builtin"`
	CreatedBy   string      `json:"created_by"`
	Tags        StringSlice `gorm:"type:text" json:"tags"`
	// Serialised nodes/edges
	NodesJSON string `gorm:"type:text" json:"-"`
	EdgesJSON string `gorm:"type:text" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TemplateResponse is the API response for a template (includes parsed nodes/edges)
type TemplateResponse struct {
	FlowTemplate
	Nodes []FlowNode `json:"nodes"`
	Edges []FlowEdge `json:"edges"`
}

// --- Execution models ---

// FlowExecution tracks a single run of a flow
type FlowExecution struct {
	ID           string     `gorm:"primaryKey" json:"id"`
	FlowID       string     `gorm:"not null;index" json:"flow_id"`
	Status       string     `gorm:"default:'pending'" json:"status"` // pending|running|completed|failed|cancelled
	StartedAt    time.Time  `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	TriggerInput JSONMap    `gorm:"type:text" json:"trigger_input,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`

	// Runtime state (not persisted in DB directly)
	NodeExecutions map[string]*NodeExecution `gorm:"-" json:"node_executions"`
	Logs           []ExecutionLog            `gorm:"-" json:"logs"`
}

// NodeExecution is the runtime state of one node during an execution
type NodeExecution struct {
	NodeID      string     `json:"node_id"`
	Status      string     `json:"status"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	DurationMs  *int64     `json:"duration_ms,omitempty"`
	Output      JSONMap    `json:"output,omitempty"`
	Error       string     `json:"error,omitempty"`
}

// ExecutionLog is a single log entry during an execution
type ExecutionLog struct {
	ID          string     `json:"id"`
	ExecutionID string     `json:"execution_id"`
	NodeID      string     `json:"node_id"`
	NodeName    string     `json:"node_name"`
	Level       string     `json:"level"` // info|warn|error|debug
	Message     string     `json:"message"`
	Timestamp   time.Time  `json:"timestamp"`
	DurationMs  *int64     `json:"duration_ms,omitempty"`
	Input       JSONMap    `json:"input,omitempty"`
	Output      JSONMap    `json:"output,omitempty"`
}
