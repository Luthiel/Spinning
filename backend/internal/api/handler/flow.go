package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service"
	"spinning/backend/internal/service/engine"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type FlowHandler struct {
	flowSvc  *service.FlowService
	skillSvc *service.SkillService
	llmSvc   *service.LLMService
	wsHub    *engine.WSHub
}

func NewFlowHandler(flowSvc *service.FlowService, skillSvc *service.SkillService, llmSvc *service.LLMService, wsHub *engine.WSHub) *FlowHandler {
	return &FlowHandler{
		flowSvc:  flowSvc,
		skillSvc: skillSvc,
		llmSvc:   llmSvc,
		wsHub:    wsHub,
	}
}

func (h *FlowHandler) List(c *gin.Context) {
	flows, err := h.flowSvc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, flows)
}

func (h *FlowHandler) Get(c *gin.Context) {
	flow, err := h.flowSvc.Get(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "flow not found"})
		return
	}
	c.JSON(http.StatusOK, flow)
}

func (h *FlowHandler) Create(c *gin.Context) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Name == "" {
		req.Name = "Untitled Flow"
	}
	flow, err := h.flowSvc.Create(req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, flow)
}

func (h *FlowHandler) Update(c *gin.Context) {
	var req service.UpdateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	flow, err := h.flowSvc.Update(c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, flow)
}

func (h *FlowHandler) Delete(c *gin.Context) {
	if err := h.flowSvc.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *FlowHandler) Export(c *gin.Context) {
	var req struct {
		Format string `json:"format"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Format = "json"
	}
	content, filename, err := h.flowSvc.Export(c.Param("id"), req.Format)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": content, "filename": filename})
}

func (h *FlowHandler) Generate(c *gin.Context) {
	var req service.GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt is required"})
		return
	}

	skills, err := h.skillSvc.List("", "", "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result, err := h.llmSvc.Generate(c.Request.Context(), req, skills)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FlowHandler) Execute(c *gin.Context) {
	flowID := c.Param("id")
	flow, err := h.flowSvc.Get(flowID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "flow not found"})
		return
	}

	// Load all skills referenced in the flow
	skillMap := map[string]*model.Skill{}
	for _, node := range flow.Nodes {
		if node.SkillID != "" {
			if _, ok := skillMap[node.SkillID]; !ok {
				sk, err := h.skillSvc.Get(node.SkillID)
				if err == nil {
					skillMap[node.SkillID] = sk
				}
			}
		}
	}

	eventCh := make(chan engine.WSEvent, 100)
	exec := engine.NewExecutor(flow, skillMap, eventCh)
	executionID := exec.ExecutionID()

	// Start execution in background
	go func() {
		ctx := context.Background()
		exec.Run(ctx)
		close(eventCh)
	}()

	// Fan out events to WebSocket clients
	go func() {
		for event := range eventCh {
			h.wsHub.Broadcast(executionID, event)
		}
	}()

	// Increment call counts
	for skillID := range skillMap {
		h.skillSvc.IncrCallCount(skillID)
	}

	c.JSON(http.StatusOK, gin.H{"execution_id": executionID})
}

// WSExecution upgrades to WebSocket and registers client for an execution's events
func (h *FlowHandler) WSExecution(c *gin.Context) {
	executionID := c.Param("id")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	h.wsHub.Register(executionID, conn)
	defer h.wsHub.Unregister(executionID, conn)

	// Keep connection alive — read pump (discards messages)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// --- Templates ---

func (h *FlowHandler) ListTemplates(c *gin.Context) {
	templates, err := h.flowSvc.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (h *FlowHandler) GetTemplate(c *gin.Context) {
	t, err := h.flowSvc.GetTemplate(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *FlowHandler) CreateTemplate(c *gin.Context) {
	var req struct {
		model.FlowTemplate
		Nodes []model.FlowNode `json:"nodes"`
		Edges []model.FlowEdge `json:"edges"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t, err := h.flowSvc.CreateTemplate(&req.FlowTemplate, req.Nodes, req.Edges)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *FlowHandler) DeleteTemplate(c *gin.Context) {
	if err := h.flowSvc.DeleteTemplate(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
