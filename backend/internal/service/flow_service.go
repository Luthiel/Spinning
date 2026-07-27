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

func (s *FlowService) PlanChanges(req PlanChangesRequest, skills []model.Skill) (*FlowChangePlan, error) {
	prompt := strings.ToLower(strings.TrimSpace(req.Prompt))
	if prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}

	existingSkillIDs := map[string]bool{}
	existingNodeIDs := map[string]bool{}
	for _, node := range req.Nodes {
		existingNodeIDs[node.ID] = true
		if node.SkillID != "" {
			existingSkillIDs[node.SkillID] = true
		}
	}

	matched := []model.Skill{}
	for _, sk := range skills {
		if existingSkillIDs[sk.ID] {
			continue
		}
		haystack := strings.ToLower(sk.Name + " " + sk.Description + " " + strings.Join(sk.Capabilities, " ") + " " + strings.Join(sk.Category, " "))
		if strings.Contains(prompt, strings.ToLower(sk.Name)) || keywordOverlap(prompt, haystack) {
			matched = append(matched, sk)
			if len(matched) >= 3 {
				break
			}
		}
	}

	if len(matched) == 0 {
		return &FlowChangePlan{
			Summary:    "No safe workflow changes were identified. Try naming a skill or capability more directly.",
			Changes:    []model.FlowChange{},
			Confidence: 0.2,
		}, nil
	}

	insertSource, insertEnd, removeEdge := insertionPoint(req.Nodes, req.Edges)
	changes := []model.FlowChange{}
	prev := insertSource
	baseX, baseY := nextNodePosition(req.Nodes)

	if removeEdge != nil {
		changes = append(changes, model.FlowChange{
			Type:     "remove_edge",
			TargetID: removeEdge.ID,
		})
	}

	names := []string{}
	for i, sk := range matched {
		nodeID := uniqueNodeID(fmt.Sprintf("skill-%s", sanitizeSkillDir(sk.ID)), existingNodeIDs)
		existingNodeIDs[nodeID] = true
		names = append(names, sk.Name)
		changes = append(changes, model.FlowChange{
			Type:     "add_node",
			TargetID: nodeID,
			Payload: model.JSONMap{
				"id":         nodeID,
				"type":       "skill",
				"skill_id":   sk.ID,
				"label":      sk.Name,
				"position_x": baseX + float64(i*260),
				"position_y": baseY,
				"config":     model.JSONMap{},
				"status":     "idle",
				"enabled":    true,
			},
		})
		if prev != "" {
			edgeID := "e-" + generateID()
			changes = append(changes, model.FlowChange{
				Type:     "add_edge",
				TargetID: edgeID,
				Payload: model.JSONMap{
					"id":        edgeID,
					"source":    prev,
					"target":    nodeID,
					"edge_type": "serial",
				},
			})
		}
		prev = nodeID
	}

	if insertEnd != "" && prev != "" {
		edgeID := "e-" + generateID()
		changes = append(changes, model.FlowChange{
			Type:     "add_edge",
			TargetID: edgeID,
			Payload: model.JSONMap{
				"id":        edgeID,
				"source":    prev,
				"target":    insertEnd,
				"edge_type": "serial",
			},
		})
	}

	return &FlowChangePlan{
		Summary:    "Add " + strings.Join(names, ", ") + " to the workflow and connect them into the main serial path.",
		Changes:    changes,
		Confidence: 0.65,
	}, nil
}

func keywordOverlap(prompt, haystack string) bool {
	for _, word := range strings.Fields(prompt) {
		word = strings.Trim(word, ".,;:!?()[]{}\"'")
		if len([]rune(word)) < 3 {
			continue
		}
		if strings.Contains(haystack, word) {
			return true
		}
	}
	return false
}

func insertionPoint(nodes []model.FlowNode, edges []model.FlowEdge) (source string, end string, removeEdge *model.FlowEdge) {
	for _, node := range nodes {
		if node.Type == "end" {
			end = node.ID
			break
		}
	}
	if end != "" {
		for i := range edges {
			if edges[i].Target == end {
				return edges[i].Source, end, &edges[i]
			}
		}
	}
	for _, node := range nodes {
		if node.Type == "start" {
			return node.ID, end, nil
		}
	}
	if len(nodes) > 0 {
		return nodes[len(nodes)-1].ID, end, nil
	}
	return "", end, nil
}

func nextNodePosition(nodes []model.FlowNode) (float64, float64) {
	if len(nodes) == 0 {
		return 400, 300
	}
	maxX := nodes[0].PositionX
	y := nodes[0].PositionY
	for _, node := range nodes {
		if node.PositionX >= maxX {
			maxX = node.PositionX
			y = node.PositionY
		}
	}
	return maxX + 260, y
}

func uniqueNodeID(base string, existing map[string]bool) string {
	if !existing[base] {
		return base
	}
	for i := 2; ; i++ {
		candidate := fmt.Sprintf("%s-%d", base, i)
		if !existing[candidate] {
			return candidate
		}
	}
}
