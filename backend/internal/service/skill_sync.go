package service

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

type SkillSyncService struct {
	db *gorm.DB
}

func NewSkillSyncService(db *gorm.DB) *SkillSyncService {
	return &SkillSyncService{db: db}
}

type SyncResult struct {
	Imported int `json:"imported"`
	Updated  int `json:"updated"`
	Skipped  int `json:"skipped"`
	Errors   int `json:"errors"`
}

func (s *SkillSyncService) SyncFromOpenCode() (*SyncResult, error) {
	result := &SyncResult{}

	skillPaths := s.detectOpenCodeSkillPaths()
	if len(skillPaths) == 0 {
		return result, fmt.Errorf("no OpenCode skill directories found")
	}

	for _, basePath := range skillPaths {
		if err := filepath.WalkDir(basePath, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if !d.IsDir() || path == basePath {
				return nil
			}

			skill, err := s.parseSkillFromDirectory(path)
			if err != nil {
				result.Errors++
				return nil
			}

			if skill == nil {
				result.Skipped++
				return nil
			}

			imported, err := s.upsertSkill(skill)
			if err != nil {
				result.Errors++
				return nil
			}

			if imported {
				result.Imported++
			} else {
				result.Updated++
			}

			return nil
		}); err != nil {
			return result, err
		}
	}

	return result, nil
}

func (s *SkillSyncService) detectOpenCodeSkillPaths() []string {
	homeDir := os.Getenv("HOME")
	if homeDir == "" {
		return nil
	}

	paths := []string{
		filepath.Join(homeDir, ".opencode", "skills"),
		filepath.Join(homeDir, ".local", "share", "opencode", "skills"),
	}

	xdgDataHome := os.Getenv("XDG_DATA_HOME")
	if xdgDataHome != "" {
		paths = append(paths, filepath.Join(xdgDataHome, "opencode", "skills"))
	}

	var existing []string
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			existing = append(existing, p)
		}
	}

	return existing
}

func (s *SkillSyncService) parseSkillFromDirectory(dirPath string) (*model.Skill, error) {
	skillName := filepath.Base(dirPath)

	readFile := func(filename string) []byte {
		data, _ := os.ReadFile(filepath.Join(dirPath, filename))
		return data
	}

	skillFile := readFile("skill.yaml")
	if len(skillFile) == 0 {
		skillFile = readFile("skill.yml")
	}
	if len(skillFile) == 0 {
		skillFile = readFile("skill.json")
	}
	if len(skillFile) == 0 {
		skillFile = readFile("README.md")
	}

	if len(skillFile) == 0 {
		return nil, nil
	}

	skill := &model.Skill{
		ID:          fmt.Sprintf("opencode-%s", strings.ToLower(strings.ReplaceAll(skillName, " ", "-"))),
		Name:        skillName,
		Version:     "1.0.0",
		Author:      "OpenCode",
		Status:      "active",
		Source:      "opencode",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	descriptionFile := readFile("README.md")
	if len(descriptionFile) > 0 {
		content := string(descriptionFile)
		if idx := strings.Index(content, "\n"); idx > 0 {
			skill.Description = strings.TrimSpace(content[:idx])
		} else {
			skill.Description = content
		}
		if len(descriptionFile) > 500 {
			skill.Description = string(descriptionFile[:500])
		}
	}

	capabilitiesFile := readFile("capabilities.txt")
	if len(capabilitiesFile) > 0 {
		lines := strings.Split(string(capabilitiesFile), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && !strings.HasPrefix(line, "#") {
				skill.Capabilities = append(skill.Capabilities, line)
			}
		}
	}

	if len(skill.Capabilities) == 0 {
		skill.Capabilities = []string{"general"}
	}

	skill.Category = []string{"external", "opencode"}

	mcpFile := readFile("mcp.json")
	if len(mcpFile) > 0 {
		skill.MCPConfig = model.JSONMap{
			"has_mcp": true,
			"config":  string(mcpFile),
		}
	}

	return skill, nil
}

func (s *SkillSyncService) upsertSkill(skill *model.Skill) (bool, error) {
	var existing model.Skill
	err := s.db.First(&existing, "id = ?", skill.ID).Error
	if err == gorm.ErrRecordNotFound {
		if err := s.db.Create(skill).Error; err != nil {
			return false, err
		}
		return true, nil
	}
	if err != nil {
		return false, err
	}

	skill.ID = existing.ID
	skill.CreatedAt = existing.CreatedAt
	if err := s.db.Save(skill).Error; err != nil {
		return false, err
	}

	return false, nil
}

func (s *SkillSyncService) GetSource() string {
	return "opencode"
}

type ExternalSkillSource struct {
	Name     string   `json:"name"`
	Type     string   `json:"type"`
	Path     string   `json:"path"`
	SKillCount int    `json:"skill_count"`
	AutoSync bool     `json:"auto_sync"`
}

func (s *SkillSyncService) ListExternalSources() []ExternalSkillSource {
	sources := []ExternalSkillSource{}

	openCodePaths := s.detectOpenCodeSkillPaths()
	for _, p := range openCodePaths {
		count := s.countSkillsInDirectory(p)
		sources = append(sources, ExternalSkillSource{
			Name:       "OpenCode",
			Type:       "opencode",
			Path:       p,
			SKillCount: count,
			AutoSync:   true,
		})
	}

	return sources
}

func (s *SkillSyncService) countSkillsInDirectory(dirPath string) int {
	count := 0
	filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() && path != dirPath {
			count++
		}
		return nil
	})
	return count
}
