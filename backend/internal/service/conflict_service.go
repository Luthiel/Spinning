package service

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

type ConflictService struct {
	db          *gorm.DB
	skillSvc    *SkillService
}

func NewConflictService(db *gorm.DB, skillSvc *SkillService) *ConflictService {
	return &ConflictService{db: db, skillSvc: skillSvc}
}

// Detect analyses the nodes+edges for conflicts and returns reports with resolution recommendations
func (c *ConflictService) Detect(flowID string, nodes []model.FlowNode, edges []model.FlowEdge) ([]model.ConflictReport, error) {
	// Collect skill nodes only
	skillNodes := []model.FlowNode{}
	for _, n := range nodes {
		if n.Type == "skill" && n.SkillID != "" {
			skillNodes = append(skillNodes, n)
		}
	}

	// Load all referenced skills
	skillMap := map[string]*model.Skill{}
	for _, n := range skillNodes {
		if _, ok := skillMap[n.SkillID]; !ok {
			sk, err := c.skillSvc.Get(n.SkillID)
			if err == nil {
				skillMap[n.SkillID] = sk
			}
		}
	}

	var reports []model.ConflictReport

	// Check every pair of skill nodes
	for i := 0; i < len(skillNodes); i++ {
		for j := i + 1; j < len(skillNodes); j++ {
			a, b := skillNodes[i], skillNodes[j]
			skA, okA := skillMap[a.SkillID]
			skB, okB := skillMap[b.SkillID]
			if !okA || !okB {
				continue
			}

			// 1. Resource contention (same conflict_tags)
			if tags := sharedTags(skA.ConflictTags, skB.ConflictTags); len(tags) > 0 {
				reports = append(reports, c.buildReport(flowID, a, b, skA, skB,
					"resource_contention", "high",
					fmt.Sprintf("Both skills share conflict tags [%s] — they may contend for the same resource.", strings.Join(tags, ", ")),
				))
			}

			// 2. Output conflict (overlapping output keys)
			if keys := overlappingKeys(skA.OutputSchema, skB.OutputSchema); len(keys) > 0 {
				reports = append(reports, c.buildReport(flowID, a, b, skA, skB,
					"output_conflict", "high",
					fmt.Sprintf("Both skills produce output keys [%s] — downstream nodes may receive ambiguous values.", strings.Join(keys, ", ")),
				))
			}

			// 3. Input overlap (same required input keys with same types)
			if keys := overlappingKeys(skA.InputSchema, skB.InputSchema); len(keys) > 0 {
				reports = append(reports, c.buildReport(flowID, a, b, skA, skB,
					"input_overlap", "medium",
					fmt.Sprintf("Both skills consume the same input fields [%s] — consider whether they should be chained or given separate inputs.", strings.Join(keys, ", ")),
				))
			}

			// 4. Capability duplicate (>50% overlap)
			if ratio := capabilityOverlapRatio(skA.Capabilities, skB.Capabilities); ratio > 0.5 {
				reports = append(reports, c.buildReport(flowID, a, b, skA, skB,
					"capability_duplicate", "medium",
					fmt.Sprintf("Skills share %.0f%% of capabilities — you may only need one of them.", ratio*100),
				))
			}
		}
	}

	return reports, nil
}

func (c *ConflictService) buildReport(
	flowID string,
	a, b model.FlowNode,
	skA, skB *model.Skill,
	conflictType, severity, description string,
) model.ConflictReport {
	resolutions := buildResolutions(conflictType, skA, skB)
	return model.ConflictReport{
		ID:           generateID(),
		FlowID:       flowID,
		NodeAID:      a.ID,
		NodeBID:      b.ID,
		SkillAID:     skA.ID,
		SkillBID:     skB.ID,
		SkillAName:   skA.Name,
		SkillBName:   skB.Name,
		ConflictType: conflictType,
		Severity:     severity,
		Description:  description,
		Resolutions:  resolutions,
		CreatedAt:    time.Now(),
	}
}

