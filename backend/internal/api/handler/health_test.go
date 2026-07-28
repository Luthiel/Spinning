package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&model.Skill{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func seedTestSkills(t *testing.T, db *gorm.DB) {
	t.Helper()
	skills := []model.Skill{
		{
			ID:          "skill-translate",
			Name:        "Text Translator",
			Description: "Translates text between languages",
			Capabilities: model.StringSlice{"translation", "multilingual"},
			Category:    model.StringSlice{"nlp"},
			InputSchema: model.JSONMap{
				"type":       "object",
				"properties": map[string]interface{}{"text": map[string]interface{}{"type": "string"}},
				"required":   []interface{}{"text"},
			},
			OutputSchema: model.JSONMap{
				"type":       "object",
				"properties": map[string]interface{}{"translated_text": map[string]interface{}{"type": "string"}},
			},
			CallCount:   342,
			ErrorCount:  5,
			SuccessRate: 0.95,
		},
		{
			ID:          "skill-sentiment",
			Name:        "Sentiment Analyzer",
			Description: "Analyzes emotional tone of text",
			Capabilities: model.StringSlice{"sentiment-analysis", "emotion-detection"},
			Category:    model.StringSlice{"nlp"},
			InputSchema: model.JSONMap{
				"type":       "object",
				"properties": map[string]interface{}{"text": map[string]interface{}{"type": "string"}},
				"required":   []interface{}{"text"},
			},
			OutputSchema: model.JSONMap{
				"type":       "object",
				"properties": map[string]interface{}{"sentiment": map[string]interface{}{"type": "string"}},
			},
			CallCount:  521,
			SuccessRate: 0.99,
		},
		{
			ID:         "skill-noschema",
			Name:         "No Schema Skill",
			Description: "Has no IO schemas",
			CallCount:   0,
		},
	}
	for _, sk := range skills {
		db.Create(&sk)
	}
}

func TestHealthHandler_Summary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	seedTestSkills(t, db)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.GET("/api/health/summary", h.Summary)

	req := httptest.NewRequest(http.MethodGet, "/api/health/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var summary model.HealthSummary
	if err := json.Unmarshal(w.Body.Bytes(), &summary); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if summary.TotalSkills != 3 {
		t.Fatalf("expected 3 total skills, got %d", summary.TotalSkills)
	}
	if summary.AverageScore < 0 || summary.AverageScore > 1 {
		t.Fatalf("average score out of range: %f", summary.AverageScore)
	}
	if _, ok := summary.GradeDistribution["untested"]; !ok {
		t.Fatal("expected untested in grade distribution")
	}
}

func TestHealthHandler_CheckSkill(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	seedTestSkills(t, db)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.POST("/api/health/check/:skill_id", h.CheckSkill)

	req := httptest.NewRequest(http.MethodPost, "/api/health/check/skill-translate", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var report model.SkillHealthReport
	if err := json.Unmarshal(w.Body.Bytes(), &report); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if report.SkillID != "skill-translate" {
		t.Fatalf("expected skill_id 'skill-translate', got %q", report.SkillID)
	}
	if len(report.Dimensions) != 5 {
		t.Fatalf("expected 5 dimensions, got %d", len(report.Dimensions))
	}
}

func TestHealthHandler_CheckSkill_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.POST("/api/health/check/:skill_id", h.CheckSkill)

	req := httptest.NewRequest(http.MethodPost, "/api/health/check/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHealthHandler_CheckAll(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	seedTestSkills(t, db)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.POST("/api/health/check-all", h.CheckAll)

	req := httptest.NewRequest(http.MethodPost, "/api/health/check-all", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Reports []model.SkillHealthReport `json:"reports"`
		Total   int                       `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Total != 3 {
		t.Fatalf("expected 3 reports, got %d", resp.Total)
	}
	if len(resp.Reports) != 3 {
		t.Fatalf("expected 3 reports in array, got %d", len(resp.Reports))
	}
}

func TestHealthHandler_GetReport(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	seedTestSkills(t, db)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.GET("/api/health/reports/:skill_id", h.GetReport)

	req := httptest.NewRequest(http.MethodGet, "/api/health/reports/skill-sentiment", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var report model.SkillHealthReport
	if err := json.Unmarshal(w.Body.Bytes(), &report); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if report.SkillID != "skill-sentiment" {
		t.Fatalf("expected skill_id 'skill-sentiment', got %q", report.SkillID)
	}
}

func TestHealthHandler_GetReport_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.GET("/api/health/reports/:skill_id", h.GetReport)

	req := httptest.NewRequest(http.MethodGet, "/api/health/reports/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHealthHandler_Summary_EmptyDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.GET("/api/health/summary", h.Summary)

	body := `{}`
	req := httptest.NewRequest(http.MethodGet, "/api/health/summary", bytes.NewBufferString(body))
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var summary model.HealthSummary
	if err := json.Unmarshal(w.Body.Bytes(), &summary); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if summary.TotalSkills != 0 {
		t.Fatalf("expected 0 skills, got %d", summary.TotalSkills)
	}
}

func TestHealthHandler_CheckSkill_EmptyID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	healthSvc := service.NewHealthService(db)
	h := NewHealthHandler(healthSvc)

	router := gin.New()
	router.POST("/api/health/check/:skill_id", h.CheckSkill)

	// This won't match the route since Gin requires a value for :skill_id
	req := httptest.NewRequest(http.MethodPost, "/api/health/check/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should be 404 since route doesn't match
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for empty skill_id, got %d", w.Code)
	}
}
