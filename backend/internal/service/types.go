package service

import (
	"spinning/backend/internal/model"
)

type GenerateRequest struct {
	Prompt          string   `json:"prompt"`
	FlowID          string   `json:"flow_id,omitempty"`
	ContextSkillIDs []string `json:"context_skill_ids,omitempty"`
}

type GenerateResponse struct {
	Nodes       []model.FlowNode `json:"nodes"`
	Edges       []model.FlowEdge `json:"edges"`
	Explanation string           `json:"explanation"`
	Confidence  float64          `json:"confidence"`
}
