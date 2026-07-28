package service

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

// RedundancyDetector performs three-dimensional redundancy detection across skills
type RedundancyDetector struct {
	db          *gorm.DB
	skillSvc    *SkillService
	embedSvc    EmbeddingService
	cache       map[string]*model.RedundancyReport
	cacheMu     sync.RWMutex
	cacheExpiry time.Time
}

// NewRedundancyDetector creates a new redundancy detector
func NewRedundancyDetector(db *gorm.DB, skillSvc *SkillService, embedSvc EmbeddingService) *RedundancyDetector {
	return &RedundancyDetector{
		db:       db,
		skillSvc: skillSvc,
		embedSvc: embedSvc,
		cache:    make(map[string]*model.RedundancyReport),
	}
}

// DetectResult holds the result of a full redundancy detection run
type DetectResult struct {
	Reports    []*model.RedundancyReport `json:"reports"`
	TotalPairs int                        `json:"total_pairs"`
	DurationMs int64                      `json:"duration_ms"`
	DetectedAt time.Time                  `json:"detected_at"`
}

// DetectAll performs global redundancy detection across all skills
func (d *RedundancyDetector) DetectAll() (*DetectResult, error) {
	start := time.Now()
	
	// Load all active skills
	skills, err := d.skillSvc.List("", "", "")
	if err != nil {
		return nil, err
	}
	
	// Filter to only active skills
	activeSkills := make([]model.Skill, 0)
	for _, sk := range skills {
		if sk.Status == "active" {
			activeSkills = append(activeSkills, sk)
		}
	}
	
	log.Printf("[RedundancyDetector] Analyzing %d active skills", len(activeSkills))
	
	// Pre-compute embeddings for all skills
	embeddings := make(map[string][]float64, len(activeSkills))
	for _, sk := range activeSkills {
		emb, err := d.embedSvc.EmbedSkill(sk.Name, sk.Description, []string(sk.Capabilities))
		if err != nil {
			log.Printf("[RedundancyDetector] Failed to embed skill %s: %v", sk.ID, err)
			continue
		}
		embeddings[sk.ID] = emb
	}
	
	var reports []*model.RedundancyReport
	totalPairs := 0
	
	// Compare all pairs (O(N²))
	for i := 0; i < len(activeSkills); i++ {
		for j := i + 1; j < len(activeSkills); j++ {
			skA := activeSkills[i]
			skB := activeSkills[j]
			totalPairs++
			
			// Dimension 1: Capability Jaccard Similarity
			capOverlap := capabilityOverlapRatio(skA.Capabilities, skB.Capabilities)
			
			// Dimension 2: Semantic Cosine Similarity
			embA := embeddings[skA.ID]
			embB := embeddings[skB.ID]
			semSim := d.embedSvc.CosineSimilarity(embA, embB)
			
			// Dimension 3: IO Schema Compatibility
			schemaCompat := SchemaCompatibility(skA.InputSchema, skA.OutputSchema, skB.InputSchema, skB.OutputSchema)
			
			// Fusion formula: 0.3 * capOverlap + 0.5 * semSim + 0.2 * schemaCompat
			combinedScore := 0.3*capOverlap + 0.5*semSim + 0.2*schemaCompat
			
			// Only generate report if combined score >= threshold
			if combinedScore >= 0.4 {
				// Determine recommendation based on rules
				recommendation, reason := DetermineRecommendation(capOverlap, semSim, schemaCompat)
				
				report := &model.RedundancyReport{
					ID:                  generateID(),
					SkillAID:            skA.ID,
					SkillAName:          skA.Name,
					SkillBID:            skB.ID,
					SkillBName:          skB.Name,
					CapabilityOverlap:   capOverlap,
					SemanticSimilarity:  semSim,
					SchemaCompatibility: schemaCompat,
					CombinedScore:       combinedScore,
					Recommendation:      recommendation,
					Reason:              reason,
					CreatedAt:           time.Now(),
				}
				reports = append(reports, report)
			}
		}
	}
	
	// Sort by combined score descending
	sort.Slice(reports, func(i, j int) bool {
		return reports[i].CombinedScore > reports[j].CombinedScore
	})
	
	// Persist reports to database
	if err := d.persistReports(reports); err != nil {
		log.Printf("[RedundancyDetector] Failed to persist reports: %v", err)
	}
	
	result := &DetectResult{
		Reports:    reports,
		TotalPairs: totalPairs,
		DurationMs: time.Since(start).Milliseconds(),
		DetectedAt: time.Now(),
	}
	
	log.Printf("[RedundancyDetector] Found %d redundant pairs out of %d total pairs in %dms",
		len(reports), totalPairs, result.DurationMs)
	
	return result, nil
}

