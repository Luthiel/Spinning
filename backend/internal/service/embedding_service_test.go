package service

import (
	"testing"

	"spinning/backend/internal/model"
)

func TestMockEmbedding_Deterministic(t *testing.T) {
	vec1 := MockEmbedding("hello world", 128)
	vec2 := MockEmbedding("hello world", 128)

	if len(vec1) != 128 {
		t.Fatalf("expected 128 dimensions, got %d", len(vec1))
	}
	for i := range vec1 {
		if vec1[i] != vec2[i] {
			t.Fatalf("mock embedding not deterministic: vec1[%d]=%f, vec2[%d]=%f", i, vec1[i], i, vec2[i])
		}
	}
}

func TestMockEmbedding_DifferentText(t *testing.T) {
	vec1 := MockEmbedding("hello", 128)
	vec2 := MockEmbedding("goodbye", 128)

	// Different inputs should produce different vectors
	same := true
	for i := range vec1 {
		if vec1[i] != vec2[i] {
			same = false
			break
		}
	}
	if same {
		t.Fatal("different texts produced identical embeddings")
	}
}

func TestMockEmbedding_EmptyText(t *testing.T) {
	vec := MockEmbedding("", 128)
	if len(vec) != 128 {
		t.Fatalf("expected 128 dimensions, got %d", len(vec))
	}
	for _, v := range vec {
		if v != 0 {
			t.Fatalf("empty text should produce zero vector, got %f", v)
		}
	}
}

func TestMockEmbedding_UnitVector(t *testing.T) {
	vec := MockEmbedding("test embedding normalization", 128)
	var norm float64
	for _, v := range vec {
		norm += v * v
	}
	if norm < 0.99 || norm > 1.01 {
		t.Fatalf("expected unit vector (norm≈1.0), got %f", norm)
	}
}

func TestCosineSimilarity_Identical(t *testing.T) {
	vec := MockEmbedding("hello", 128)
	sim := CosineSimilarity(vec, vec)
	if sim < 0.999 {
		t.Fatalf("cosine similarity of identical vectors should be ~1.0, got %f", sim)
	}
}

func TestCosineSimilarity_Orthogonal(t *testing.T) {
	a := make([]float64, 4)
	b := make([]float64, 4)
	a[0] = 1.0
	b[1] = 1.0
	sim := CosineSimilarity(a, b)
	if sim != 0 {
		t.Fatalf("cosine similarity of orthogonal vectors should be 0, got %f", sim)
	}
}

func TestCosineSimilarity_EmptyVectors(t *testing.T) {
	sim := CosineSimilarity([]float64{}, []float64{})
	if sim != 0 {
		t.Fatalf("cosine similarity of empty vectors should be 0, got %f", sim)
	}
}

func TestCosineSimilarity_DifferentLengths(t *testing.T) {
	a := []float64{1, 0, 0}
	b := []float64{1, 0}
	sim := CosineSimilarity(a, b)
	if sim != 0 {
		t.Fatalf("cosine similarity of different-length vectors should be 0, got %f", sim)
	}
}

func TestCosineSimilarity_ZeroVector(t *testing.T) {
	a := []float64{0, 0, 0}
	b := []float64{1, 0, 0}
	sim := CosineSimilarity(a, b)
	if sim != 0 {
		t.Fatalf("cosine similarity with zero vector should be 0, got %f", sim)
	}
}

func TestCosineSimilarity_Opposite(t *testing.T) {
	a := []float64{1, 0}
	b := []float64{-1, 0}
	sim := CosineSimilarity(a, b)
	if sim > -0.999 || sim < -1.001 {
		t.Fatalf("cosine similarity of opposite vectors should be -1, got %f", sim)
	}
}

func TestEmbedSkill_BuildsText(t *testing.T) {
	skill := &model.Skill{
		Name:         "Test Skill",
		Description:  "A test description",
		Capabilities: model.StringSlice{"cap1", "cap2"},
		Category:     model.StringSlice{"cat1"},
	}
	text := buildSkillText(skill)
	expected := "Test Skill A test description cap1 cap2 cat1"
	if text != expected {
		t.Fatalf("expected %q, got %q", expected, text)
	}
}

func TestEmbedSkill_MinimalFields(t *testing.T) {
	skill := &model.Skill{Name: "Only Name"}
	text := buildSkillText(skill)
	if text != "Only Name" {
		t.Fatalf("expected 'Only Name', got %q", text)
	}
}

func TestEmbeddingService_Fallback(t *testing.T) {
	// Test with mock provider (always succeeds)
	svc := NewEmbeddingService()
	skill := &model.Skill{
		Name:         "Fallback Test",
		Description:  "Test fallback",
		Capabilities: model.StringSlice{"test"},
	}
	vec, err := svc.EmbedSkill(skill)
	if err != nil {
		t.Fatalf("EmbedSkill failed: %v", err)
	}
	if len(vec) != 128 {
		t.Fatalf("expected 128 dimensions, got %d", len(vec))
	}
}

func TestSimpleHash_Consistency(t *testing.T) {
	h1 := simpleHash("test string")
	h2 := simpleHash("test string")
	if h1 != h2 {
		t.Fatalf("simpleHash not consistent: %d != %d", h1, h2)
	}
}

func TestSimpleHash_Different(t *testing.T) {
	h1 := simpleHash("string one")
	h2 := simpleHash("string two")
	if h1 == h2 {
		t.Fatal("different strings produced same hash")
	}
}
