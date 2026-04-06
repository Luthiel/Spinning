package model

import "time"

// ConflictReport represents a detected conflict between two skills in a flow
type ConflictReport struct {
	ID           string               `json:"id"`
	FlowID       string               `json:"flow_id"`
	NodeAID      string               `json:"node_a_id"`
	NodeBID      string               `json:"node_b_id"`
	SkillAID     string               `json:"skill_a_id"`
	SkillBID     string               `json:"skill_b_id"`
	SkillAName   string               `json:"skill_a_name"`
	SkillBName   string               `json:"skill_b_name"`
	ConflictType string               `json:"conflict_type"` // input_overlap|output_conflict|capability_duplicate|resource_contention
	Severity     string               `json:"severity"`      // high|medium|low
	Description  string               `json:"description"`
	Resolutions  []ConflictResolution `json:"resolutions"`
	CreatedAt    time.Time            `json:"created_at"`
}

// ConflictResolution is one recommended way to resolve a conflict
type ConflictResolution struct {
	ID              string       `json:"id"`
	Strategy        string       `json:"strategy"` // priority|merge|replace|parallel_isolate|conditional_route|namespace_isolate
	Title           string       `json:"title"`
	Description     string       `json:"description"`
	Confidence      float64      `json:"confidence"`
	AutoApplicable  bool         `json:"auto_applicable"`
	Changes         []FlowChange `json:"changes,omitempty"`
}

// FlowChange describes a mutation to apply when a resolution is chosen
type FlowChange struct {
	Type     string  `json:"type"` // add_node|remove_node|add_edge|remove_edge|update_node|update_edge
	TargetID string  `json:"target_id"`
	Payload  JSONMap `json:"payload,omitempty"`
}

// DetectConflictsRequest is the payload for POST /api/conflicts/detect
type DetectConflictsRequest struct {
	FlowID string     `json:"flow_id"`
	Nodes  []FlowNode `json:"nodes"`
	Edges  []FlowEdge `json:"edges"`
}
