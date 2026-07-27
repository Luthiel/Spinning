package service

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

const maxSkillFileBytes = 1024 * 1024

type SkillFileService struct {
	db      *gorm.DB
	baseDir string
}

type SkillFileInfo struct {
	Path      string    `json:"path"`
	Name      string    `json:"name"`
	Kind      string    `json:"kind"`
	Language  string    `json:"language"`
	Size      int64     `json:"size"`
	Hash      string    `json:"hash"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SkillFilesResponse struct {
	SkillID    string          `json:"skill_id"`
	SkillFile  *SkillFileInfo  `json:"skill_file,omitempty"`
	References []SkillFileInfo `json:"references"`
	Scripts    []SkillFileInfo `json:"scripts"`
}

type SkillFileContent struct {
	Path      string    `json:"path"`
	Kind      string    `json:"kind"`
	Language  string    `json:"language"`
	Content   string    `json:"content"`
	Hash      string    `json:"hash"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SaveSkillFileRequest struct {
	Path     string `json:"path"`
	Content  string `json:"content"`
	BaseHash string `json:"base_hash"`
	Message  string `json:"message"`
}

type SkillFileEditProposalRequest struct {
	Path           string          `json:"path"`
	Prompt         string          `json:"prompt"`
	CurrentContent string          `json:"current_content"`
	ChatHistory    []model.JSONMap `json:"chat_history"`
}

type SkillFileEditProposal struct {
	Path            string `json:"path"`
	Language        string `json:"language"`
	ProposedContent string `json:"proposed_content"`
	Explanation     string `json:"explanation"`
	Diff            string `json:"diff"`
	BaseHash        string `json:"base_hash"`
}

func NewSkillFileService(db *gorm.DB) *SkillFileService {
	baseDir := os.Getenv("SKILL_FILE_ROOT")
	if baseDir == "" {
		baseDir = filepath.Join(".", "data", "skills")
	}
	return &SkillFileService{db: db, baseDir: baseDir}
}

func (s *SkillFileService) List(skillID string) (*SkillFilesResponse, error) {
	skill, err := s.ensureManagedSkill(skillID)
	if err != nil {
		return nil, err
	}

	root := s.skillRoot(skill)
	resp := &SkillFilesResponse{
		SkillID:    skillID,
		References: []SkillFileInfo{},
		Scripts:    []SkillFileInfo{},
	}

	if info, err := s.fileInfo(root, "SKILL.md"); err == nil {
		resp.SkillFile = info
	}

	for _, dir := range []string{"references", "scripts"} {
		absDir := filepath.Join(root, dir)
		_ = filepath.WalkDir(absDir, func(absPath string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil || d.IsDir() {
				return nil
			}
			rel, err := filepath.Rel(root, absPath)
			if err != nil {
				return nil
			}
			rel = filepath.ToSlash(rel)
			info, err := s.fileInfo(root, rel)
			if err != nil {
				return nil
			}
			if dir == "references" {
				resp.References = append(resp.References, *info)
			} else {
				resp.Scripts = append(resp.Scripts, *info)
			}
			return nil
		})
	}

	sort.Slice(resp.References, func(i, j int) bool { return resp.References[i].Path < resp.References[j].Path })
	sort.Slice(resp.Scripts, func(i, j int) bool { return resp.Scripts[i].Path < resp.Scripts[j].Path })
	return resp, nil
}

func (s *SkillFileService) Read(skillID, relPath string) (*SkillFileContent, error) {
	skill, err := s.ensureManagedSkill(skillID)
	if err != nil {
		return nil, err
	}
	clean, abs, err := s.safePath(skill, relPath)
	if err != nil {
		return nil, err
	}
	content, stat, err := readTextFile(abs)
	if err != nil {
		return nil, err
	}
	return &SkillFileContent{
		Path:      clean,
		Kind:      fileKind(clean),
		Language:  detectLanguage(clean),
		Content:   content,
		Hash:      contentHash(content),
		UpdatedAt: stat.ModTime(),
	}, nil
}

func (s *SkillFileService) Save(skillID string, req SaveSkillFileRequest, source, restoreFrom string) (*SkillFileContent, *model.SkillFileVersion, error) {
	if len([]byte(req.Content)) > maxSkillFileBytes {
		return nil, nil, fmt.Errorf("file content exceeds 1MB limit")
	}

	skill, err := s.ensureManagedSkill(skillID)
	if err != nil {
		return nil, nil, err
	}
	clean, abs, err := s.safePath(skill, req.Path)
	if err != nil {
		return nil, nil, err
	}

	if existing, _, err := readTextFile(abs); err == nil && req.BaseHash != "" && contentHash(existing) != req.BaseHash {
		return nil, nil, ErrSkillFileHashConflict
	}

	if err := os.MkdirAll(filepath.Dir(abs), 0755); err != nil {
		return nil, nil, err
	}
	if err := os.WriteFile(abs, []byte(req.Content), 0644); err != nil {
		return nil, nil, err
	}

	info, err := s.Read(skillID, clean)
	if err != nil {
		return nil, nil, err
	}
	version := &model.SkillFileVersion{
		ID:                   generateID(),
		SkillID:              skillID,
		Path:                 clean,
		Kind:                 fileKind(clean),
		Language:             detectLanguage(clean),
		Content:              req.Content,
		Hash:                 info.Hash,
		Message:              req.Message,
		Source:               source,
		RestoreFromVersionID: restoreFrom,
		CreatedAt:            time.Now(),
	}
	if version.Message == "" {
		version.Message = "Saved file"
	}
	if version.Source == "" {
		version.Source = "manual"
	}
	if err := s.db.Create(version).Error; err != nil {
		return nil, nil, err
	}
	return info, version, nil
}

func (s *SkillFileService) Versions(skillID, relPath string) ([]model.SkillFileVersion, error) {
	clean, err := cleanSkillFilePath(relPath)
	if err != nil {
		return nil, err
	}
	var versions []model.SkillFileVersion
	err = s.db.Where("skill_id = ? AND path = ? AND deleted_at IS NULL", skillID, clean).
		Order("created_at DESC").Find(&versions).Error
	return versions, err
}

func (s *SkillFileService) GetVersion(skillID, versionID string) (*model.SkillFileVersion, error) {
	var version model.SkillFileVersion
	if err := s.db.First(&version, "id = ? AND skill_id = ? AND deleted_at IS NULL", versionID, skillID).Error; err != nil {
		return nil, err
	}
	return &version, nil
}

func (s *SkillFileService) Restore(skillID, versionID string) (*SkillFileContent, *model.SkillFileVersion, error) {
	version, err := s.GetVersion(skillID, versionID)
	if err != nil {
		return nil, nil, err
	}
	req := SaveSkillFileRequest{
		Path:    version.Path,
		Content: version.Content,
		Message: "Restored version " + version.ID,
	}
	return s.Save(skillID, req, "restore", version.ID)
}

func (s *SkillFileService) DeleteVersion(skillID, versionID string) error {
	now := time.Now()
	return s.db.Model(&model.SkillFileVersion{}).
		Where("id = ? AND skill_id = ? AND deleted_at IS NULL", versionID, skillID).
		Update("deleted_at", &now).Error
}

func (s *SkillFileService) ImportManagedCopy(skillID, sourceDir string) error {
	skill, err := s.ensureManagedSkill(skillID)
	if err != nil {
		return err
	}
	root := s.skillRoot(skill)

	copyIfExists := func(src, dstRel string) error {
		info, err := os.Stat(src)
		if err != nil || info.IsDir() {
			return nil
		}
		if info.Size() > maxSkillFileBytes {
			return nil
		}
		data, err := os.ReadFile(src)
		if err != nil {
			return err
		}
		dst := filepath.Join(root, filepath.FromSlash(dstRel))
		if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
			return err
		}
		if err := os.WriteFile(dst, data, 0644); err != nil {
			return err
		}
		_, _, err = s.Save(skillID, SaveSkillFileRequest{
			Path:    dstRel,
			Content: string(data),
			Message: "Imported from external source",
		}, "import", "")
		return err
	}

	if err := copyIfExists(filepath.Join(sourceDir, "SKILL.md"), "SKILL.md"); err != nil {
		return err
	}
	if err := copyIfExists(filepath.Join(sourceDir, "README.md"), "SKILL.md"); err != nil {
		return err
	}

	for _, dir := range []string{"references", "scripts"} {
		srcBase := filepath.Join(sourceDir, dir)
		_ = filepath.WalkDir(srcBase, func(src string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil || d.IsDir() {
				return nil
			}
			rel, err := filepath.Rel(srcBase, src)
			if err != nil {
				return nil
			}
			dstRel := filepath.ToSlash(filepath.Join(dir, rel))
			_ = copyIfExists(src, dstRel)
			return nil
		})
	}

	return nil
}

