package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service"
)

type SkillHandler struct {
	svc     *service.SkillService
	syncSvc *service.SkillSyncService
	fileSvc *service.SkillFileService
}

func NewSkillHandler(svc *service.SkillService, syncSvc *service.SkillSyncService, fileSvc *service.SkillFileService) *SkillHandler {
	return &SkillHandler{svc: svc, syncSvc: syncSvc, fileSvc: fileSvc}
}

func (h *SkillHandler) List(c *gin.Context) {
	search := c.Query("search")
	category := c.Query("category")
	sort := c.Query("sort")

	skills, err := h.svc.List(search, category, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, skills)
}

func (h *SkillHandler) Get(c *gin.Context) {
	sk, err := h.svc.Get(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
		return
	}
	c.JSON(http.StatusOK, sk)
}

func (h *SkillHandler) Create(c *gin.Context) {
	var sk model.Skill
	if err := c.ShouldBindJSON(&sk); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Create(&sk); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sk)
}

func (h *SkillHandler) Update(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sk, err := h.svc.Update(c.Param("id"), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sk)
}

func (h *SkillHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *SkillHandler) Clusters(c *gin.Context) {
	clusters, err := h.svc.Clusters()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, clusters)
}

func (h *SkillHandler) Rankings(c *gin.Context) {
	rankings, err := h.svc.Rankings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rankings)
}

func (h *SkillHandler) Sync(c *gin.Context) {
	result, err := h.syncSvc.SyncFromOpenCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *SkillHandler) ListExternalSources(c *gin.Context) {
	sources := h.syncSvc.ListExternalSources()
	c.JSON(http.StatusOK, sources)
}

type SkillFindResponse struct {
	Local    []model.Skill                    `json:"local"`
	External []service.ExternalSkillCandidate `json:"external"`
}

func (h *SkillHandler) Find(c *gin.Context) {
	query := c.Query("q")
	local, err := h.svc.List(query, "", "name")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, SkillFindResponse{
		Local:    local,
		External: h.syncSvc.FindExternalSkills(query),
	})
}

func (h *SkillHandler) Import(c *gin.Context) {
	var req struct {
		SourceType string `json:"source_type"`
		Path       string `json:"path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	skill, err := h.syncSvc.ImportFromPath(req.SourceType, req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fileSvc.ImportManagedCopy(skill.ID, req.Path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	skill, _ = h.svc.Get(skill.ID)
	c.JSON(http.StatusOK, skill)
}

func (h *SkillHandler) ListFiles(c *gin.Context) {
	files, err := h.fileSvc.List(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, files)
}

func (h *SkillHandler) ReadFile(c *gin.Context) {
	content, err := h.fileSvc.Read(c.Param("id"), c.Query("path"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, content)
}

func (h *SkillHandler) SaveFile(c *gin.Context) {
	var req service.SaveSkillFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	content, version, err := h.fileSvc.Save(c.Param("id"), req, "manual", "")
	if err != nil {
		if errors.Is(err, service.ErrSkillFileHashConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"file": content, "version": version})
}

func (h *SkillHandler) ProposeFileEdit(c *gin.Context) {
	var req service.SkillFileEditProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	proposal, err := h.fileSvc.Propose(c.Param("id"), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, proposal)
}

func (h *SkillHandler) ListFileVersions(c *gin.Context) {
	versions, err := h.fileSvc.Versions(c.Param("id"), c.Query("path"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, versions)
}

func (h *SkillHandler) GetFileVersion(c *gin.Context) {
	version, err := h.fileSvc.GetVersion(c.Param("id"), c.Param("versionId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	c.JSON(http.StatusOK, version)
}

func (h *SkillHandler) RestoreFileVersion(c *gin.Context) {
	content, version, err := h.fileSvc.Restore(c.Param("id"), c.Param("versionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"file": content, "version": version})
}

func (h *SkillHandler) DeleteFileVersion(c *gin.Context) {
	if err := h.fileSvc.DeleteVersion(c.Param("id"), c.Param("versionId")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
