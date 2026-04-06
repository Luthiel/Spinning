package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service"
)

type ConflictHandler struct {
	svc *service.ConflictService
}

func NewConflictHandler(svc *service.ConflictService) *ConflictHandler {
	return &ConflictHandler{svc: svc}
}

func (h *ConflictHandler) Detect(c *gin.Context) {
	var req model.DetectConflictsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reports, err := h.svc.Detect(req.FlowID, req.Nodes, req.Edges)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reports)
}

// ApplyResolution applies a chosen resolution strategy.
// For now it returns the updated flow nodes/edges (simplified implementation).
func (h *ConflictHandler) ApplyResolution(c *gin.Context) {
	// In a full implementation this would mutate the flow graph.
	// For the demo we return an empty diff (the frontend will re-detect after apply).
	c.JSON(http.StatusOK, gin.H{
		"nodes": []interface{}{},
		"edges": []interface{}{},
	})
}