// GetCachedResult returns the last detection result if available
func (d *RedundancyDetector) GetCachedResult() (*DetectResult, error) {
	d.cacheMu.RLock()
	defer d.cacheMu.RUnlock()
	
	// Check cache expiry (5 minutes)
	if time.Now().After(d.cacheExpiry) {
		return nil, nil
	}
	
	// Load reports from database (most recent batch)
	var reports []*model.RedundancyReport
	if err := d.db.Order("created_at DESC").Limit(100).Find(&reports).Error; err != nil {
		return nil, err
	}
	
	if len(reports) == 0 {
		return nil, nil
	}
	
	return &DetectResult{
		Reports:    reports,
		TotalPairs: len(reports),
		DurationMs: 0,
		DetectedAt: reports[0].CreatedAt,
	}, nil
}

// persistReports saves redundancy reports to the database
func (d *RedundancyDetector) persistReports(reports []*model.RedundancyReport) error {
	// Clear old reports first
	if err := d.db.Where("1 = 1").Delete(&model.RedundancyReport{}).Error; err != nil {
		return err
	}
	
	// Insert new reports
	for _, report := range reports {
		if err := d.db.Create(report).Error; err != nil {
			return err
		}
	}
	
	return nil
}

// SchemaCompatibility computes IO schema compatibility between two skills
func SchemaCompatibility(inputA, outputA, inputB, outputB model.JSONMap) float64 {
	// Compare input schemas
	inputCompat := SchemaPairCompatibility(inputA, inputB)
	
	// Compare output schemas
	outputCompat := SchemaPairCompatibility(outputA, outputB)
	
	// Average of input and output compatibility
	return (inputCompat + outputCompat) / 2
}

// SchemaPairCompatibility computes compatibility between two JSON schemas
func SchemaPairCompatibility(a, b model.JSONMap) float64 {
	if a == nil && b == nil {
		return 1.0
	}
	if a == nil || b == nil {
		return 0.0
	}
	
	// Extract properties
	propsA := ExtractProperties(a)
	propsB := ExtractProperties(b)
	
	if len(propsA) == 0 && len(propsB) == 0 {
		return 1.0
	}
	if len(propsA) == 0 || len(propsB) == 0 {
		return 0.0
	}
	
	// Compute Jaccard similarity of property names
	intersection := 0
	union := make(map[string]bool)
	
	for k := range propsA {
		union[k] = true
	}
	for k := range propsB {
		union[k] = true
	}
	for k := range propsA {
		if _, exists := propsB[k]; exists {
			intersection++
		}
	}
	
	if len(union) == 0 {
		return 0.0
	}
	
	return float64(intersection) / float64(len(union))
}

// ExtractProperties extracts the properties map from a JSON schema
func ExtractProperties(schema model.JSONMap) map[string]interface{} {
	if schema == nil {
		return nil
	}
	
	if props, ok := schema["properties"].(map[string]interface{}); ok {
		return props
	}
	
	return nil
}

// DetermineRecommendation determines the recommendation based on similarity scores
func DetermineRecommendation(capOverlap, semSim, schemaCompat float64) (string, string) {
	// Rule 1: High capability overlap and very high semantic similarity
	if capOverlap > 0.8 && semSim > 0.9 {
		return "keep_better", "Skills are nearly identical in capabilities and semantics — keep the one with higher health score"
	}
	
	// Rule 2: Moderate-high overlap in both dimensions
	if capOverlap > 0.5 && semSim > 0.7 {
		return "clarify_positioning", "Skills have overlapping capabilities — clarify their specific use cases"
	}
	
	// Rule 3: High semantic similarity with compatible schemas
	if semSim > 0.85 && schemaCompat > 0.6 {
		return "human_review", "Skills are semantically similar with compatible IO — may need human judgment"
	}
	
	// Rule 4: Default — keep and optimize
	return "keep_optimize", "Skills have some overlap but serve different purposes — keep and optimize"
}

// DetermineSeverity returns a severity level based on the recommendation
func DetermineSeverity(recommendation string) string {
	switch recommendation {
	case "keep_better":
		return "high"
	case "clarify_positioning":
		return "medium"
	case "human_review":
		return "medium"
	default:
		return "low"
	}
}

// BuildRedundancyReason creates a human-readable reason string
func BuildRedundancyReason(skillA, skillB model.Skill, capOverlap, semSim, schemaCompat, combinedScore float64) string {
	var parts []string
	
	if capOverlap > 0.5 {
		parts = append(parts, strings.ToLower(skillA.Name)+" and "+strings.ToLower(skillB.Name)+" share "+
			fmt.Sprintf("%.1f%%", capOverlap*100)+" capabilities")
	}
	
	if semSim > 0.7 {
		parts = append(parts, "semantic similarity of "+fmt.Sprintf("%.1f%%", semSim*100))
	}
	
	if schemaCompat > 0.5 {
		parts = append(parts, "compatible IO schemas")
	}
	
	if len(parts) == 0 {
		return "Combined similarity score of " + fmt.Sprintf("%.1f%%", combinedScore*100)
	}
	
	return strings.Join(parts, "; ")
}
