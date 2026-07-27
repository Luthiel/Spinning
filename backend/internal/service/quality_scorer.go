package service

import (
	"fmt"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

// QualityScorer evaluates skills across 5 dimensions
type QualityScorer struct {
	embeddingSvc *EmbeddingService
}

// NewQualityScorer creates a new QualityScorer
func NewQualityScorer(embeddingSvc *EmbeddingService) *QualityScorer {
	return &QualityScorer{embeddingSvc: embeddingSvc}
}

// Dimension weights per the RFC spec
const (
	WeightDescriptionClarity = 0.20
	WeightIOContract         = 0.20
	WeightUniqueness         = 0.20
	WeightUsageActivity      = 0.20
	WeightReliability        = 0.20
)

// Score evaluates a skill and returns dimension scores + overall score
func (qs *QualityScorer) Score(skill *model.Skill, allSkills []model.Skill) *model.SkillHealthReport {
	dimensions := []model.DimensionScore{
		qs.scoreDescriptionClarity(skill),
		qs.scoreIOContract(skill),
		qs.scoreUniqueness(skill, allSkills),
		qs.scoreUsageActivity(skill),
		qs.scoreReliability(skill),
	}

	// Weighted sum
	var overallScore float64
	for _, d := range dimensions {
		overallScore += d.Score * d.Weight
	}

	grade := scoreToGrade(overallScore, skill)

	// Compute redundancy info
	redundancyScore, redundantWith := qs.computeRedundancy(skill, allSkills)

	return &model.SkillHealthReport{
		ID:              generateID(),
		SkillID:         skill.ID,
		SkillName:       skill.Name,
		OverallScore:    overallScore,
		Grade:           grade,
		Dimensions:      dimensions,
		RedundancyScore: redundancyScore,
		RedundantWith:   redundantWith,
		CreatedAt:       time.Now(),
	}
}

// --- Dimension scorers ---

// scoreDescriptionClarity checks description length, name repetition, capabilities/category emptiness
func (qs *QualityScorer) scoreDescriptionClarity(skill *model.Skill) model.DimensionScore {
	score := 1.0
	var reasons []string

	// Empty description penalty
	if skill.Description == "" {
		score -= 0.4
		reasons = append(reasons, "no description")
	} else if len(skill.Description) < 10 {
		score -= 0.2
		reasons = append(reasons, "very short description")
	}

	// Description just repeats the name
	if skill.Description != "" && strings.EqualFold(strings.TrimSpace(skill.Description), strings.TrimSpace(skill.Name)) {
		score -= 0.3
		reasons = append(reasons, "description duplicates name")
	}

	// No capabilities
	if len(skill.Capabilities) == 0 {
		score -= 0.2
		reasons = append(reasons, "no capabilities declared")
	}

	// No category
	if len(skill.Category) == 0 {
		score -= 0.2
		reasons = append(reasons, "no category")
	}

	return model.DimensionScore{
		Name:      "description_clarity",
		Weight:    WeightDescriptionClarity,
		Score:     clampScore(score),
		Rationale: strings.Join(reasons, "; "),
	}
}

// scoreIOContract checks InputSchema/OutputSchema presence and properties/required
func (qs *QualityScorer) scoreIOContract(skill *model.Skill) model.DimensionScore {
	score := 1.0
	var reasons []string

	// InputSchema checks
	if skill.InputSchema == nil || len(skill.InputSchema) == 0 {
		score -= 0.3
		reasons = append(reasons, "missing InputSchema")
	} else {
		if props, ok := skill.InputSchema["properties"].(map[string]interface{}); !ok || len(props) == 0 {
			score -= 0.15
			reasons = append(reasons, "InputSchema has no properties")
		}
		if _, ok := skill.InputSchema["required"].([]interface{}); !ok || len(skill.InputSchema["required"].([]interface{})) == 0 {
			score -= 0.1
			reasons = append(reasons, "InputSchema has no required fields")
		}
	}

	// OutputSchema checks
	if skill.OutputSchema == nil || len(skill.OutputSchema) == 0 {
		score -= 0.3
		reasons = append(reasons, "missing OutputSchema")
	} else {
		if props, ok := skill.OutputSchema["properties"].(map[string]interface{}); !ok || len(props) == 0 {
			score -= 0.15
			reasons = append(reasons, "OutputSchema has no properties")
		}
	}

	return model.DimensionScore{
		Name:      "io_contract",
		Weight:    WeightIOContract,
		Score:     clampScore(score),
		Rationale: strings.Join(reasons, "; "),
	}
}

// scoreUniqueness computes how unique a skill is vs others (low redundancy = high score)
func (qs *QualityScorer) scoreUniqueness(skill *model.Skill, allSkills []model.Skill) model.DimensionScore {
	if len(allSkills) <= 1 {
		return model.DimensionScore{
			Name:      "uniqueness",
			Weight:    WeightUniqueness,
			Score:     1.0,
			Rationale: "only skill in system",
		}
	}

	maxOverlap := 0.0
	var mostSimilar string
	for _, other := range allSkills {
		if other.ID == skill.ID {
			continue
		}
		overlap := capabilityOverlapRatio(skill.Capabilities, other.Capabilities)
		if overlap > maxOverlap {
			maxOverlap = overlap
			mostSimilar = other.Name
		}
	}

	score := 1.0 - maxOverlap
	rationale := fmt.Sprintf("max capability overlap: %.0f%% with %s", maxOverlap*100, mostSimilar)

	return model.DimensionScore{
		Name:      "uniqueness",
		Weight:    WeightUniqueness,
		Score:     clampScore(score),
		Rationale: rationale,
	}
}

// scoreUsageActivity scores based on call count and recency of use
func (qs *QualityScorer) scoreUsageActivity(skill *model.Skill) model.DimensionScore {
	score := 0.0
	var reasons []string

	// Call count tiers
	switch {
	case skill.CallCount >= 1000:
		score = 1.0
		reasons = append(reasons, fmt.Sprintf("high usage: %d calls", skill.CallCount))
	case skill.CallCount >= 500:
		score = 0.8
		reasons = append(reasons, fmt.Sprintf("moderate usage: %d calls", skill.CallCount))
	case skill.CallCount >= 100:
		score = 0.6
		reasons = append(reasons, fmt.Sprintf("low usage: %d calls", skill.CallCount))
	case skill.CallCount > 0:
		score = 0.4
		reasons = append(reasons, fmt.Sprintf("minimal usage: %d calls", skill.CallCount))
	default:
		score = 0.0
		reasons = append(reasons, "no calls recorded")
	}

	// Recency penalty
	if skill.LastUsedAt != nil {
		daysSinceUse := time.Since(*skill.LastUsedAt).Hours() / 24
		if daysSinceUse > 90 {
			score *= 0.6
			reasons = append(reasons, fmt.Sprintf("unused for %.0f days", daysSinceUse))
		} else if daysSinceUse > 30 {
			score *= 0.8
			reasons = append(reasons, fmt.Sprintf("last used %.0f days ago", daysSinceUse))
		}
	} else if skill.CallCount > 0 {
		// Has calls but no LastUsedAt — mild penalty
		score *= 0.9
	}

	return model.DimensionScore{
		Name:      "usage_activity",
		Weight:    WeightUsageActivity,
		Score:     clampScore(score),
		Rationale: strings.Join(reasons, "; "),
	}
}

// scoreReliability scores based on success rate and error count
func (qs *QualityScorer) scoreReliability(skill *model.Skill) model.DimensionScore {
	// If no calls, return untested
	if skill.CallCount == 0 {
		return model.DimensionScore{
			Name:      "reliability",
			Weight:    WeightReliability,
			Score:     0.0,
			Rationale: "untested: no call data",
		}
	}

	var score float64

	// Success rate is primary signal
	if skill.SuccessRate > 0 {
		score = skill.SuccessRate
	} else {
		// Default to 1.0 if no error data
		score = 1.0
	}

	// Absolute error count penalty
	if skill.ErrorCount > 50 {
		score *= 0.5
	} else if skill.ErrorCount > 20 {
		score *= 0.7
	} else if skill.ErrorCount > 5 {
		score *= 0.85
	}

	reason := fmt.Sprintf("success_rate=%.2f, errors=%d", skill.SuccessRate, skill.ErrorCount)

	return model.DimensionScore{
		Name:      "reliability",
		Weight:    WeightReliability,
		Score:     clampScore(score),
		Rationale: reason,
	}
}

// --- Redundancy ---

// computeRedundancy checks embedding-based and capability-based overlap
func (qs *QualityScorer) computeRedundancy(skill *model.Skill, allSkills []model.Skill) (float64, []string) {
	if len(allSkills) <= 1 {
		return 0.0, nil
	}

	maxSimilarity := 0.0
	var redundantIDs []string

	for _, other := range allSkills {
		if other.ID == skill.ID {
			continue
		}

		// Capability-based overlap
		capRatio := capabilityOverlapRatio(skill.Capabilities, other.Capabilities)

		// Embedding-based similarity (if both have embeddings)
		embedSim := 0.0
		if len(skill.Embedding) == 128 && len(other.Embedding) == 128 {
			embedSim = CosineSimilarity(skill.Embedding, other.Embedding)
		}

		// Combined similarity (capability + embedding, weighted)
		combined := capRatio*0.5 + embedSim*0.5
		if combined > maxSimilarity {
			maxSimilarity = combined
		}

		if combined > 0.7 {
			redundantIDs = append(redundantIDs, other.ID)
		}
	}

	return maxSimilarity, redundantIDs
}

// --- Grading ---

func scoreToGrade(score float64, skill *model.Skill) model.HealthGrade {
	// Untested skills get a special grade
	if skill.CallCount == 0 {
		return model.GradeUntested
	}

	switch {
	case score >= 0.8:
		return model.GradeA
	case score >= 0.6:
		return model.GradeB
	case score >= 0.4:
		return model.GradeC
	case score >= 0.2:
		return model.GradeD
	default:
		return model.GradeF
	}
}

func clampScore(s float64) float64 {
	if s < 0 {
		return 0
	}
	if s > 1 {
		return 1
	}
	return s
}
