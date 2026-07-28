package service

import (
	"testing"
	"time"

	"spinning/backend/internal/model"
)

func makeScorer() *QualityScorer {
	return NewQualityScorer(NewEmbeddingService())
}

func fullyDefinedSkill() *model.Skill {
	now := time.Now()
	return &model.Skill{
		ID:           "test-skill",
		Name:         "Test Skill",
		Description:  "A well-defined test skill for unit testing purposes",
		Capabilities: model.StringSlice{"testing", "validation"},
		Category:     model.StringSlice{"quality"},
		InputSchema: model.JSONMap{
			"type":       "object",
			"properties": map[string]interface{}{"input": map[string]interface{}{"type": "string"}},
			"required":   []interface{}{"input"},
		},
		OutputSchema: model.JSONMap{
			"type":       "object",
			"properties": map[string]interface{}{"result": map[string]interface{}{"type": "string"}},
		},
		CallCount:  500,
		ErrorCount: 2,
		SuccessRate: 0.98,
		LastUsedAt: &now,
		Status:     "active",
	}
}

func TestScore_FullyDefined(t *testing.T) {
	scorer := makeScorer()
	skill := fullyDefinedSkill()
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	if report.Grade == model.GradeUntested {
		t.Fatal("fully defined skill should not be untested")
	}
	if report.OverallScore <= 0 || report.OverallScore > 1 {
		t.Fatalf("score out of range: %f", report.OverallScore)
	}
	if len(report.Dimensions) != 5 {
		t.Fatalf("expected 5 dimensions, got %d", len(report.Dimensions))
	}

	// Check all dimension weights sum to 1.0
	var totalWeight float64
	for _, d := range report.Dimensions {
		totalWeight += d.Weight
	}
	if totalWeight < 0.99 || totalWeight > 1.01 {
		t.Fatalf("dimension weights should sum to 1.0, got %f", totalWeight)
	}
}

func TestScore_UntestedSkill(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:    "untested",
		Name:  "Untested Skill",
		CallCount: 0,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	if report.Grade != model.GradeUntested {
		t.Fatalf("expected untested grade, got %s", report.Grade)
	}
}

func TestScore_DescriptionClarity_NoDescription(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:   "no-desc",
		Name: "No Description Skill",
		CallCount: 100,
		SuccessRate: 1.0,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	// Find description_clarity dimension
	for _, d := range report.Dimensions {
		if d.Name == "description_clarity" {
			if d.Score >= 0.8 {
				t.Fatalf("skill without description should score low on clarity, got %f", d.Score)
			}
			return
		}
	}
	t.Fatal("description_clarity dimension not found")
}

func TestScore_DescriptionClarity_DuplicatesName(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:          "dup-name",
		Name:        "My Skill",
		Description: "My Skill",
		CallCount:   100,
		SuccessRate: 1.0,
		InputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		Capabilities: model.StringSlice{"test"},
		Category:    model.StringSlice{"test"},
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "description_clarity" {
			if d.Score >= 0.7 {
				t.Fatalf("skill with duplicate name/description should score lower, got %f", d.Score)
			}
			if d.Rationale == "" {
				t.Fatal("rationale should not be empty")
			}
			return
		}
	}
}

