package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

type FlowService struct {
	db *gorm.DB
}

func NewFlowService(db *gorm.DB) *FlowService {
	return &FlowService{db: db}
}

func (s *FlowService) List() ([]model.Flow, error) {
	var flows []model.Flow
	if err := s.db.Order("updated_at DESC").Find(&flows).Error; err != nil {
		return nil, err
	}
	return flows, nil
}

func (s *FlowService) Get(id string) (*model.Flow, error) {
	var flow model.Flow
	if err := s.db.Preload("Nodes").Preload("Edges").First(&flow, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &flow, nil
}

func (s *FlowService) Create(name, description string) (*model.Flow, error) {
	flow := &model.Flow{
		ID:          generateID(),
		Name:        name,
		Description: description,
		CreatedBy:   "user",
		Version:     1,
	}
	if err := s.db.Create(flow).Error; err != nil {
		return nil, err
	}
	return flow, nil
}

type UpdateFlowRequest struct {
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Nodes       []model.FlowNode `json:"nodes"`
	Edges       []model.FlowEdge `json:"edges"`
}

func (s *FlowService) Update(id string, req *UpdateFlowRequest) (*model.Flow, error) {
	tx := s.db.Begin()

	// Update metadata
	updates := map[string]interface{}{"updated_at": time.Now(), "version": gorm.Expr("version + 1")}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if err := tx.Model(&model.Flow{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Replace nodes & edges if provided
	if req.Nodes != nil {
		if err := tx.Where("flow_id = ?", id).Delete(&model.FlowNode{}).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		for i := range req.Nodes {
			req.Nodes[i].FlowID = id
			if req.Nodes[i].Config == nil {
				req.Nodes[i].Config = model.JSONMap{}
			}
		}
		if len(req.Nodes) > 0 {
			if err := tx.Create(&req.Nodes).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		}
	}

	if req.Edges != nil {
		if err := tx.Where("flow_id = ?", id).Delete(&model.FlowEdge{}).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		for i := range req.Edges {
			req.Edges[i].FlowID = id
		}
		if len(req.Edges) > 0 {
			if err := tx.Create(&req.Edges).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return s.Get(id)
}

func (s *FlowService) Delete(id string) error {
	return s.db.Delete(&model.Flow{}, "id = ?", id).Error
}

// Export serialises a flow to JSON or YAML
func (s *FlowService) Export(id, format string) (content, filename string, err error) {
	flow, err := s.Get(id)
	if err != nil {
		return "", "", err
	}

	switch strings.ToLower(format) {
	case "yaml":
		b, e := yaml.Marshal(flow)
		if e != nil {
			return "", "", e
		}
		return string(b), fmt.Sprintf("%s.yaml", sanitizeFilename(flow.Name)), nil
	default:
		b, e := json.MarshalIndent(flow, "", "  ")
		if e != nil {
			return "", "", e
		}
		return string(b), fmt.Sprintf("%s.json", sanitizeFilename(flow.Name)), nil
	}
}

// --- Templates ---

func (s *FlowService) ListTemplates() ([]model.TemplateResponse, error) {
	var templates []model.FlowTemplate
	if err := s.db.Find(&templates).Error; err != nil {
		return nil, err
	}

	responses := make([]model.TemplateResponse, 0, len(templates))
	for _, t := range templates {
		resp, err := templateToResponse(t)
		if err != nil {
			continue
		}
		responses = append(responses, resp)
	}
	return responses, nil
}

func (s *FlowService) GetTemplate(id string) (*model.TemplateResponse, error) {
	var t model.FlowTemplate
	if err := s.db.First(&t, "id = ?", id).Error; err != nil {
		return nil, err
	}
	resp, err := templateToResponse(t)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

func (s *FlowService) CreateTemplate(t *model.FlowTemplate, nodes []model.FlowNode, edges []model.FlowEdge) (*model.TemplateResponse, error) {
	nodesJSON, _ := json.Marshal(nodes)
	edgesJSON, _ := json.Marshal(edges)
	t.NodesJSON = string(nodesJSON)
	t.EdgesJSON = string(edgesJSON)
	t.ID = generateID()
	if err := s.db.Create(t).Error; err != nil {
		return nil, err
	}
	resp, err := templateToResponse(*t)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

func (s *FlowService) DeleteTemplate(id string) error {
	return s.db.Delete(&model.FlowTemplate{}, "id = ?", id).Error
}

func templateToResponse(t model.FlowTemplate) (model.TemplateResponse, error) {
	resp := model.TemplateResponse{FlowTemplate: t}
	if t.NodesJSON != "" {
		json.Unmarshal([]byte(t.NodesJSON), &resp.Nodes)
	}
	if t.EdgesJSON != "" {
		json.Unmarshal([]byte(t.EdgesJSON), &resp.Edges)
	}
	return resp, nil
}

func sanitizeFilename(s string) string {
	r := strings.NewReplacer(" ", "_", "/", "-", "\\", "-", ":", "-")
	return r.Replace(s)
}

type ValidationError struct {
	NodeID   string `json:"node_id"`
	Type     string `json:"type"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors"`
}

func (s *FlowService) ValidateFlow(flow *model.Flow) *ValidationResult {
	result := &ValidationResult{
		Valid:  true,
		Errors: []ValidationError{},
	}

	if flow == nil {
		result.Valid = false
		result.Errors = append(result.Errors, ValidationError{
			NodeID:   "",
			Type:     "flow_nil",
			Message:  "flow is nil",
			Severity: "high",
		})
		return result
	}

	nodeMap := make(map[string]bool)
	for _, node := range flow.Nodes {
		nodeMap[node.ID] = true

		if node.Type == "mcp" {
			if node.MCPServer == "" {
				result.Valid = false
				result.Errors = append(result.Errors, ValidationError{
					NodeID:   node.ID,
					Type:     "mcp_missing_server",
					Message:  "MCP node is missing server configuration",
					Severity: "high",
				})
			}
			if node.MCPTool == "" {
				result.Valid = false
				result.Errors = append(result.Errors, ValidationError{
					NodeID:   node.ID,
					Type:     "mcp_missing_tool",
					Message:  "MCP node is missing tool configuration",
					Severity: "high",
				})
			}
		}

		if node.Type == "skill" && node.SkillID == "" {
			result.Valid = false
			result.Errors = append(result.Errors, ValidationError{
				NodeID:   node.ID,
				Type:     "skill_missing_id",
				Message:  "Skill node is missing skill_id",
				Severity: "high",
			})
		}

		if node.Type == "condition" && node.ConditionExpr == "" {
			result.Valid = false
			result.Errors = append(result.Errors, ValidationError{
				NodeID:   node.ID,
				Type:     "condition_missing_expr",
				Message:  "Condition node is missing condition expression",
				Severity: "medium",
			})
		}
	}

	hasStart := false
	hasEnd := false
	for _, node := range flow.Nodes {
		if node.Type == "start" {
			hasStart = true
		}
		if node.Type == "end" {
			hasEnd = true
		}
	}

	if !hasStart {
		result.Valid = false
		result.Errors = append(result.Errors, ValidationError{
			NodeID:   "",
			Type:     "missing_start_node",
			Message:  "Flow must have a start node",
			Severity: "high",
		})
	}

	if !hasEnd {
		result.Valid = false
		result.Errors = append(result.Errors, ValidationError{
			NodeID:   "",
			Type:     "missing_end_node",
			Message:  "Flow must have an end node",
			Severity: "high",
		})
	}

	for _, edge := range flow.Edges {
		if !nodeMap[edge.Source] {
			result.Valid = false
			result.Errors = append(result.Errors, ValidationError{
				NodeID:   edge.ID,
				Type:     "invalid_edge_source",
				Message:  fmt.Sprintf("Edge references non-existent source node: %s", edge.Source),
				Severity: "high",
			})
		}
		if !nodeMap[edge.Target] {
			result.Valid = false
			result.Errors = append(result.Errors, ValidationError{
				NodeID:   edge.ID,
				Type:     "invalid_edge_target",
				Message:  fmt.Sprintf("Edge references non-existent target node: %s", edge.Target),
				Severity: "high",
			})
		}
	}

	return result
}
