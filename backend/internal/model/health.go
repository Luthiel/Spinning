package model

import "time"

// HealthReport represents a health check report for a skill
type HealthReport struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	SkillID         string    `gorm:"not null;index" json:"skill_id"`
	SkillName       string    `gorm:"not null" json:"skill_name"`
	HealthScore     float64   `json:"health_score"`
	HealthGrade     string    `json:"health_grade"`
	Dimensions      JSONMap   `gorm:"type:text" json:"dimensions"`
	Issues          JSONMap   `gorm:"type:text" json:"issues"`
	Recommendations JSONMap   `gorm:"type:text" json:"recommendations"`
	CheckedAt       time.Time `gorm:"index" json:"checked_at"`
	DurationMs      int64     `json:"duration_ms"`
	CreatedAt       time.Time `json:"created_at"`
}

// RedundancyReport represents a redundancy analysis between two skills
type RedundancyReport struct {
	ID                   string    `gorm:"primaryKey" json:"id"`
	SkillAID             string    `gorm:"not null;index" json:"skill_a_id"`
	SkillAName           string    `gorm:"not null" json:"skill_a_name"`
	SkillBID             string    `gorm:"not null;index" json:"skill_b_id"`
	SkillBName           string    `gorm:"not null" json:"skill_b_name"`
	CapabilityOverlap    float64   `json:"capability_overlap"`
	SemanticSimilarity   float64   `json:"semantic_similarity"`
	SchemaCompatibility  float64   `json:"schema_compatibility"`
	Recommendation       string    `json:"recommendation"`
	Reason               string    `json:"reason"`
	CreatedAt            time.Time `json:"created_at"`
}
