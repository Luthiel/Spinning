package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"spinning/backend/internal/api/handler"
	"spinning/backend/internal/service"
	"spinning/backend/internal/service/engine"
	"gorm.io/gorm"
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
	skillSvc    := service.NewSkillService(db)
	flowSvc     := service.NewFlowService(db)
	conflictSvc := service.NewConflictService(db, skillSvc)
	llmSvc      := service.NewLLMService()
	wsHub       := engine.NewWSHub()

	// Handlers
	skillH    := handler.NewSkillHandler(skillSvc)
	flowH     := handler.NewFlowHandler(flowSvc, skillSvc, llmSvc, wsHub)
	conflictH := handler.NewConflictHandler(conflictSvc)

	api := r.Group("/api")
	{
		// Skills
		skills := api.Group("/skills")
		{
			skills.GET("", skillH.List)
			skills.POST("", skillH.Create)
			skills.GET("/clusters", skillH.Clusters)
			skills.GET("/rankings", skillH.Rankings)
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
	}

	// WebSocket
	r.GET("/ws/execution/:id", flowH.WSExecution)

	// Health
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