func buildResolutions(conflictType string, skA, skB *model.Skill) []model.ConflictResolution {
	switch conflictType {
	case "resource_contention":
		return []model.ConflictResolution{
			{
				ID: generateID(), Strategy: "priority",
				Title:          "Set Priority Order",
				Description:    fmt.Sprintf("Run %s first, then %s sequentially to avoid simultaneous resource access.", skA.Name, skB.Name),
				Confidence:     0.85, AutoApplicable: true,
			},
			{
				ID: generateID(), Strategy: "parallel_isolate",
				Title:          "Isolate with Locks",
				Description:    "Insert a locking gateway between the two skills to enforce mutual exclusion.",
				Confidence:     0.72, AutoApplicable: false,
			},
		}
	case "output_conflict":
		return []model.ConflictResolution{
			{
				ID: generateID(), Strategy: "namespace_isolate",
				Title:          "Namespace Outputs",
				Description:    fmt.Sprintf("Prefix %s outputs with '%s_' and %s outputs with '%s_' to avoid key collisions.", skA.Name, strings.ToLower(skA.Name), skB.Name, strings.ToLower(skB.Name)),
				Confidence:     0.90, AutoApplicable: true,
			},
			{
				ID: generateID(), Strategy: "replace",
				Title:          fmt.Sprintf("Use %s Only", skA.Name),
				Description:    fmt.Sprintf("Remove %s from the flow — %s already produces the same outputs.", skB.Name, skA.Name),
				Confidence:     0.60, AutoApplicable: false,
			},
			{
				ID: generateID(), Strategy: "merge",
				Title:          "Merge Outputs",
				Description:    "Add a merge node after both skills that combines their outputs, with later values overwriting earlier ones.",
				Confidence:     0.70, AutoApplicable: false,
			},
		}
	case "input_overlap":
		return []model.ConflictResolution{
			{
				ID: generateID(), Strategy: "merge",
				Title:          "Share Input Source",
				Description:    "Route the same input to both skills explicitly — this is likely the intended design.",
				Confidence:     0.80, AutoApplicable: true,
			},
			{
				ID: generateID(), Strategy: "conditional_route",
				Title:          "Conditional Input Routing",
				Description:    "Add a condition node to route input to either skill based on a runtime condition.",
				Confidence:     0.65, AutoApplicable: false,
			},
		}
	case "capability_duplicate":
		return []model.ConflictResolution{
			{
				ID: generateID(), Strategy: "replace",
				Title:          fmt.Sprintf("Keep %s Only", skA.Name),
				Description:    fmt.Sprintf("Remove %s — %s covers the same capabilities and was used more times.", skB.Name, skA.Name),
				Confidence:     0.75, AutoApplicable: false,
			},
			{
				ID: generateID(), Strategy: "parallel_isolate",
				Title:          "Ensemble Both",
				Description:    "Keep both skills running in parallel and merge results for higher confidence.",
				Confidence:     0.60, AutoApplicable: false,
			},
		}
	}
	return nil
}

// --- helpers ---

func sharedTags(a, b model.StringSlice) []string {
	set := map[string]bool{}
	for _, t := range a {
		set[strings.ToLower(t)] = true
	}
	var shared []string
	for _, t := range b {
		if set[strings.ToLower(t)] {
			shared = append(shared, t)
		}
	}
	return shared
}

func overlappingKeys(a, b model.JSONMap) []string {
	if a == nil || b == nil {
		return nil
	}
	propsA, okA := a["properties"].(map[string]interface{})
	propsB, okB := b["properties"].(map[string]interface{})
	if !okA || !okB {
		return nil
	}
	var shared []string
	for k := range propsA {
		if _, exists := propsB[k]; exists {
			shared = append(shared, k)
		}
	}
	return shared
}

func capabilityOverlapRatio(a, b model.StringSlice) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	set := map[string]bool{}
	for _, c := range a {
		set[strings.ToLower(c)] = true
	}
	var count int
	for _, c := range b {
		if set[strings.ToLower(c)] {
			count++
		}
	}
	union := len(a) + len(b) - count
	if union == 0 {
		return 0
	}
	return float64(count) / float64(union)
}
