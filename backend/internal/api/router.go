package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"gorm.io/gorm"
	"spinning/backend/internal/api/handler"
	"spinning/backend/internal/service"
	"spinning/backend/internal/service/engine"
)

func NewRouter(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	// CORS — allow the Vite dev server
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Services
	skillSvc := service.NewSkillService(db)
	skillSyncSvc := service.NewSkillSyncService(db)
	skillFileSvc := service.NewSkillFileService(db)
	flowSvc := service.NewFlowService(db)
	llmSvc := service.NewLLMService()
	wsHub := engine.NewWSHub()

	// Embedding service (mock for now, can be replaced with real implementation)
	embedSvc := service.NewMockEmbeddingService(128)

	// Redundancy detector
	redundancyDetector := service.NewRedundancyDetector(db, skillSvc, embedSvc)

	// Conflict service with redundancy detection
	conflictSvc := service.NewConflictServiceWithDetector(db, skillSvc, redundancyDetector)

	// Handlers
	skillH := handler.NewSkillHandler(skillSvc, skillSyncSvc, skillFileSvc)
	flowH := handler.NewFlowHandler(flowSvc, skillSvc, llmSvc, wsHub)
	conflictH := handler.NewConflictHandler(conflictSvc)
	healthH := handler.NewHealthHandler(redundancyDetector)

	api := r.Group("/api")
	{
		// Skills
		skills := api.Group("/skills")
		{
			skills.GET("", skillH.List)
			skills.POST("", skillH.Create)
			skills.GET("/clusters", skillH.Clusters)
			skills.GET("/rankings", skillH.Rankings)
			skills.POST("/sync", skillH.Sync)
			skills.GET("/sources", skillH.ListExternalSources)
			skills.GET("/find", skillH.Find)
			skills.POST("/import", skillH.Import)
			skills.GET("/:id/files", skillH.ListFiles)
			skills.GET("/:id/files/content", skillH.ReadFile)
			skills.PUT("/:id/files/content", skillH.SaveFile)
			skills.POST("/:id/files/propose", skillH.ProposeFileEdit)
			skills.GET("/:id/files/versions", skillH.ListFileVersions)
			skills.GET("/:id/files/versions/:versionId", skillH.GetFileVersion)
			skills.POST("/:id/files/versions/:versionId/restore", skillH.RestoreFileVersion)
			skills.DELETE("/:id/files/versions/:versionId", skillH.DeleteFileVersion)
			skills.GET("/:id", skillH.Get)
			skills.PUT("/:id", skillH.Update)
			skills.DELETE("/:id", skillH.Delete)
		}

		// Flows
		flows := api.Group("/flows")
		{
			flows.GET("", flowH.List)
			flows.POST("", flowH.Create)
			flows.POST("/generate", flowH.Generate)
			flows.POST("/plan-changes", flowH.PlanChanges)
			flows.GET("/:id", flowH.Get)
			flows.PUT("/:id", flowH.Update)
			flows.DELETE("/:id", flowH.Delete)
			flows.POST("/:id/export", flowH.Export)
			flows.POST("/:id/execute", flowH.Execute)
		}

		// Templates
		templates := api.Group("/templates")
		{
			templates.GET("", flowH.ListTemplates)
			templates.POST("", flowH.CreateTemplate)
			templates.GET("/:id", flowH.GetTemplate)
			templates.DELETE("/:id", flowH.DeleteTemplate)
		}

		// Conflicts
		conflicts := api.Group("/conflicts")
		{
			conflicts.POST("/detect", conflictH.Detect)
			conflicts.POST("/:id/resolve", conflictH.ApplyResolution)
		}

		// Health (including redundancy detection)
		health := api.Group("/health")
		{
			health.GET("/redundancy", healthH.GetRedundancy)
			health.POST("/redundancy/detect", healthH.DetectRedundancy)
		}
	}

	// WebSocket
	r.GET("/ws/execution/:id", flowH.WSExecution)

	// Health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
