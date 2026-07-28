package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/service"
)

type HealthHandler struct {
	redundancyDetector *service.RedundancyDetector
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(redundancyDetector *service.RedundancyDetector) *HealthHandler {
	return &HealthHandler{redundancyDetector: redundancyDetector}
}

// GetRedundancy returns cached redundancy detection results
func (h *HealthHandler) GetRedundancy(c *gin.Context) {
	result, err := h.redundancyDetector.GetCachedResult()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if result == nil {
		// No cached result, trigger a new detection
		result, err = h.redundancyDetector.DetectAll()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	
	c.JSON(http.StatusOK, result)
}

// DetectRedundancy triggers a new global redundancy detection
func (h *HealthHandler) DetectRedundancy(c *gin.Context) {
	result, err := h.redundancyDetector.DetectAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, result)
}
