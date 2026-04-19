package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

type OpenCodeProvider struct {
	cliPath      string
	timeout      time.Duration
	defaultModel string
	configPath   string
}

func NewOpenCodeProvider() *OpenCodeProvider {
	cliPath := os.Getenv("OPENCODE_CLI_PATH")
	if cliPath == "" {
		cliPath = detectOpenCodeCLI()
	}

	modelName := os.Getenv("OPENCODE_MODEL")
	if modelName == "" {
		modelName = "default"
	}

	return &OpenCodeProvider{
		cliPath:      cliPath,
		timeout:      120 * time.Second,
		defaultModel: modelName,
		configPath:   detectOpenCodeConfig(),
	}
}

func detectOpenCodeCLI() string {
	possiblePaths := []string{
		"opencode",
		"/usr/local/bin/opencode",
		"/usr/bin/opencode",
		filepath.Join(os.Getenv("HOME"), "go/bin/opencode"),
		filepath.Join(os.Getenv("HOME"), ".local/bin/opencode"),
	}

	for _, path := range possiblePaths {
		if _, err := exec.LookPath(path); err == nil {
			return path
		}
	}

	return "opencode"
}

func detectOpenCodeConfig() string {
	homeDir := os.Getenv("HOME")
	if homeDir == "" {
		return ""
	}

	possibleConfigs := []string{
		filepath.Join(homeDir, ".opencode", "config.json"),
		filepath.Join(homeDir, ".config", "opencode", "config.json"),
		filepath.Join(homeDir, ".opencode", "config.yaml"),
		filepath.Join(homeDir, ".config", "opencode", "config.yaml"),
	}

	for _, path := range possibleConfigs {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return ""
}

func (p *OpenCodeProvider) Generate(ctx context.Context, req GenerateRequest, skills []model.Skill) (*GenerateResponse, error) {
	if p.cliPath == "" {
		return nil, fmt.Errorf("OpenCode CLI not found. Please set OPENCODE_CLI_PATH or ensure opencode is in PATH")
	}

	skillContext := buildSkillContext(skills)
	combinedPrompt := fmt.Sprintf("%s\n\nAvailable Skills:\n%s", req.Prompt, skillContext)
	// enforce provider timeout if the incoming context has no earlier deadline
	var cancel context.CancelFunc
	if dl, ok := ctx.Deadline(); !ok || time.Until(dl) > p.timeout {
		ctx, cancel = context.WithTimeout(ctx, p.timeout)
	} else {
		cancel = func() {}
	}
	defer cancel()

	cmd := exec.CommandContext(ctx, p.cliPath, "generate", "--prompt", combinedPrompt, "--format", "json")
	if p.defaultModel != "" {
		cmd.Args = append(cmd.Args, "--model", p.defaultModel)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("OpenCode CLI execution failed: %w\nOutput: %s", err, string(output))
	}

	return p.parseOutput(string(output), skills)
}

func (p *OpenCodeProvider) parseOutput(output string, skills []model.Skill) (*GenerateResponse, error) {
	content := strings.TrimSpace(output)

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
		return p.fallbackParse(content, skills)
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
	}

	if len(result.Nodes) == 0 {
		return p.fallbackParse(content, skills)
	}

	return &GenerateResponse{
		Nodes:       result.Nodes,
		Edges:       result.Edges,
		Explanation: result.Explanation,
		Confidence:  result.Confidence,
	}, nil
}

func (p *OpenCodeProvider) fallbackParse(content string, skills []model.Skill) (*GenerateResponse, error) {
	contentLower := strings.ToLower(content)

	hasKeyword := func(keywords ...string) bool {
		for _, kw := range keywords {
			if strings.Contains(contentLower, kw) {
				return true
			}
		}
		return false
	}

	var selectedSkills []model.Skill
	for _, sk := range skills {
		desc := strings.ToLower(sk.Description + " " + strings.Join(sk.Capabilities, " "))
		if hasKeyword(strings.Fields(desc)...) {
			selectedSkills = append(selectedSkills, sk)
			if len(selectedSkills) >= 3 {
				break
			}
		}
	}

	if len(selectedSkills) == 0 && len(skills) > 0 {
		if len(skills) > 2 {
			selectedSkills = skills[:2]
		} else {
			selectedSkills = skills
		}
	}

	nodes := []model.FlowNode{
		{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}, Status: "idle"},
	}
	edges := []model.FlowEdge{}

	prev := "start"
	for i, sk := range selectedSkills {
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
		ID: fmt.Sprintf("e-%d", len(selectedSkills)+1), Source: prev, Target: "end", EdgeType: "serial",
	})

	return &GenerateResponse{
		Nodes:       nodes,
		Edges:       edges,
		Explanation: "Generated via OpenCode fallback parser",
		Confidence:  0.3,
	}, nil
}

func buildSkillContext(skills []model.Skill) string {
	var lines []string
	for _, sk := range skills {
		lines = append(lines, fmt.Sprintf("- %s: %s (capabilities: %s)", sk.Name, sk.Description, strings.Join(sk.Capabilities, ", ")))
	}
	return strings.Join(lines, "\n")
}

func (p *OpenCodeProvider) GetProviderType() ProviderType {
	return ProviderOpenCode
}

func (p *OpenCodeProvider) GetName() string {
	return "OpenCode"
}

func (p *OpenCodeProvider) IsConfigured() bool {
	if p.cliPath == "" {
		return false
	}
	_, err := exec.LookPath(p.cliPath)
	return err == nil
}

func (p *OpenCodeProvider) GetCLIPath() string {
	return p.cliPath
}

func (p *OpenCodeProvider) GetConfigPath() string {
	return p.configPath
}

func (p *OpenCodeProvider) TestConnection(ctx context.Context) error {
	if p.cliPath == "" {
		return fmt.Errorf("OpenCode CLI path not set")
	}

	cmd := exec.CommandContext(ctx, p.cliPath, "--version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("OpenCode CLI not accessible: %w", err)
	}

	return nil
}
