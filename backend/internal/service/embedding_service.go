package service

import (
	"math"
	"strings"
)

// EmbeddingService provides vector embedding capabilities for skills
type EmbeddingService interface {
	// EmbedSkill generates an embedding vector for a skill
	EmbedSkill(name, description string, capabilities []string) ([]float64, error)
	// CosineSimilarity computes the cosine similarity between two vectors
	CosineSimilarity(a, b []float64) float64
}

// MockEmbeddingService provides a deterministic mock embedding for testing/development
type MockEmbeddingService struct {
	dimension int
}

// NewMockEmbeddingService creates a new mock embedding service with the given vector dimension
func NewMockEmbeddingService(dimension int) *MockEmbeddingService {
	if dimension <= 0 {
		dimension = 128
	}
	return &MockEmbeddingService{dimension: dimension}
}

// EmbedSkill generates a deterministic mock embedding based on the skill's text content
func (m *MockEmbeddingService) EmbedSkill(name, description string, capabilities []string) ([]float64, error) {
	// Combine all text into a single string for hashing
	text := strings.ToLower(name + " " + description + " " + strings.Join(capabilities, " "))
	
	// Generate a deterministic vector using a simple hash-based approach
	vec := make([]float64, m.dimension)
	for i := 0; i < m.dimension; i++ {
		// Simple hash: use position and character codes to create variation
		hash := float64(0)
		for j, ch := range text {
			hash += float64(ch) * math.Sin(float64(i*j+1))
		}
		vec[i] = math.Tanh(hash / float64(len(text)+1))
	}
	
	// Normalize the vector
	norm := 0.0
	for _, v := range vec {
		norm += v * v
	}
	norm = math.Sqrt(norm)
	if norm > 0 {
		for i := range vec {
			vec[i] /= norm
		}
	}
	
	return vec, nil
}

// CosineSimilarity computes the cosine similarity between two vectors
func (m *MockEmbeddingService) CosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	
	dotProduct := 0.0
	normA := 0.0
	normB := 0.0
	
	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	
	denominator := math.Sqrt(normA) * math.Sqrt(normB)
	if denominator == 0 {
		return 0
	}
	
	return dotProduct / denominator
}
