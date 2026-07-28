package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"spinning/backend/internal/model"
)

// EmbeddingProvider defines the interface for embedding generation
type EmbeddingProvider interface {
	Embed(text string) ([]float64, error)
	ProviderName() string
}

// EmbeddingService manages embedding generation with fallback
type EmbeddingService struct {
	provider EmbeddingProvider
	fallback EmbeddingProvider
	client   *http.Client
}

// NewEmbeddingService creates a new EmbeddingService with configured providers
func NewEmbeddingService() *EmbeddingService {
	providerType := os.Getenv("EMBEDDING_PROVIDER")
	if providerType == "" {
		providerType = "mock"
	}

	var primary EmbeddingProvider
	switch providerType {
	case "openai":
		primary = newOpenAIEmbeddingProvider()
	case "local":
		primary = newLocalEmbeddingProvider()
	default:
		primary = newMockEmbeddingProvider()
	}

	fallback := newMockEmbeddingProvider()

	return &EmbeddingService{
		provider: primary,
		fallback: fallback,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// EmbedSkill generates an embedding for a skill by concatenating name + description + capabilities
func (s *EmbeddingService) EmbedSkill(skill *model.Skill) ([]float64, error) {
	text := buildSkillText(skill)
	vec, err := s.provider.Embed(text)
	if err != nil {
		// Fallback to mock on API failure
		vec, err = s.fallback.Embed(text)
		if err != nil {
			return nil, fmt.Errorf("embedding failed (primary and fallback): %w", err)
		}
	}
	return vec, nil
}

// CosineSimilarity computes the cosine similarity between two vectors
func CosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dotProduct, normA, normB float64
	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// buildSkillText concatenates skill fields into a single text for embedding
func buildSkillText(skill *model.Skill) string {
	var parts []string
	parts = append(parts, skill.Name)
	if skill.Description != "" {
		parts = append(parts, skill.Description)
	}
	if len(skill.Capabilities) > 0 {
		parts = append(parts, strings.Join(skill.Capabilities, " "))
	}
	if len(skill.Category) > 0 {
		parts = append(parts, strings.Join(skill.Category, " "))
	}
	return strings.Join(parts, " ")
}

// --- Mock Embedding Provider ---

type mockEmbeddingProvider struct {
	dim int
}

func newMockEmbeddingProvider() EmbeddingProvider {
	return &mockEmbeddingProvider{dim: 128}
}

func (m *mockEmbeddingProvider) Embed(text string) ([]float64, error) {
	return MockEmbedding(text, m.dim), nil
}

func (m *mockEmbeddingProvider) ProviderName() string { return "mock" }

// MockEmbedding generates a deterministic pseudo-vector from text using a simple hash
func MockEmbedding(text string, dim int) []float64 {
	vec := make([]float64, dim)
	if text == "" {
		return vec
	}

	// Simple deterministic hash-based embedding
	h := simpleHash(text)
	for i := 0; i < dim; i++ {
		// Use hash seed to generate pseudo-random values in [-1, 1]
		seed := h + uint64(i)*0x9e3779b97f4a7c15
		val := float64(int64(seed&0xFFFFFFFF))/float64(0xFFFFFFFF) * 2.0
		vec[i] = val
	}

	// Normalize to unit vector
	var norm float64
	for _, v := range vec {
		norm += v * v
	}
	if norm > 0 {
		norm = math.Sqrt(norm)
		for i := range vec {
			vec[i] /= norm
		}
	}

	return vec
}

// simpleHash is a fast, non-cryptographic hash
func simpleHash(s string) uint64 {
	var h uint64 = 14695981039346656037 // FNV offset basis
	for i := 0; i < len(s); i++ {
		h ^= uint64(s[i])
		h *= 1099511628211 // FNV prime
	}
	return h
}

// --- OpenAI Embedding Provider ---

type openAIEmbeddingProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

func newOpenAIEmbeddingProvider() EmbeddingProvider {
	apiKey := os.Getenv("EMBEDDING_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("LLM_API_KEY")
	}
	baseURL := os.Getenv("EMBEDDING_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	model := os.Getenv("EMBEDDING_MODEL")
	if model == "" {
		model = "text-embedding-3-small"
	}
	return &openAIEmbeddingProvider{
		apiKey:  apiKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (o *openAIEmbeddingProvider) Embed(text string) ([]float64, error) {
	if o.apiKey == "" {
		return nil, fmt.Errorf("EMBEDDING_API_KEY not configured")
	}

	body := map[string]interface{}{
		"input": text,
		"model": o.model,
	}
	bodyBytes, _ := json.Marshal(body)

	resp, err := o.client.Post(o.baseURL+"/embeddings", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("openai embedding request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("openai embedding returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode openai embedding response: %w", err)
	}

	if len(result.Data) == 0 {
		return nil, fmt.Errorf("openai returned no embeddings")
	}

	return result.Data[0].Embedding, nil
}

func (o *openAIEmbeddingProvider) ProviderName() string { return "openai" }

// --- Local Embedding Provider (HTTP-based) ---

type localEmbeddingProvider struct {
	endpoint string
	client   *http.Client
}

func newLocalEmbeddingProvider() EmbeddingProvider {
	endpoint := os.Getenv("LOCAL_EMBEDDING_URL")
	if endpoint == "" {
		endpoint = "http://localhost:11434/api/embeddings"
	}
	return &localEmbeddingProvider{
		endpoint: endpoint,
		client:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (l *localEmbeddingProvider) Embed(text string) ([]float64, error) {
	body := map[string]interface{}{
		"model":  "nomic-embed-text",
		"prompt": text,
	}
	bodyBytes, _ := json.Marshal(body)

	resp, err := l.client.Post(l.endpoint, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("local embedding request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("local embedding returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Embedding []float64 `json:"embedding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode local embedding response: %w", err)
	}

	return result.Embedding, nil
}

func (l *localEmbeddingProvider) ProviderName() string { return "local" }
