package service

import (
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service/engine"
)

// HealthService manages skill health metrics and history snapshots.
type HealthService struct {
	db *gorm.DB
}

func NewHealthService(db *gorm.DB) *HealthService {
	return &HealthService{db: db}
}

// UpdateSkillMetrics applies the feedback loop after a skill node completes.
//
// Sliding-average formulas (per the issue spec):
//   - success_rate: newRate = oldRate + (1-oldRate)/total  (success)
//                    newRate = oldRate * (1 - 1/total)      (failure)
//   - avg_latency:  (oldAvg*3 + newLatency) / 4
//   - call_count:   call_count + 1
//   - total_tokens: total_tokens + tokensUsed
//   - error_count:  error_count + 1  (failure only)
//   - last_used_at: now
func (s *HealthService) UpdateSkillMetrics(result engine.NodeResult) {
	skill, err := s.getSkill(result.SkillID)
	if err != nil {
		return
	}

	total := skill.CallCount + 1 // total attempts after this one

	// --- success_rate (sliding average) ---
	if result.Success {
		skill.SuccessRate = skill.SuccessRate + (1-skill.SuccessRate)/float64(total)
	} else {
		if total > 0 {
			skill.SuccessRate = skill.SuccessRate * (1 - 1/float64(total))
		}
		skill.ErrorCount++
	}

	// --- avg_latency_ms: exponential moving average (weight 3:1) ---
	if skill.AvgLatencyMs == 0 {
		skill.AvgLatencyMs = result.LatencyMs
	} else {
		skill.AvgLatencyMs = (skill.AvgLatencyMs*3 + result.LatencyMs) / 4
	}

	// --- cumulative counters ---
	skill.CallCount++
	skill.TotalTokens += result.TokensUsed

	// --- timestamp ---
	now := time.Now()
	skill.LastUsedAt = &now

	// --- persist ---
	s.db.Model(&model.Skill{}).Where("id = ?", result.SkillID).Updates(map[string]interface{}{
		"success_rate":   skill.SuccessRate,
		"avg_latency_ms": skill.AvgLatencyMs,
		"call_count":     skill.CallCount,
		"total_tokens":   skill.TotalTokens,
		"error_count":    skill.ErrorCount,
		"last_used_at":   skill.LastUsedAt,
	})

	// --- take a health snapshot ---
	s.takeSnapshot(skill)
}

// takeSnapshot writes a health_history record for the skill.
func (s *HealthService) takeSnapshot(skill *model.Skill) {
	report := model.HealthReport{
		ID:           generateHealthID(),
		SkillID:      skill.ID,
		SkillName:    skill.Name,
		HealthScore:  skill.HealthScore,
		HealthGrade:  skill.HealthGrade,
		CallCount:    skill.CallCount,
		SuccessRate:  skill.SuccessRate,
		AvgLatencyMs: skill.AvgLatencyMs,
		TotalTokens:  skill.TotalTokens,
		ErrorCount:   skill.ErrorCount,
		CheckedAt:    time.Now(),
	}
	s.db.Create(&report)
}

// GetHealthHistory returns all health snapshots for a skill, ordered by time ascending.
func (s *HealthService) GetHealthHistory(skillID string) ([]model.HealthReport, error) {
	var reports []model.HealthReport
	err := s.db.Where("skill_id = ?", skillID).Order("checked_at ASC").Find(&reports).Error
	return reports, err
}

// GetSkillHealth returns the current health metrics for a single skill.
func (s *HealthService) GetSkillHealth(skillID string) (*model.Skill, error) {
	return s.getSkill(skillID)
}

func (s *HealthService) getSkill(id string) (*model.Skill, error) {
	var skill model.Skill
	if err := s.db.First(&skill, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &skill, nil
}

func generateHealthID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 12)
	for i := range b {
		b[i] = chars[time.Now().UnixNano()%int64(len(chars))]
		time.Sleep(1) // ensure different nanoseeds
	}
	return string(b)
}
