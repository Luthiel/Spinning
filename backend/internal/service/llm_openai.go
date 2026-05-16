package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

type OpenAIProvider struct {
	apiKey  string
	baseURL string
	model   string
	timeout time.Duration
}

func NewOpenAIProvider() *OpenAIProvider {
	baseURL := os.Getenv("LLM_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	modelName := os.Getenv("LLM_MODEL")
	if modelName == "" {
		modelName = "gpt-4o-mini"
	}
	return &OpenAIProvider{
		apiKey:  os.Getenv("LLM_API_KEY"),
		baseURL: baseURL,
		model:   modelName,
		timeout: 60 * time.Second,
	}
}

func (p *OpenAIProvider) Generate(ctx context.Context, req GenerateRequest, skills []model.Skill) (*GenerateResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("OpenAI API key not configured. Set LLM_API_KEY environment variable")
	}

	skillListJSON := buildSkillListJSON(skills)
	systemPrompt := buildSystemPrompt(skillListJSON)

	payload := map[string]interface{}{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": req.Prompt},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: p.timeout}
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

func (p *OpenAIProvider) GetProviderType() ProviderType {
	return ProviderOpenAI
}

func (p *OpenAIProvider) GetName() string {
	return "OpenAI"
}

func (p *OpenAIProvider) IsConfigured() bool {
	return p.apiKey != ""
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
9. Use "mcp" node type for MCP server tools (set mcp_server and mcp_tool fields)

Respond with ONLY a JSON object with this structure:
{
  "nodes": [
    {"id": "start", "type": "start", "label": "Start", "position_x": 0, "position_y": 0, "config": {}, "status": "idle", "call_count": 0},
    {"id": "skill-1", "type": "skill", "skill_id": "<skill_id>", "label": "<skill_name>", "position_x": 0, "position_y": 0, "config": {}, "status": "idle", "call_count": 0},
    {"id": "mcp-1", "type": "mcp", "mcp_server": "<server_name>", "mcp_tool": "<tool_name>", "label": "<label>", "position_x": 0, "position_y": 0, "config": {}, "status": "idle", "call_count": 0},
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
		MCPType      string   `json:"mcp_type,omitempty"`
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
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		startIdx := 1
		endIdx := len(lines)
		if endIdx > 0 && strings.HasPrefix(strings.TrimSpace(lines[endIdx-1]), "```") {
			endIdx--
		}
		if endIdx > startIdx {
			content = strings.Join(lines[startIdx:endIdx], "\n")
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

	for i := range result.Edges {
		if result.Edges[i].ID == "" {
			result.Edges[i].ID = "e-" + generateID()
		}
	}
	for i := range result.Nodes {
		if result.Nodes[i].Config == nil {
			result.Nodes[i].Config = model.JSONMap{}
		}
		result.Nodes[i].Enabled = true
	}

	return &GenerateResponse{
		Nodes:       result.Nodes,
		Edges:       result.Edges,
		Explanation: result.Explanation,
		Confidence:  result.Confidence,
	}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
