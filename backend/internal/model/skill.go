package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringSlice is a JSON-serialized []string for SQLite storage
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	b, err := json.Marshal(s)
	return string(b), err
}

func (s *StringSlice) Scan(value interface{}) error {
	switch v := value.(type) {
	case string:
		return json.Unmarshal([]byte(v), s)
	case []byte:
		return json.Unmarshal(v, s)
	}
	return fmt.Errorf("cannot scan type %T into StringSlice", value)
}

// JSONMap is a JSON-serialized map for SQLite storage
type JSONMap map[string]interface{}

func (m JSONMap) Value() (driver.Value, error) {
	b, err := json.Marshal(m)
	return string(b), err
}

func (m *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*m = JSONMap{}
		return nil
	}
	switch v := value.(type) {
	case string:
		return json.Unmarshal([]byte(v), m)
	case []byte:
		return json.Unmarshal(v, m)
	}
	return fmt.Errorf("cannot scan type %T into JSONMap", value)
}

// FloatSlice is a JSON-serialized []float64 for SQLite storage
type FloatSlice []float64

func (s FloatSlice) Value() (driver.Value, error) {
	b, err := json.Marshal(s)
	return string(b), err
}

func (s *FloatSlice) Scan(value interface{}) error {
	switch v := value.(type) {
	case string:
		return json.Unmarshal([]byte(v), s)
	case []byte:
		return json.Unmarshal(v, s)
	}
	return fmt.Errorf("cannot scan type %T into FloatSlice", value)
}

// Skill represents a single MCP-compatible skill
type Skill struct {
	ID           string      `gorm:"primaryKey" json:"id"`
	Name         string      `gorm:"not null;index" json:"name"`
	Description  string      `json:"description"`
	Version      string      `json:"version"`
	Author       string      `json:"author"`
	OwnerTeam    string      `json:"owner_team"`
	Category     StringSlice `gorm:"type:text" json:"category"`
	InputSchema  JSONMap     `gorm:"type:text" json:"input_schema"`
	OutputSchema JSONMap     `gorm:"type:text" json:"output_schema"`
	Capabilities StringSlice `gorm:"type:text" json:"capabilities"`
	ConflictTags StringSlice `gorm:"type:text" json:"conflict_tags"`
	CallCount    int64       `json:"call_count"`
	Status       string      `gorm:"default:'active'" json:"status"` // active|deprecated|draft
	Icon         string      `json:"icon"`
	Color        string      `json:"color"`
	ClusterID    *int        `json:"cluster_id,omitempty"`
	ClusterLabel string      `json:"cluster_label,omitempty"`
	RankScore    float64     `json:"rank_score"`
	Source       string      `gorm:"default:'builtin'" json:"source"` // builtin|opencode|claude_code|etc
	FileRoot     string      `json:"file_root,omitempty"`
	MCPConfig    JSONMap     `gorm:"type:text" json:"mcp_config,omitempty"`
	
	// Health scoring fields
	Embedding    FloatSlice  `gorm:"type:text" json:"embedding,omitempty"` // semantic vector
	SuccessRate  float64     `gorm:"default:1.0" json:"success_rate"`     // success rate 0-1
	AvgLatencyMs int64       `json:"avg_latency_ms"`                        // average latency in ms
	TotalTokens  int64       `json:"total_tokens"`                          // total token consumption
	ErrorCount   int64       `json:"error_count"`                           // error count
	LastUsedAt   *time.Time  `json:"last_used_at,omitempty"`                // last used timestamp
	HealthScore  float64     `gorm:"default:0" json:"health_score"`        // health score 0-100
	HealthGrade  string      `gorm:"default:'untested'" json:"health_grade"` // A-F or untested
	CheckedAt    *time.Time  `json:"checked_at,omitempty"`                  // last health check timestamp
	
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// SkillFileVersion stores a point-in-time snapshot of a managed skill file.
type SkillFileVersion struct {
	ID                   string     `gorm:"primaryKey" json:"id"`
	SkillID              string     `gorm:"not null;index" json:"skill_id"`
	Path                 string     `gorm:"not null;index" json:"path"`
	Kind                 string     `json:"kind"`     // skill|reference|script
	Language             string     `json:"language"` // markdown|shell|typescript|python|...
	Content              string     `gorm:"type:text" json:"content"`
	Hash                 string     `gorm:"index" json:"hash"`
	Message              string     `json:"message,omitempty"`
	Source               string     `json:"source"` // manual|llm|restore|initial
	RestoreFromVersionID string     `json:"restore_from_version_id,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	DeletedAt            *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// SkillCluster represents a cluster of related skills
type SkillCluster struct {
	ID          int     `json:"id"`
	Label       string  `json:"label"`
	Description string  `json:"description"`
	Skills      []Skill `json:"skills"`
	Color       string  `json:"color"`
	TotalCalls  int64   `json:"total_calls"`
	AvgScore    float64 `json:"avg_rank_score"`
}

// SkillRanking is the ranking view of a skill
type SkillRanking struct {
	Skill           Skill   `json:"skill"`
	Rank            int     `json:"rank"`
	CallCount       int64   `json:"call_count"`
	CapabilityScore float64 `json:"capability_score"`
	RankScore       float64 `json:"rank_score"`
	Trend           string  `json:"trend"` // up|down|stable
}
