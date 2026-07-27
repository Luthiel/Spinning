package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/service"
)

type HealthHandler struct {
	svc *service.HealthService
}

func NewHealthHandler(svc *service.HealthService) *HealthHandler {
	return &HealthHandler{svc: svc}
}

// Summary returns global health overview
// GET /api/health/summary
func (h *HealthHandler) Summary(c *gin.Context) {
	summary, err := h.svc.GetSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// CheckSkill runs health check on a single skill
// POST /api/health/check/:skill_id
func (h *HealthHandler) CheckSkill(c *gin.Context) {
	skillID := c.Param("skill_id")
	if skillID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "skill_id is required"})
		return
	}

	report, err := h.svc.CheckSkill(skillID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

// CheckAll runs health checks on all skills
// POST /api/health/check-all
func (h *HealthHandler) CheckAll(c *gin.Context) {
	reports, err := h.svc.CheckAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"total":   len(reports),
	})
}

// GetReport retrieves health report for a specific skill
// GET /api/health/reports/:skill_id
func (h *HealthHandler) GetReport(c *gin.Context) {
	skillID := c.Param("skill_id")
	if skillID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "skill_id is required"})
		return
	}

	report, err := h.svc.GetReport(skillID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}
