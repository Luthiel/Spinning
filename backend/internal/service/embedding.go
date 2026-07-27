package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"time"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

// EmbeddingService generates and manages skill embeddings
type EmbeddingService struct {
	db      *gorm.DB
	apiKey  string
	baseURL string
	model   string
	timeout time.Duration
}

// NewEmbeddingService creates a new EmbeddingService
func NewEmbeddingService(db *gorm.DB) *EmbeddingService {
	apiKey := os.Getenv("EMBEDDING_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("LLM_API_KEY") // fallback to LLM key
	}
	baseURL := os.Getenv("EMBEDDING_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	modelName := os.Getenv("EMBEDDING_MODEL")
	if modelName == "" {
		modelName = "text-embedding-3-small"
	}
	return &EmbeddingService{
		db:      db,
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   modelName,
		timeout: 30 * time.Second,
	}
}

// EmbeddingResponse from OpenAI-compatible API
type embeddingAPIResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
}

// GenerateEmbedding generates an embedding for the given text
func (s *EmbeddingService) GenerateEmbedding(ctx context.Context, text string) ([]float64, error) {
	if s.apiKey == "" {
		// Fallback: generate a deterministic pseudo-embedding based on text hash
		return s.fallbackEmbedding(text), nil
	}

	payload := map[string]interface{}{
		"model": s.model,
		"input": text,
	}
	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: s.timeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("embedding request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embedding API error %d: %s", resp.StatusCode, string(b))
	}

	var apiResp embeddingAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode embedding response: %w", err)
	}
	if len(apiResp.Data) == 0 {
		return nil, fmt.Errorf("empty embedding response")
	}

	return apiResp.Data[0].Embedding, nil
}

// GetOrCreateEmbedding returns the cached embedding or generates and stores a new one
func (s *EmbeddingService) GetOrCreateEmbedding(ctx context.Context, skill *model.Skill) ([]float64, error) {
	// Check cache
	var existing model.SkillEmbedding
	if err := s.db.Where("skill_id = ? AND model = ?", skill.ID, s.model).First(&existing).Error; err == nil {
		return []float64(existing.Embedding), nil
	}

	// Generate from skill text
	text := skill.Name + " " + skill.Description
	for _, cap := range skill.Capabilities {
		text += " " + cap
	}

	embedding, err := s.GenerateEmbedding(ctx, text)
	if err != nil {
		return nil, err
	}

	// Store in DB
	se := model.SkillEmbedding{
		ID:        "emb-" + skill.ID,
		SkillID:   skill.ID,
		Embedding: model.FloatSlice(embedding),
		Model:     s.model,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	// Upsert
	s.db.Where("skill_id = ? AND model = ?", skill.ID, s.model).Delete(&model.SkillEmbedding{})
	if err := s.db.Create(&se).Error; err != nil {
		return nil, err
	}

	return embedding, nil
}

// CosineSimilarity computes cosine similarity between two vectors
func CosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

// fallbackEmbedding generates a deterministic pseudo-embedding using text hash
// This is used when no API key is configured — for development/testing only
func (s *EmbeddingService) fallbackEmbedding(text string) []float64 {
	const dim = 128
	embedding := make([]float64, dim)

	// Simple hash-based pseudo-embedding
	var hash uint64 = 0xcbf29ce484222325
	for _, c := range text {
		hash ^= uint64(c)
		hash *= 0x100000001b3
	}

	for i := 0; i < dim; i++ {
		hash = hash*0x5bd1e995a5dad76f + 0xe6546b64
		val := float64(hash&0xffff) / 65535.0 // [0, 1)
		embedding[i] = val*2 - 1               // [-1, 1)
	}

	// Normalize
	var norm float64
	for _, v := range embedding {
		norm += v * v
	}
	norm = math.Sqrt(norm)
	if norm > 0 {
		for i := range embedding {
			embedding[i] /= norm
		}
	}

	return embedding
}

// RefreshAll regenerates embeddings for all skills
func (s *EmbeddingService) RefreshAll(ctx context.Context) (int, error) {
	var skills []model.Skill
	if err := s.db.Find(&skills).Error; err != nil {
		return 0, err
	}

	count := 0
	for _, sk := range skills {
		if _, err := s.GetOrCreateEmbedding(ctx, &sk); err != nil {
			continue
		}
		count++
	}
	return count, nil
}