func (s *SkillFileService) Propose(skillID string, req SkillFileEditProposalRequest) (*SkillFileEditProposal, error) {
	current := req.CurrentContent
	if current == "" {
		file, err := s.Read(skillID, req.Path)
		if err != nil {
			return nil, err
		}
		current = file.Content
	}
	clean, err := cleanSkillFilePath(req.Path)
	if err != nil {
		return nil, err
	}

	proposed := strings.TrimRight(current, "\n")
	note := strings.TrimSpace(req.Prompt)
	if note == "" {
		note = "No change requested"
	}
	switch detectLanguage(clean) {
	case "markdown":
		proposed += "\n\n## Suggested Update\n\n" + note + "\n"
	case "shell", "python", "javascript", "typescript":
		proposed += "\n\n# Suggested update: " + note + "\n"
	default:
		proposed += "\n\nSuggested update: " + note + "\n"
	}

	return &SkillFileEditProposal{
		Path:            clean,
		Language:        detectLanguage(clean),
		ProposedContent: proposed,
		Explanation:     "Generated a safe draft from the requested change. Review the diff before saving.",
		Diff:            simpleUnifiedDiff(clean, current, proposed),
		BaseHash:        contentHash(current),
	}, nil
}

func (s *SkillFileService) ensureManagedSkill(skillID string) (*model.Skill, error) {
	var skill model.Skill
	if err := s.db.First(&skill, "id = ?", skillID).Error; err != nil {
		return nil, err
	}
	if skill.FileRoot == "" {
		skill.FileRoot = sanitizeSkillDir(skill.ID)
		if err := s.db.Model(&model.Skill{}).Where("id = ?", skill.ID).Update("file_root", skill.FileRoot).Error; err != nil {
			return nil, err
		}
	}

	root := s.skillRoot(&skill)
	if err := os.MkdirAll(filepath.Join(root, "references"), 0755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Join(root, "scripts"), 0755); err != nil {
		return nil, err
	}

	skillFile := filepath.Join(root, "SKILL.md")
	if _, err := os.Stat(skillFile); os.IsNotExist(err) {
		content := defaultSkillMarkdown(&skill)
		if err := os.WriteFile(skillFile, []byte(content), 0644); err != nil {
			return nil, err
		}
		version := &model.SkillFileVersion{
			ID:        generateID(),
			SkillID:   skill.ID,
			Path:      "SKILL.md",
			Kind:      "skill",
			Language:  "markdown",
			Content:   content,
			Hash:      contentHash(content),
			Message:   "Initial managed SKILL.md",
			Source:    "initial",
			CreatedAt: time.Now(),
		}
		_ = s.db.Create(version).Error
	}

	return &skill, nil
}

