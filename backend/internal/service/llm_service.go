package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

type LLMService struct {
	apiKey   string
	baseURL  string
	model    string
	timeout  time.Duration
}

// GenerateRequest is the payload for POST /api/flows/generate
type GenerateRequest struct {
	Prompt           string   `json:"prompt"`
	FlowID           string   `json:"flow_id,omitempty"`
	ContextSkillIDs  []string `json:"context_skill_ids,omitempty"`
}

// GenerateResponse contains the generated DAG structure
type GenerateResponse struct {
	Nodes       []model.FlowNode `json:"nodes"`
	Edges       []model.FlowEdge `json:"edges"`
	Explanation string           `json:"explanation"`
	Confidence  float64          `json:"confidence"`
}

func NewLLMService() *LLMService {
	baseURL := os.Getenv("LLM_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	modelName := os.Getenv("LLM_MODEL")
	if modelName == "" {
		modelName = "gpt-4o-mini"
	}
	return &LLMService{
		apiKey:  os.Getenv("LLM_API_KEY"),
		baseURL: baseURL,
		model:   modelName,
		timeout: 60 * time.Second,
	}
}

// Generate calls the LLM to parse a prompt and return a DAG
func (l *LLMService) Generate(req GenerateRequest, skills []model.Skill) (*GenerateResponse, error) {
	if l.apiKey == "" {
		// Return a meaningful mock response when no API key is configured
		return l.mockGenerate(req, skills), nil
	}

	skillListJSON := buildSkillListJSON(skills)
	systemPrompt := buildSystemPrompt(skillListJSON)
	userPrompt := req.Prompt

	payload := map[string]interface{}{
		"model": l.model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequest("POST", l.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+l.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: l.timeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("LLM request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("LLM API error %d: %s", resp.StatusCode, string(b))
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode LLM response: %w", err)
	}
	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("empty LLM response")
	}

	return parseDAGResponse(apiResp.Choices[0].Message.Content)
}

func buildSystemPrompt(skillListJSON string) string {
	return fmt.Sprintf(`You are a Skill Orchestration Assistant. Given a natural language description of a workflow, generate a DAG (directed acyclic graph) using the available skills.

Available Skills:
%s

Rules:
1. Always start with a "start" node (id: "start", type: "start")
2. Always end with an "end" node (id: "end", type: "end")  
3. Use "serial" edges for sequential execution
4. Use "parallel" edges when tasks can run concurrently (add parallel_fork and parallel_join nodes)
5. Use "conditional" edges with a condition expression for if/else branches (use condition nodes)
6. Only use skills from the available skills list above
7. Set position_x and position_y to 0 — they will be computed by the layout engine
8. Each node must have a unique id (use format: "start", "end", "skill-1", "skill-2", "cond-1", "fork-1", "join-1", etc.)

Respond with ONLY a JSON object with this structure:
{
  "nodes": [
    {"id": "start", "type": "start", "label": "Start", "position_x": 0, "position_y": 0, "config": {}, "status": "idle", "call_count": 0},
    {"id": "skill-1", "type": "skill", "skill_id": "<skill_id>", "label": "<skill_name>", "position_x": 0, "position_y": 0, "config": {}, "status": "idle", "call_count": 0},
    ...
  ],
  "edges": [
    {"id": "e-1", "source": "start", "target": "skill-1", "edge_type": "serial"},
    ...
  ],
  "explanation": "Brief explanation of the generated flow",
  "confidence": 0.9
}`, skillListJSON)
}

func buildSkillListJSON(skills []model.Skill) string {
	type skillSummary struct {
		ID           string   `json:"id"`
		Name         string   `json:"name"`
		Description  string   `json:"description"`
		Capabilities []string `json:"capabilities"`
		Category     []string `json:"category"`
	}
	summaries := make([]skillSummary, len(skills))
	for i, sk := range skills {
		summaries[i] = skillSummary{
			ID:           sk.ID,
			Name:         sk.Name,
			Description:  sk.Description,
			Capabilities: sk.Capabilities,
			Category:     sk.Category,
		}
	}
	b, _ := json.MarshalIndent(summaries, "", "  ")
	return string(b)
}

func parseDAGResponse(content string) (*GenerateResponse, error) {
	// Strip markdown code fences if present
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			content = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}

	var result struct {
		Nodes       []model.FlowNode `json:"nodes"`
		Edges       []model.FlowEdge `json:"edges"`
		Explanation string           `json:"explanation"`
		Confidence  float64          `json:"confidence"`
	}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("parse DAG JSON: %w — content: %s", err, content[:min(200, len(content))])
	}

	// Ensure IDs exist on edges
	for i := range result.Edges {
		if result.Edges[i].ID == "" {
			result.Edges[i].ID = "e-" + generateID()
		}
	}
	// Ensure node configs
	for i := range result.Nodes {
		if result.Nodes[i].Config == nil {
			result.Nodes[i].Config = model.JSONMap{}
		}
	}

	return &GenerateResponse{
		Nodes:       result.Nodes,
		Edges:       result.Edges,
		Explanation: result.Explanation,
		Confidence:  result.Confidence,
	}, nil
}

// mockGenerate returns a meaningful example DAG for demo purposes
func (l *LLMService) mockGenerate(req GenerateRequest, skills []model.Skill) *GenerateResponse {
	prompt := strings.ToLower(req.Prompt)

	// Pick up to 3 relevant skills based on keyword matching
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
		// Fallback: use first 2 skills
		end := 2
		if end > len(skills) {
			end = len(skills)
		}
		picked = skills[:end]
	}

	nodes := []model.FlowNode{
		{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}, Status: "idle"},
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
		})
		edges = append(edges, model.FlowEdge{
			ID: fmt.Sprintf("e-%d", i+1), Source: prev, Target: nodeID, EdgeType: "serial",
		})
		prev = nodeID
	}

	nodes = append(nodes, model.FlowNode{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}, Status: "idle"})
	edges = append(edges, model.FlowEdge{
		ID: fmt.Sprintf("e-%d", len(picked)+1), Source: prev, Target: "end", EdgeType: "serial",
	})

	return &GenerateResponse{
		Nodes:       nodes,
		Edges:       edges,
		Explanation: "Mock flow generated (no LLM API key configured). Set LLM_API_KEY env var for real AI generation.",
		Confidence:  0.5,
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
