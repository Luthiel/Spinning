package service

import (
	"fmt"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

// HealthService orchestrates health checks across all skills
type HealthService struct {
	db            *gorm.DB
	embeddingSvc  *EmbeddingService
	qualityScorer *QualityScorer
}

// NewHealthService creates a new HealthService
func NewHealthService(db *gorm.DB) *HealthService {
	embSvc := NewEmbeddingService()
	scorer := NewQualityScorer(embSvc)
	return &HealthService{
		db:            db,
		embeddingSvc:  embSvc,
		qualityScorer: scorer,
	}
}

// CheckSkill runs a full health check on a single skill
func (hs *HealthService) CheckSkill(skillID string) (*model.SkillHealthReport, error) {
	var skill model.Skill
	if err := hs.db.First(&skill, "id = ?", skillID).Error; err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}

	// Ensure embedding exists
	if len(skill.Embedding) != 128 {
		vec, err := hs.embeddingSvc.EmbedSkill(&skill)
		if err == nil {
			skill.Embedding = vec
			// Cache embedding
			hs.db.Model(&skill).Where("id = ?", skill.ID).Update("embedding", model.Float64Slice(vec))
		}
	}

	// Load all skills for redundancy detection
	var allSkills []model.Skill
	if err := hs.db.Find(&allSkills).Error; err != nil {
		return nil, fmt.Errorf("failed to load skills: %w", err)
	}

	report := hs.qualityScorer.Score(&skill, allSkills)
	return report, nil
}

// CheckAll runs health checks on all skills
func (hs *HealthService) CheckAll() ([]model.SkillHealthReport, error) {
	var skills []model.Skill
	if err := hs.db.Find(&skills).Error; err != nil {
		return nil, fmt.Errorf("failed to load skills: %w", err)
	}

	reports := make([]model.SkillHealthReport, 0, len(skills))

	for i := range skills {
		skill := &skills[i]

		// Ensure embedding exists
		if len(skill.Embedding) != 128 {
			vec, err := hs.embeddingSvc.EmbedSkill(skill)
			if err == nil {
				skill.Embedding = vec
				hs.db.Model(skill).Where("id = ?", skill.ID).Update("embedding", model.Float64Slice(vec))
			}
		}

		report := hs.qualityScorer.Score(skill, skills)
		reports = append(reports, *report)
	}

	return reports, nil
}

// GetReport retrieves a previously generated health report for a skill
// Since we don't persist reports, we regenerate on the fly
func (hs *HealthService) GetReport(skillID string) (*model.SkillHealthReport, error) {
	return hs.CheckSkill(skillID)
}

// GetSummary returns the global health summary
func (hs *HealthService) GetSummary() (*model.HealthSummary, error) {
	var skills []model.Skill
	if err := hs.db.Find(&skills).Error; err != nil {
		return nil, fmt.Errorf("failed to load skills: %w", err)
	}

	if len(skills) == 0 {
		return &model.HealthSummary{
			TotalSkills:       0,
			GradeDistribution: map[string]int{},
			AverageScore:      0,
			RedundantCount:    0,
		}, nil
	}

	// Ensure embeddings exist
	for i := range skills {
		if len(skills[i].Embedding) != 128 {
			vec, err := hs.embeddingSvc.EmbedSkill(&skills[i])
			if err == nil {
				skills[i].Embedding = vec
				hs.db.Model(&skills[i]).Where("id = ?", skills[i].ID).Update("embedding", model.Float64Slice(vec))
			}
		}
	}

	gradeDist := map[string]int{
		"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "untested": 0,
	}
	var totalScore float64
	redundantCount := 0

	for i := range skills {
		report := hs.qualityScorer.Score(&skills[i], skills)
		gradeDist[string(report.Grade)]++
		totalScore += report.OverallScore
		if report.RedundancyScore > 0.7 {
			redundantCount++
		}
	}

	var lastChecked *time.Time
	now := time.Now()
	lastChecked = &now

	return &model.HealthSummary{
		TotalSkills:       len(skills),
		GradeDistribution: gradeDist,
		AverageScore:      totalScore / float64(len(skills)),
		RedundantCount:    redundantCount,
		LastCheckedAt:     lastChecked,
	}, nil
}
