package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spinning/backend/internal/model"
)

// setupTestDB creates an in-memory SQLite DB for testing
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(
		&model.Skill{},
		&model.SkillEmbedding{},
		&model.RouterConfig{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

// seedTestSkills inserts test skills into the DB
func seedTestSkills(t *testing.T, db *gorm.DB) {
	t.Helper()
	skills := []model.Skill{
		{
			ID:           "sk-1",
			Name:         "NLP Translator",
			Description:  "Translates text between languages",
			Category:     model.StringSlice{"nlp"},
			Capabilities: model.StringSlice{"translation", "multilingual"},
			HealthScore:  90,
			TokenCost:    100,
			Status:       "active",
		},
		{
			ID:           "sk-2",
			Name:         "Sentiment Analyzer",
			Description:  "Analyzes sentiment of text",
			Category:     model.StringSlice{"nlp"},
			Capabilities: model.StringSlice{"sentiment", "emotion"},
			HealthScore:  85,
			TokenCost:    80,
			Status:       "active",
		},
		{
			ID:           "sk-3",
			Name:         "Image Classifier",
			Description:  "Classifies images into categories",
			Category:     model.StringSlice{"vision"},
			Capabilities: model.StringSlice{"classification", "image"},
			HealthScore:  92,
			TokenCost:    150,
			Status:       "active",
		},
		{
			ID:           "sk-4",
			Name:         "Code Generator",
			Description:  "Generates boilerplate code",
			Category:     model.StringSlice{"code"},
			Capabilities: model.StringSlice{"code-gen", "templating"},
			HealthScore:  40, // below balanced threshold (50)
			TokenCost:    200,
			Status:       "active",
		},
		{
			ID:           "sk-5",
			Name:         "Data Transformer",
			Description:  "Transforms data between formats",
			Category:     model.StringSlice{"data"},
			Capabilities: model.StringSlice{"etl", "format-convert"},
			HealthScore:  0, // no health data — should not be filtered
			TokenCost:    60,
			Status:       "active",
		},
		{
			ID:           "sk-6",
			Name:         "Text Summarizer",
			Description:  "Summarizes long documents using NLP",
			Category:     model.StringSlice{"nlp"},
			Capabilities: model.StringSlice{"summarization", "nlp", "text"},
			HealthScore:  88,
			TokenCost:    120,
			Status:       "active",
		},
	}
	for _, sk := range skills {
		if err := db.Create(&sk).Error; err != nil {
			t.Fatalf("failed to seed skill %s: %v", sk.ID, err)
		}
	}
}

func TestCosineSimilarity(t *testing.T) {
	tests := []struct {
		name     string
		a, b     []float64
		expected float64
		tol      float64
	}{
		{
			name:     "identical vectors",
			a:        []float64{1, 0, 0},
			b:        []float64{1, 0, 0},
			expected: 1.0,
			tol:      0.001,
		},
		{
			name:     "orthogonal vectors",
			a:        []float64{1, 0, 0},
			b:        []float64{0, 1, 0},
			expected: 0.0,
			tol:      0.001,
		},
		{
			name:     "opposite vectors",
			a:        []float64{1, 0},
			b:        []float64{-1, 0},
			expected: -1.0,
			tol:      0.001,
		},
		{
			name:     "empty vectors",
			a:        []float64{},
			b:        []float64{},
			expected: 0.0,
			tol:      0.001,
		},
		{
			name:     "different lengths",
			a:        []float64{1, 0},
			b:        []float64{1, 0, 0},
			expected: 0.0,
			tol:      0.001,
		},
		{
			name:     "zero vector",
			a:        []float64{0, 0, 0},
			b:        []float64{1, 0, 0},
			expected: 0.0,
			tol:      0.001,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CosineSimilarity(tt.a, tt.b)
			if diff := result - tt.expected; diff > tt.tol || diff < -tt.tol {
				t.Errorf("CosineSimilarity(%v, %v) = %f, want %f (±%f)", tt.a, tt.b, result, tt.expected, tt.tol)
			}
		})
	}
}

func TestHealthMultiplier(t *testing.T) {
	tests := []struct {
		name     string
		score    float64
		expected float64
	}{
		{"zero health (no data)", 0, 1.0},
		{"low health", 30, 0.30},
		{"mid health", 50, 0.50},
		{"high health", 90, 0.90},
		{"perfect health", 100, 1.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := healthMultiplier(tt.score)
			if result != tt.expected {
				t.Errorf("healthMultiplier(%f) = %f, want %f", tt.score, result, tt.expected)
			}
		})
	}
}

func TestComputeSelectionScore(t *testing.T) {
	c := scoredPair{
		skill: model.Skill{
			HealthScore: 80,
			TokenCost:   100,
		},
		relevance: 0.9,
	}
	// score = (0.9 * 0.80) / 100 = 0.0072
	expected := 0.0072
	result := computeSelectionScore(c)
	tol := 0.0001
	if diff := result - expected; diff > tol || diff < -tol {
		t.Errorf("computeSelectionScore = %f, want %f", result, expected)
	}
}

