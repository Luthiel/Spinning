package model

import "time"

// HealthReport stores a point-in-time snapshot of a skill's health metrics.
// Used for trend analysis in the Health History API.
type HealthReport struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	SkillID      string    `gorm:"not null;index" json:"skill_id"`
	SkillName    string    `json:"skill_name"`
	HealthScore  float64   `json:"health_score"`
	HealthGrade  string    `json:"health_grade"`
	CallCount    int64     `json:"call_count"`
	SuccessRate  float64   `json:"success_rate"`
	AvgLatencyMs int64     `json:"avg_latency_ms"`
	TotalTokens  int64     `json:"total_tokens"`
	ErrorCount   int64     `json:"error_count"`
	CheckedAt    time.Time `gorm:"index" json:"checked_at"`
	DurationMs   int64     `json:"duration_ms,omitempty"` // time taken for the health check itself
}
