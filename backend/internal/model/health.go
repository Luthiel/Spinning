package model

import "time"

// HealthGrade represents the letter-grade quality of a skill
type HealthGrade string

const (
	GradeA        HealthGrade = "A"
	GradeB        HealthGrade = "B"
	GradeC        HealthGrade = "C"
	GradeD        HealthGrade = "D"
	GradeF        HealthGrade = "F"
	GradeUntested HealthGrade = "untested"
)

// DimensionScore holds one scoring dimension's result
type DimensionScore struct {
	Name        string  `json:"name"`
	Weight      float64 `json:"weight"`
	Score       float64 `json:"score"` // 0.0–1.0
	Rationale   string  `json:"rationale"`
}

// SkillHealthReport is the full health report for one skill
type SkillHealthReport struct {
	ID              string           `json:"id"`
	SkillID         string           `json:"skill_id"`
	SkillName       string           `json:"skill_name"`
	OverallScore    float64          `json:"overall_score"` // 0.0–1.0
	Grade           HealthGrade      `json:"grade"`
	Dimensions      []DimensionScore `json:"dimensions"`
	RedundancyScore float64          `json:"redundancy_score"` // 0.0 = unique, 1.0 = fully redundant
	RedundantWith   []string         `json:"redundant_with,omitempty"` // skill IDs with high overlap
	CreatedAt       time.Time        `json:"created_at"`
}

// HealthSummary is the global health overview
type HealthSummary struct {
	TotalSkills       int            `json:"total_skills"`
	GradeDistribution map[string]int `json:"grade_distribution"` // "A": 5, "B": 3, etc.
	AverageScore      float64        `json:"average_score"`
	RedundantCount    int            `json:"redundant_count"`
	LastCheckedAt     *time.Time     `json:"last_checked_at,omitempty"`
}