func (s *SkillFileService) skillRoot(skill *model.Skill) string {
	return filepath.Join(s.baseDir, skill.FileRoot)
}

func (s *SkillFileService) safePath(skill *model.Skill, relPath string) (string, string, error) {
	clean, err := cleanSkillFilePath(relPath)
	if err != nil {
		return "", "", err
	}
	root := s.skillRoot(skill)
	abs := filepath.Join(root, filepath.FromSlash(clean))
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", "", err
	}
	absPath, err := filepath.Abs(abs)
	if err != nil {
		return "", "", err
	}
	if absPath != absRoot && !strings.HasPrefix(absPath, absRoot+string(filepath.Separator)) {
		return "", "", fmt.Errorf("file path escapes skill root")
	}
	return clean, absPath, nil
}

func (s *SkillFileService) fileInfo(root, relPath string) (*SkillFileInfo, error) {
	abs := filepath.Join(root, filepath.FromSlash(relPath))
	content, stat, err := readTextFile(abs)
	if err != nil {
		return nil, err
	}
	return &SkillFileInfo{
		Path:      relPath,
		Name:      filepath.Base(relPath),
		Kind:      fileKind(relPath),
		Language:  detectLanguage(relPath),
		Size:      stat.Size(),
		Hash:      contentHash(content),
		UpdatedAt: stat.ModTime(),
	}, nil
}

var ErrSkillFileHashConflict = fmt.Errorf("file changed since it was opened")