func TestScore_IOContract_MissingBoth(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:           "no-io",
		Name:         "No IO Skill",
		Description:  "Has description",
		Capabilities: model.StringSlice{"test"},
		Category:     model.StringSlice{"test"},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "io_contract" {
			if d.Score >= 0.5 {
				t.Fatalf("skill without IO schemas should score low on IO contract, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_IOContract_Partial(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:          "partial-io",
		Name:        "Partial IO Skill",
		Description: "Has description",
		InputSchema: model.JSONMap{
			"type":       "object",
			"properties": map[string]interface{}{"x": nil},
			"required":   []interface{}{"x"},
		},
		// No OutputSchema
		Capabilities: model.StringSlice{"test"},
		Category:     model.StringSlice{"test"},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "io_contract" {
			if d.Score < 0.2 || d.Score > 0.8 {
				t.Fatalf("partial IO should score medium, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_UsageActivity_Tiers(t *testing.T) {
	scorer := makeScorer()
	now := time.Now()

	tests := []struct {
		name       string
		callCount  int64
		lastUsed   *time.Time
		minScore   float64
		maxScore   float64
	}{
		{"high usage", 1000, &now, 0.9, 1.0},
		{"moderate usage", 500, &now, 0.7, 0.9},
		{"low usage", 100, &now, 0.5, 0.7},
		{"minimal usage", 10, &now, 0.3, 0.5},
		{"no usage", 0, &now, 0.0, 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			skill := &model.Skill{
				ID:          "test",
				Name:        "Test",
				Description: "Test skill with description",
				Capabilities: model.StringSlice{"test"},
				Category:     model.StringSlice{"test"},
				InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
				OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
				CallCount:    tt.callCount,
				ErrorCount:   0,
				SuccessRate:  1.0,
				LastUsedAt:   tt.lastUsed,
			}
			allSkills := []model.Skill{*skill}

			report := scorer.Score(skill, allSkills)

			for _, d := range report.Dimensions {
				if d.Name == "usage_activity" {
					if d.Score < tt.minScore || d.Score > tt.maxScore {
						t.Fatalf("%s: expected score in [%f, %f], got %f", tt.name, tt.minScore, tt.maxScore, d.Score)
					}
					return
				}
			}
		})
	}
}

func TestScore_UsageActivity_RecencyPenalty(t *testing.T) {
	scorer := makeScorer()
	old := time.Now().Add(-100 * 24 * time.Hour) // 100 days ago

	skill := &model.Skill{
		ID:           "old-use",
		Name:         "Old Use Skill",
		Description:  "Description",
		Capabilities: model.StringSlice{"test"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    1000,
		ErrorCount:   0,
		SuccessRate:  1.0,
		LastUsedAt:   &old,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "usage_activity" {
			// High usage but old should be penalized
			if d.Score > 0.7 {
				t.Fatalf("old usage should be penalized, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_Reliability_HighErrors(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:           "err-skill",
		Name:         "Error Skill",
		Description:  "Description",
		Capabilities: model.StringSlice{"test"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		ErrorCount:   60,
		SuccessRate:  0.5,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "reliability" {
			if d.Score > 0.3 {
				t.Fatalf("skill with many errors should score low on reliability, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_Reliability_Untested(t *testing.T) {
	scorer := makeScorer()
	skill := &model.Skill{
		ID:    "untested-rel",
		Name:  "Untested Reliability",
		CallCount: 0,
	}
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "reliability" {
			if d.Rationale != "untested: no call data" {
				t.Fatalf("expected untested rationale, got %q", d.Rationale)
			}
			return
		}
	}
}

func TestScore_Uniqueness_DuplicateCapabilities(t *testing.T) {
	scorer := makeScorer()
	skillA := &model.Skill{
		ID:           "skill-a",
		Name:         "Skill A",
		Description:  "Description A",
		Capabilities: model.StringSlice{"cap1", "cap2", "cap3"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	skillB := &model.Skill{
		ID:           "skill-b",
		Name:         "Skill B",
		Description:  "Description B",
		Capabilities: model.StringSlice{"cap1", "cap2", "cap3"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	allSkills := []model.Skill{*skillA, *skillB}

	report := scorer.Score(skillA, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "uniqueness" {
			if d.Score > 0.1 {
				t.Fatalf("skill with identical capabilities should have low uniqueness, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_Uniqueness_Unique(t *testing.T) {
	scorer := makeScorer()
	skillA := &model.Skill{
		ID:           "skill-unique-a",
		Name:         "Unique A",
		Description:  "Description A",
		Capabilities: model.StringSlice{"translation"},
		Category:     model.StringSlice{"nlp"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	skillB := &model.Skill{
		ID:           "skill-unique-b",
		Name:         "Unique B",
		Description:  "Description B",
		Capabilities: model.StringSlice{"image-processing"},
		Category:     model.StringSlice{"vision"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	allSkills := []model.Skill{*skillA, *skillB}

	report := scorer.Score(skillA, allSkills)

	for _, d := range report.Dimensions {
		if d.Name == "uniqueness" {
			if d.Score < 0.9 {
				t.Fatalf("skill with unique capabilities should have high uniqueness, got %f", d.Score)
			}
			return
		}
	}
}

func TestScore_GradeMapping(t *testing.T) {
	tests := []struct {
		score float64
		calls int64
		grade model.HealthGrade
	}{
		{0.9, 100, model.GradeA},
		{0.7, 100, model.GradeB},
		{0.5, 100, model.GradeC},
		{0.3, 100, model.GradeD},
		{0.1, 100, model.GradeF},
		{0.9, 0, model.GradeUntested},
	}

	for _, tt := range tests {
		skill := &model.Skill{CallCount: tt.calls}
		grade := scoreToGrade(tt.score, skill)
		if grade != tt.grade {
			t.Fatalf("score %.1f with %d calls: expected grade %s, got %s", tt.score, tt.calls, tt.grade, grade)
		}
	}
}

func TestClampScore(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{-0.5, 0},
		{0, 0},
		{0.5, 0.5},
		{1, 1},
		{1.5, 1},
	}
	for _, tt := range tests {
		result := clampScore(tt.input)
		if result != tt.expected {
			t.Fatalf("clampScore(%f) = %f, expected %f", tt.input, result, tt.expected)
		}
	}
}

func TestScore_WeightsSumToOne(t *testing.T) {
	scorer := makeScorer()
	skill := fullyDefinedSkill()
	allSkills := []model.Skill{*skill}

	report := scorer.Score(skill, allSkills)

	var totalWeight float64
	for _, d := range report.Dimensions {
		totalWeight += d.Weight
	}
	if totalWeight < 0.99 || totalWeight > 1.01 {
		t.Fatalf("dimension weights should sum to 1.0, got %f", totalWeight)
	}
}

func TestScore_Redundancy(t *testing.T) {
	scorer := makeScorer()
	skillA := &model.Skill{
		ID:           "redun-a",
		Name:         "Redundant A",
		Description:  "Description A",
		Capabilities: model.StringSlice{"cap1", "cap2"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	skillB := &model.Skill{
		ID:           "redun-b",
		Name:         "Redundant B",
		Description:  "Description B",
		Capabilities: model.StringSlice{"cap1", "cap2"},
		Category:     model.StringSlice{"test"},
		InputSchema:  model.JSONMap{"type": "object", "properties": map[string]interface{}{"x": nil}, "required": []interface{}{"x"}},
		OutputSchema: model.JSONMap{"type": "object", "properties": map[string]interface{}{"y": nil}},
		CallCount:    100,
		SuccessRate:  1.0,
	}
	allSkills := []model.Skill{*skillA, *skillB}

	report := scorer.Score(skillA, allSkills)

	// Without embeddings, redundancy is capability-only: capOverlap * 0.5 = 1.0 * 0.5 = 0.5
	if report.RedundancyScore < 0.4 {
		t.Fatalf("skills with identical capabilities should have non-trivial redundancy, got %f", report.RedundancyScore)
	}
}
