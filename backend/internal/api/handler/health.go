package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/service"
)

type HealthHandler struct {
	healthSvc *service.HealthService
}

func NewHealthHandler(healthSvc *service.HealthService) *HealthHandler {
	return &HealthHandler{healthSvc: healthSvc}
}

// GetHealthHistory returns the health metric history for a skill.
// GET /api/health/history/:skill_id
func (h *HealthHandler) GetHealthHistory(c *gin.Context) {
	skillID := c.Param("skill_id")
	if skillID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "skill_id is required"})
		return
	}

	reports, err := h.healthSvc.GetHealthHistory(skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reports)
}

// GetSkillHealth returns the current health metrics for a skill.
// GET /api/health/skill/:skill_id
func (h *HealthHandler) GetSkillHealth(c *gin.Context) {
	skillID := c.Param("skill_id")
	if skillID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "skill_id is required"})
		return
	}

	skill, err := h.healthSvc.GetSkillHealth(skillID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
		return
	}
	c.JSON(http.StatusOK, skill)
}