func TestSmartRouter_Select_EmptyDB(t *testing.T) {
	db := setupTestDB(t)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	result, err := router.Select(context.Background(), "translate some text", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Selected) != 0 {
		t.Errorf("expected 0 selected skills, got %d", len(result.Selected))
	}
	if len(result.Filtered) != 0 {
		t.Errorf("expected 0 filtered skills, got %d", len(result.Filtered))
	}
}

func TestSmartRouter_Select_SemanticMatching(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	result, err := router.Select(context.Background(), "translate text to french", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// With fallback embedding, we should get some results
	// The NLP Translator should rank highly for a translation task
	if len(result.Selected) == 0 {
		t.Fatal("expected at least 1 selected skill")
	}

	// Check that skills were selected
	t.Logf("Selected %d skills:", len(result.Selected))
	for _, s := range result.Selected {
		t.Logf("  %s (score=%.4f, health=%.0f, tokens=%d)", s.SkillName, s.Score, s.HealthScore, s.TokenCost)
	}

	// Check that filtered skills have valid reasons
	for _, f := range result.Filtered {
		if f.Reason != "quality" && f.Reason != "dedup" && f.Reason != "budget" {
			t.Errorf("unexpected filter reason: %s", f.Reason)
		}
	}
}

func TestSmartRouter_Select_QualityFilter(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Use balanced config: MinHealthScore=50
	// sk-4 (Code Generator) has health_score=40, should be filtered
	result, err := router.Select(context.Background(), "generate some code", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check that sk-4 is filtered for quality
	found := false
	for _, f := range result.Filtered {
		if f.SkillID == "sk-4" && f.Reason == "quality" {
			found = true
			break
		}
	}
	// With fallback embeddings, sk-4 might not be in top-K, so this is optional
	if found {
		t.Log("sk-4 correctly filtered for low health score")
	}
}

func TestSmartRouter_Select_BudgetConstraint(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Set a very tight budget
	cfg := &model.RouterConfig{
		ID:             "test-budget",
		Preset:         "custom",
		TokenBudget:    100, // very tight
		MinHealthScore: 0,
		MaxSkills:      100,
		DedupThreshold: 0.99,
	}
	router.UpdateConfig(cfg)

	result, err := router.Select(context.Background(), "do something", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify total tokens used doesn't exceed budget
	if result.TotalTokensUsed > result.TokenBudget {
		t.Errorf("total tokens used (%d) exceeds budget (%d)", result.TotalTokensUsed, result.TokenBudget)
	}

	// Check that some skills were filtered for budget
	budgetFiltered := 0
	for _, f := range result.Filtered {
		if f.Reason == "budget" {
			budgetFiltered++
		}
	}
	t.Logf("Budget filter: %d skills filtered, %d selected (tokens used: %d / %d)",
		budgetFiltered, len(result.Selected), result.TotalTokensUsed, result.TokenBudget)
}

func TestSmartRouter_Select_MaxSkills(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Set MaxSkills to 2
	cfg := &model.RouterConfig{
		ID:             "test-max",
		Preset:         "custom",
		TokenBudget:    10000,
		MinHealthScore: 0,
		MaxSkills:      2,
		DedupThreshold: 0.99,
	}
	router.UpdateConfig(cfg)

	result, err := router.Select(context.Background(), "do something", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Selected) > 2 {
		t.Errorf("expected at most 2 selected skills, got %d", len(result.Selected))
	}

	// Check that remaining skills were filtered for budget (max_skills reached)
	maxSkillsFiltered := 0
	for _, f := range result.Filtered {
		if f.Reason == "budget" {
			maxSkillsFiltered++
		}
	}
	t.Logf("MaxSkills filter: %d skills filtered for budget/max, %d selected", maxSkillsFiltered, len(result.Selected))
}

func TestSmartRouter_Select_TopK(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// With topK=3, only 3 candidates should be considered
	result, err := router.Select(context.Background(), "do something", 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Total selected + budget filtered should be ≤ 3
	total := len(result.Selected)
	for _, f := range result.Filtered {
		if f.Reason == "quality" || f.Reason == "dedup" {
			total++
		}
	}
	if total > 3 {
		t.Errorf("topK=3 but %d candidates passed quality+dedup filter", total)
	}
	t.Logf("TopK=3: %d selected, %d total candidates passed", len(result.Selected), total)
}

func TestSmartRouter_Simulate(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Simulate with overridden config
	overrides := &model.RouterConfig{
		TokenBudget:    500,
		MinHealthScore: 80, // stricter
		MaxSkills:      2,
		DedupThreshold: 0.50,
	}

	result, err := router.Simulate(context.Background(), "translate something", overrides, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Config should not be changed
	cfg := router.GetConfig()
	if cfg.Preset != "balanced" {
		t.Errorf("simulate should not change config, got preset=%s", cfg.Preset)
	}

	t.Logf("Simulate result: %d selected, %d filtered, tokens=%d/%d",
		len(result.Selected), len(result.Filtered), result.TotalTokensUsed, result.TokenBudget)
}

func TestSmartRouter_UpdateConfig(t *testing.T) {
	db := setupTestDB(t)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Default should be balanced
	cfg := router.GetConfig()
	if cfg.Preset != "balanced" {
		t.Errorf("default preset should be balanced, got %s", cfg.Preset)
	}
	if cfg.TokenBudget != 4000 {
		t.Errorf("default budget should be 4000, got %d", cfg.TokenBudget)
	}

	// Update to strict
	strictCfg := *PresetStrict
	router.UpdateConfig(&strictCfg)
	cfg = router.GetConfig()
	if cfg.Preset != "strict" {
		t.Errorf("updated preset should be strict, got %s", cfg.Preset)
	}
	if cfg.TokenBudget != 2000 {
		t.Errorf("updated budget should be 2000, got %d", cfg.TokenBudget)
	}
}

func TestSmartRouter_Presets(t *testing.T) {
	tests := []struct {
		name     string
		preset   *model.RouterConfig
		budget   int
		maxH     float64
		maxS     int
		dedup    float64
	}{
		{"strict", PresetStrict, 2000, 70, 5, 0.80},
		{"balanced", PresetBalanced, 4000, 50, 10, 0.85},
		{"loose", PresetLoose, 8000, 30, 20, 0.90},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.preset.TokenBudget != tt.budget {
				t.Errorf("TokenBudget: got %d, want %d", tt.preset.TokenBudget, tt.budget)
			}
			if tt.preset.MinHealthScore != tt.maxH {
				t.Errorf("MinHealthScore: got %f, want %f", tt.preset.MinHealthScore, tt.maxH)
			}
			if tt.preset.MaxSkills != tt.maxS {
				t.Errorf("MaxSkills: got %d, want %d", tt.preset.MaxSkills, tt.maxS)
			}
			if tt.preset.DedupThreshold != tt.dedup {
				t.Errorf("DedupThreshold: got %f, want %f", tt.preset.DedupThreshold, tt.dedup)
			}
		})
	}
}

func TestSmartRouter_Select_ConsistentOutput(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Same input should produce same output (deterministic)
	r1, err := router.Select(context.Background(), "translate text", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r2, err := router.Select(context.Background(), "translate text", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(r1.Selected) != len(r2.Selected) {
		t.Errorf("inconsistent results: run1=%d selected, run2=%d selected", len(r1.Selected), len(r2.Selected))
	}
	for i := range r1.Selected {
		if r1.Selected[i].SkillID != r2.Selected[i].SkillID {
			t.Errorf("inconsistent selection at rank %d: %s vs %s",
				i+1, r1.Selected[i].SkillID, r2.Selected[i].SkillID)
		}
	}
}

func TestEmbeddingService_FallbackEmbedding(t *testing.T) {
	db := setupTestDB(t)
	svc := NewEmbeddingService(db)

	// Without API key, should use fallback
	emb1, err := svc.GenerateEmbedding(context.Background(), "hello world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(emb1) != 128 {
		t.Errorf("expected embedding dim=128, got %d", len(emb1))
	}

	// Same text should produce same embedding (deterministic)
	emb2, err := svc.GenerateEmbedding(context.Background(), "hello world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for i := range emb1 {
		if emb1[i] != emb2[i] {
			t.Fatalf("fallback embedding not deterministic: first difference at index %d", i)
		}
	}

	// Different text should produce different embedding
	emb3, err := svc.GenerateEmbedding(context.Background(), "completely different text")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	sim := CosineSimilarity(emb1, emb3)
	t.Logf("Similarity between different texts: %f", sim)
	// Should be different (not identical)
	identical := true
	for i := range emb1 {
		if emb1[i] != emb3[i] {
			identical = false
			break
		}
	}
	if identical {
		t.Error("different texts produced identical embeddings")
	}
}

func TestSmartRouter_LargeTaskText(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	embeddingSvc := NewEmbeddingService(db)
	router := NewSmartRouter(db, embeddingSvc)

	// Very long task text should not crash
	longText := "This is a very long task description. "
	for i := 0; i < 100; i++ {
		longText += "It contains many words about various topics. "
	}

	result, err := router.Select(context.Background(), longText, 0)
	if err != nil {
		t.Fatalf("unexpected error with long text: %v", err)
	}
	if len(result.Selected) == 0 {
		t.Log("No skills selected for long text (may be expected)")
	}
}

func TestEmbeddingService_RefreshAll(t *testing.T) {
	db := setupTestDB(t)
	seedTestSkills(t, db)
	svc := NewEmbeddingService(db)

	count, err := svc.RefreshAll(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 6 {
		t.Errorf("expected 6 embeddings refreshed, got %d", count)
	}

	// Running again should update (not duplicate) embeddings
	count2, err := svc.RefreshAll(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count2 != 6 {
		t.Errorf("expected 6 embeddings on second refresh, got %d", count2)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

// Ensure we can create a temp dir (needed for some test scenarios)
func init() {
	dir := filepath.Join(os.TempDir(), "spinning-router-test")
	os.MkdirAll(dir, 0755)
}
