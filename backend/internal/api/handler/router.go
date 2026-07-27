package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service"
)

type RouterHandler struct {
	smartRouter *service.SmartRouter
	embedding   *service.EmbeddingService
}

func NewRouterHandler(smartRouter *service.SmartRouter, embedding *service.EmbeddingService) *RouterHandler {
	return &RouterHandler{smartRouter: smartRouter, embedding: embedding}
}

// Select godoc
// POST /api/router/select
// Selects a subset of skills for a given task using the four-step algorithm.
func (h *RouterHandler) Select(c *gin.Context) {
	var req model.RouterSelectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.smartRouter.Select(c.Request.Context(), req.TaskText, req.TopK)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetConfig godoc
// GET /api/router/config
// Returns the current router configuration.
func (h *RouterHandler) GetConfig(c *gin.Context) {
	cfg := h.smartRouter.GetConfig()
	c.JSON(http.StatusOK, cfg)
}

// UpdateConfig godoc
// PUT /api/router/config
// Updates the router configuration.
func (h *RouterHandler) UpdateConfig(c *gin.Context) {
	var cfg model.RouterConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate preset if provided
	if cfg.Preset != "" && cfg.Preset != "custom" {
		switch cfg.Preset {
		case "strict":
			cfg.TokenBudget = service.PresetStrict.TokenBudget
			cfg.MinHealthScore = service.PresetStrict.MinHealthScore
			cfg.MaxSkills = service.PresetStrict.MaxSkills
			cfg.DedupThreshold = service.PresetStrict.DedupThreshold
		case "balanced":
			cfg.TokenBudget = service.PresetBalanced.TokenBudget
			cfg.MinHealthScore = service.PresetBalanced.MinHealthScore
			cfg.MaxSkills = service.PresetBalanced.MaxSkills
			cfg.DedupThreshold = service.PresetBalanced.DedupThreshold
		case "loose":
			cfg.TokenBudget = service.PresetLoose.TokenBudget
			cfg.MinHealthScore = service.PresetLoose.MinHealthScore
			cfg.MaxSkills = service.PresetLoose.MaxSkills
			cfg.DedupThreshold = service.PresetLoose.DedupThreshold
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid preset: must be strict, balanced, loose, or custom"})
			return
		}
	}

	h.smartRouter.UpdateConfig(&cfg)
	c.JSON(http.StatusOK, h.smartRouter.GetConfig())
}

// Simulate godoc
// POST /api/router/simulate
// Simulates skill selection with optional config overrides (does not persist).
func (h *RouterHandler) Simulate(c *gin.Context) {
	var req model.RouterSimulateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.smartRouter.Simulate(c.Request.Context(), req.TaskText, req.ConfigOverrides, req.TopK)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// RefreshEmbeddings godoc
// POST /api/router/refresh-embeddings
// Regenerates embeddings for all skills.
func (h *RouterHandler) RefreshEmbeddings(c *gin.Context) {
	count, err := h.embedding.RefreshAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"refreshed": count})
}
