package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

type MockProvider struct {
	timeout time.Duration
}

func NewMockProvider() *MockProvider {
	return &MockProvider{
		timeout: 5 * time.Second,
	}
}

func (p *MockProvider) Generate(ctx context.Context, req GenerateRequest, skills []model.Skill) (*GenerateResponse, error) {
	prompt := strings.ToLower(req.Prompt)

	var picked []model.Skill
	for _, sk := range skills {
		if len(picked) >= 3 {
			break
		}
		desc := strings.ToLower(sk.Description + " " + strings.Join(sk.Capabilities, " "))
		words := strings.Fields(prompt)
		for _, w := range words {
			if len(w) > 3 && strings.Contains(desc, w) {
				picked = append(picked, sk)
				break
			}
		}
	}

	if len(picked) == 0 && len(skills) > 0 {
		end := 2
		if end > len(skills) {
			end = len(skills)
		}
		picked = skills[:end]
	}

	nodes := []model.FlowNode{
		{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}, Status: "idle", Enabled: true},
	}
	edges := []model.FlowEdge{}

	prev := "start"
	for i, sk := range picked {
		nodeID := fmt.Sprintf("skill-%d", i+1)
		nodes = append(nodes, model.FlowNode{
			ID:      nodeID,
			Type:    "skill",
			SkillID: sk.ID,
			Label:   sk.Name,
			Config:  model.JSONMap{},
			Status:  "idle",
			Enabled: true,
		})
		edges = append(edges, model.FlowEdge{
			ID: fmt.Sprintf("e-%d", i+1), Source: prev, Target: nodeID, EdgeType: "serial",
		})
		prev = nodeID
	}

	nodes = append(nodes, model.FlowNode{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}, Status: "idle", Enabled: true})
	edges = append(edges, model.FlowEdge{
		ID: fmt.Sprintf("e-%d", len(picked)+1), Source: prev, Target: "end", EdgeType: "serial",
	})

	return &GenerateResponse{
		Nodes:       nodes,
		Edges:       edges,
		Explanation: "Mock flow generated (no LLM API key configured)",
		Confidence:  0.5,
	}, nil
}

func (p *MockProvider) GetProviderType() ProviderType {
	return ProviderMock
}

func (p *MockProvider) GetName() string {
	return "Mock Generator"
}

func (p *MockProvider) IsConfigured() bool {
	return true
}
