package service

import (
	"context"
	"fmt"
	"sort"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

// scoredPair pairs a skill with its relevance for internal ranking

type scoredPair struct {
	skill     model.Skill
	relevance float64
}

// Preset configurations
var (
	PresetStrict = &model.RouterConfig{
		ID:             "preset-strict",
		Preset:         "strict",
		TokenBudget:    2000,
		MinHealthScore: 70,
		MaxSkills:      5,
		DedupThreshold: 0.80,
	}
	PresetBalanced = &model.RouterConfig{
		ID:             "preset-balanced",
		Preset:         "balanced",
		TokenBudget:    4000,
		MinHealthScore: 50,
		MaxSkills:      10,
		DedupThreshold: 0.85,
	}
	PresetLoose = &model.RouterConfig{
		ID:             "preset-loose",
		Preset:         "loose",
		TokenBudget:    8000,
		MinHealthScore: 30,
		MaxSkills:      20,
		DedupThreshold: 0.90,
	}
)

// SmartRouter implements the four-step skill selection algorithm
type SmartRouter struct {
	db         *gorm.DB
	embedding  *EmbeddingService
	config     *model.RouterConfig
}

// NewSmartRouter creates a new SmartRouter
func NewSmartRouter(db *gorm.DB, embedding *EmbeddingService) *SmartRouter {
	r := &SmartRouter{
		db:        db,
		embedding: embedding,
		config:    PresetBalanced, // default
	}
	r.loadConfig()
	return r
}

// loadConfig loads the active config from DB, falling back to balanced preset
func (r *SmartRouter) loadConfig() {
	var cfg model.RouterConfig
	if err := r.db.Order("updated_at DESC").First(&cfg).Error; err == nil {
		r.config = &cfg
	}
}

// GetConfig returns the current configuration
func (r *SmartRouter) GetConfig() *model.RouterConfig {
	return r.config
}

// UpdateConfig sets a new configuration
func (r *SmartRouter) UpdateConfig(cfg *model.RouterConfig) {
	r.config = cfg
}

// Select runs the four-step selection algorithm and persists the config
func (r *SmartRouter) Select(ctx context.Context, taskText string, topKOverride int) (*model.RouterSelectResponse, error) {
	return r.selectInternal(ctx, taskText, topKOverride, r.config, true)
}

// Simulate runs the selection algorithm with a temporary config (does not persist)
func (r *SmartRouter) Simulate(ctx context.Context, taskText string, overrides *model.RouterConfig, topKOverride int) (*model.RouterSelectResponse, error) {
	cfg := *r.config
	if overrides != nil {
		if overrides.TokenBudget > 0 {
			cfg.TokenBudget = overrides.TokenBudget
		}
		if overrides.MinHealthScore > 0 {
			cfg.MinHealthScore = overrides.MinHealthScore
		}
		if overrides.MaxSkills > 0 {
			cfg.MaxSkills = overrides.MaxSkills
		}
		if overrides.DedupThreshold > 0 {
			cfg.DedupThreshold = overrides.DedupThreshold
		}
		if overrides.Preset != "" {
			cfg.Preset = overrides.Preset
		}
	}
	return r.selectInternal(ctx, taskText, topKOverride, &cfg, false)
}

// selectInternal implements the four-step algorithm
func (r *SmartRouter) selectInternal(ctx context.Context, taskText string, topKOverride int, cfg *model.RouterConfig, persist bool) (*model.RouterSelectResponse, error) {
	// Default top-K
	topK := 20
	if topKOverride > 0 {
		topK = topKOverride
	}

	// Load all skills with embeddings
	var skills []model.Skill
	if err := r.db.Find(&skills).Error; err != nil {
		return nil, fmt.Errorf("load skills: %w", err)
	}

	if len(skills) == 0 {
		return &model.RouterSelectResponse{
			TaskText:     taskText,
			Selected:     []model.RouterSelectedSkill{},
			Filtered:     []model.RouterFilteredSkill{},
			TokenBudget:  cfg.TokenBudget,
			ConfigPreset: cfg.Preset,
		}, nil
	}

	// Ensure all skills have embeddings
	skillEmbeddings := make(map[string][]float64, len(skills))
	for i := range skills {
		emb, err := r.embedding.GetOrCreateEmbedding(ctx, &skills[i])
		if err != nil {
			continue
		}
		skillEmbeddings[skills[i].ID] = emb
	}

	// Generate task embedding
	taskEmb, err := r.embedding.GenerateEmbedding(ctx, taskText)
	if err != nil {
		return nil, fmt.Errorf("generate task embedding: %w", err)
	}

	// ── Step 1: Semantic Matching ──
	var candidates []scoredPair
	for _, sk := range skills {
		emb, ok := skillEmbeddings[sk.ID]
		if !ok {
			continue
		}
		sim := CosineSimilarity(taskEmb, emb)
		candidates = append(candidates, scoredPair{skill: sk, relevance: sim})
	}

	// Sort by relevance descending, take top-K
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].relevance > candidates[j].relevance
	})
	if len(candidates) > topK {
		candidates = candidates[:topK]
	}

	// ── Step 2: Quality Filtering ──
	var filtered []model.RouterFilteredSkill
	var afterQuality []scoredPair
	for _, c := range candidates {
		if c.skill.HealthScore > 0 && c.skill.HealthScore < cfg.MinHealthScore {
			filtered = append(filtered, model.RouterFilteredSkill{
				SkillID:   c.skill.ID,
				SkillName: c.skill.Name,
				Reason:    "quality",
				Detail:    fmt.Sprintf("health_score %.0f < min_health_score %.0f", c.skill.HealthScore, cfg.MinHealthScore),
			})
			continue
		}
		afterQuality = append(afterQuality, c)
	}

	// ── Step 3: Dedup ──
	var afterDedup []scoredPair
	deduped := make(map[int]bool) // track indices that were kept
	for i, c := range afterQuality {
		if deduped[i] {
			continue
		}
		// Check against all subsequent candidates
		keep := true
		for j := i + 1; j < len(afterQuality); j++ {
			if deduped[j] {
				continue
			}
			// Compare embeddings to find duplicates
			embI, okI := skillEmbeddings[afterQuality[i].skill.ID]
			embJ, okJ := skillEmbeddings[afterQuality[j].skill.ID]
			if okI && okJ {
				sim := CosineSimilarity(embI, embJ)
				if sim > cfg.DedupThreshold {
					// The one with lower score is a duplicate
					// We keep the one with higher relevance × health
					scoreI := c.relevance * healthMultiplier(c.skill.HealthScore)
					scoreJ := afterQuality[j].relevance * healthMultiplier(afterQuality[j].skill.HealthScore)
					if scoreI >= scoreJ {
						filtered = append(filtered, model.RouterFilteredSkill{
							SkillID:   afterQuality[j].skill.ID,
							SkillName: afterQuality[j].skill.Name,
							Reason:    "dedup",
							Detail:    fmt.Sprintf("similarity %.2f > threshold %.2f with %s", sim, cfg.DedupThreshold, c.skill.ID),
						})
						deduped[j] = true
					} else {
						filtered = append(filtered, model.RouterFilteredSkill{
							SkillID:   c.skill.ID,
							SkillName: c.skill.Name,
							Reason:    "dedup",
							Detail:    fmt.Sprintf("similarity %.2f > threshold %.2f with %s", sim, cfg.DedupThreshold, afterQuality[j].skill.ID),
						})
						keep = false
						deduped[i] = true
						break
					}
				}
			}
		}
		if keep && !deduped[i] {
			afterDedup = append(afterDedup, c)
		}
	}

	// ── Step 4: Budget-constrained Greedy Selection ──
	// Score = (relevance × health_score/100) / tokenCost
	// Sort by score descending
	for i := range afterDedup {
		afterDedup[i].relevance = computeSelectionScore(afterDedup[i])
	}
	sort.Slice(afterDedup, func(i, j int) bool {
		return afterDedup[i].relevance > afterDedup[j].relevance
	})

	var selected []model.RouterSelectedSkill
	totalTokens := 0
	for i, c := range afterDedup {
		tk := c.skill.TokenCost
		if tk <= 0 {
			tk = 100 // default token cost
		}
		if totalTokens+tk > cfg.TokenBudget {
			filtered = append(filtered, model.RouterFilteredSkill{
				SkillID:   c.skill.ID,
				SkillName: c.skill.Name,
				Reason:    "budget",
				Detail:    fmt.Sprintf("token_cost %d would exceed budget %d (used %d)", tk, cfg.TokenBudget, totalTokens),
			})
			continue
		}
		if len(selected) >= cfg.MaxSkills {
			filtered = append(filtered, model.RouterFilteredSkill{
				SkillID:   c.skill.ID,
				SkillName: c.skill.Name,
				Reason:    "budget",
				Detail:    fmt.Sprintf("max_skills %d reached", cfg.MaxSkills),
			})
			continue
		}
		totalTokens += tk
		selected = append(selected, model.RouterSelectedSkill{
			SkillID:     c.skill.ID,
			SkillName:   c.skill.Name,
			Relevance:   afterDedup[i].relevance,
			HealthScore: c.skill.HealthScore,
			TokenCost:   tk,
			Score:       afterDedup[i].relevance,
			Rank:        len(selected) + 1,
		})
	}

	// Optionally persist config
	if persist {
		r.db.Save(cfg)
	}

	return &model.RouterSelectResponse{
		TaskText:        taskText,
		Selected:        selected,
		Filtered:        filtered,
		TotalTokensUsed: totalTokens,
		TokenBudget:     cfg.TokenBudget,
		ConfigPreset:    cfg.Preset,
	}, nil
}

// healthMultiplier converts health_score (0-100) to a multiplier [0.01, 1.0]
func healthMultiplier(healthScore float64) float64 {
	if healthScore <= 0 {
		return 1.0 // no health data — don't penalize
	}
	return healthScore / 100.0
}

// computeSelectionScore computes the greedy selection score
func computeSelectionScore(c scoredPair) float64 {
	health := healthMultiplier(c.skill.HealthScore)
	tokenCost := float64(c.skill.TokenCost)
	if tokenCost <= 0 {
		tokenCost = 100 // default
	}
	return (c.relevance * health) / tokenCost
}
