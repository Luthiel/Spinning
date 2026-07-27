package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

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
	return fmt.Errorf("cannot scan type %T into FloatSlice", s)
}

// SkillEmbedding stores an embedding vector for a skill
type SkillEmbedding struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	SkillID   string    `gorm:"not null;uniqueIndex" json:"skill_id"`
	Embedding FloatSlice `gorm:"type:text" json:"embedding"`
	Model     string    `json:"model"` // e.g. "text-embedding-3-small"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// RouterConfig stores the current Smart Router configuration
type RouterConfig struct {
	ID              string  `gorm:"primaryKey" json:"id"`
	Preset          string  `json:"preset"` // strict|balanced|loose|custom
	TokenBudget     int     `json:"token_budget"`
	MinHealthScore  float64 `json:"min_health_score"`
	MaxSkills       int     `json:"max_skills"`
	DedupThreshold  float64 `json:"dedup_threshold"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// RouterSelectRequest is the request body for POST /api/router/select
type RouterSelectRequest struct {
	TaskText string `json:"task_text" binding:"required"`
	TopK     int    `json:"top_k,omitempty"` // override top-K candidates
}

// RouterSimulateRequest is the request body for POST /api/router/simulate
type RouterSimulateRequest struct {
	TaskText        string        `json:"task_text" binding:"required"`
	ConfigOverrides *RouterConfig `json:"config_overrides,omitempty"`
	TopK            int           `json:"top_k,omitempty"`
}

// RouterFilteredSkill describes a skill that was excluded from selection
type RouterFilteredSkill struct {
	SkillID   string `json:"skill_id"`
	SkillName string `json:"skill_name"`
	Reason    string `json:"reason"` // quality|dedup|budget
	Detail    string `json:"detail"`
}

// RouterSelectedSkill describes a skill that was selected
type RouterSelectedSkill struct {
	SkillID       string  `json:"skill_id"`
	SkillName     string  `json:"skill_name"`
	Relevance     float64 `json:"relevance"`
	HealthScore   float64 `json:"health_score"`
	TokenCost     int     `json:"token_cost"`
	Score         float64 `json:"score"` // (relevance × health_score/100) / token_cost
	Rank          int     `json:"rank"`
}

// RouterSelectResponse is the response body for POST /api/router/select
type RouterSelectResponse struct {
	TaskText        string                `json:"task_text"`
	Selected        []RouterSelectedSkill `json:"selected"`
	Filtered        []RouterFilteredSkill `json:"filtered"`
	TotalTokensUsed int                   `json:"total_tokens_used"`
	TokenBudget     int                   `json:"token_budget"`
	ConfigPreset    string                `json:"config_preset"`
}