func cleanSkillFilePath(relPath string) (string, error) {
	if relPath == "" {
		return "", fmt.Errorf("path is required")
	}
	relPath = filepath.ToSlash(relPath)
	if strings.HasPrefix(relPath, "/") || strings.Contains(relPath, "\x00") {
		return "", fmt.Errorf("invalid file path")
	}
	clean := filepath.ToSlash(filepath.Clean(relPath))
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") || strings.Contains(clean, "/../") {
		return "", fmt.Errorf("invalid file path")
	}
	if clean != "SKILL.md" && !strings.HasPrefix(clean, "references/") && !strings.HasPrefix(clean, "scripts/") {
		return "", fmt.Errorf("path must be SKILL.md or under references/ or scripts/")
	}
	if strings.HasSuffix(clean, "/") {
		return "", fmt.Errorf("path must be a file")
	}
	return clean, nil
}

func readTextFile(abs string) (string, os.FileInfo, error) {
	stat, err := os.Stat(abs)
	if err != nil {
		return "", nil, err
	}
	if stat.IsDir() {
		return "", nil, fmt.Errorf("path is a directory")
	}
	if stat.Size() > maxSkillFileBytes {
		return "", nil, fmt.Errorf("file exceeds 1MB limit")
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return "", nil, err
	}
	return string(data), stat, nil
}

func sanitizeSkillDir(id string) string {
	id = strings.ToLower(id)
	var b strings.Builder
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	out := strings.Trim(b.String(), "-_")
	if out == "" {
		return generateID()
	}
	return out
}

func defaultSkillMarkdown(skill *model.Skill) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# %s\n\n", skill.Name)
	if skill.Description != "" {
		fmt.Fprintf(&b, "%s\n\n", skill.Description)
	}
	fmt.Fprintf(&b, "## Metadata\n\n")
	fmt.Fprintf(&b, "- Version: %s\n", skill.Version)
	fmt.Fprintf(&b, "- Author: %s\n", skill.Author)
	fmt.Fprintf(&b, "- Team: %s\n", skill.OwnerTeam)
	fmt.Fprintf(&b, "- Status: %s\n", skill.Status)
	if len(skill.Category) > 0 {
		fmt.Fprintf(&b, "- Category: %s\n", strings.Join(skill.Category, ", "))
	}
	if len(skill.Capabilities) > 0 {
		fmt.Fprintf(&b, "\n## Capabilities\n\n")
		for _, capability := range skill.Capabilities {
			fmt.Fprintf(&b, "- %s\n", capability)
		}
	}
	return b.String()
}

func fileKind(relPath string) string {
	switch {
	case relPath == "SKILL.md":
		return "skill"
	case strings.HasPrefix(relPath, "scripts/"):
		return "script"
	default:
		return "reference"
	}
}

func detectLanguage(relPath string) string {
	switch strings.ToLower(filepath.Ext(relPath)) {
	case ".md", ".markdown":
		return "markdown"
	case ".sh", ".bash", ".zsh":
		return "shell"
	case ".ts", ".tsx":
		return "typescript"
	case ".js", ".jsx", ".mjs", ".cjs":
		return "javascript"
	case ".py":
		return "python"
	case ".json":
		return "json"
	case ".yaml", ".yml":
		return "yaml"
	case ".go":
		return "go"
	default:
		return "plaintext"
	}
}

func contentHash(content string) string {
	sum := sha256.Sum256([]byte(content))
	return hex.EncodeToString(sum[:])
}

func simpleUnifiedDiff(path, oldContent, newContent string) string {
	if oldContent == newContent {
		return ""
	}
	var b strings.Builder
	fmt.Fprintf(&b, "--- a/%s\n+++ b/%s\n", path, path)
	oldLines := strings.Split(oldContent, "\n")
	newLines := strings.Split(newContent, "\n")
	maxLen := len(oldLines)
	if len(newLines) > maxLen {
		maxLen = len(newLines)
	}
	for i := 0; i < maxLen; i++ {
		var oldLine, newLine string
		if i < len(oldLines) {
			oldLine = oldLines[i]
		}
		if i < len(newLines) {
			newLine = newLines[i]
		}
		if i >= len(oldLines) {
			fmt.Fprintf(&b, "+%s\n", newLine)
			continue
		}
		if i >= len(newLines) {
			fmt.Fprintf(&b, "-%s\n", oldLine)
			continue
		}
		if oldLine == newLine {
			fmt.Fprintf(&b, " %s\n", oldLine)
		} else {
			fmt.Fprintf(&b, "-%s\n+%s\n", oldLine, newLine)
		}
	}
	return b.String()
}
