package service

import (
	"testing"
)

func TestCapabilityOverlapRatio(t *testing.T) {
	tests := []struct {
		name     string
		a, b     []string
		expected float64
	}{
		{
			name:     "identical capabilities",
			a:        []string{"translation", "nlp"},
			b:        []string{"translation", "nlp"},
			expected: 1.0,
		},
		{
			name:     "no overlap",
			a:        []string{"translation"},
			b:        []string{"ocr"},
			expected: 0.0,
		},
		{
			name:     "partial overlap",
			a:        []string{"translation", "nlp", "text"},
			b:        []string{"nlp", "sentiment"},
			expected: 0.25,
		},
		{
			name:     "empty sets",
			a:        []string{},
			b:        []string{},
			expected: 0.0,
		},
		{
			name:     "one empty set",
			a:        []string{"translation"},
			b:        []string{},
			expected: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := capabilityOverlapRatio(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("capabilityOverlapRatio(%v, %v) = %f, want %f", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}

func TestSchemaPairCompatibility(t *testing.T) {
	tests := []struct {
		name     string
		a, b     map[string]interface{}
		expected float64
	}{
		{
			name: "identical schemas",
			a: map[string]interface{}{
				"properties": map[string]interface{}{
					"text": map[string]interface{}{"type": "string"},
				},
			},
			b: map[string]interface{}{
				"properties": map[string]interface{}{
					"text": map[string]interface{}{"type": "string"},
				},
			},
			expected: 1.0,
		},
		{
			name:     "both nil",
			a:        nil,
			b:        nil,
			expected: 1.0,
		},
		{
			name: "one nil",
			a: map[string]interface{}{
				"properties": map[string]interface{}{
					"text": map[string]interface{}{"type": "string"},
				},
			},
			b:        nil,
			expected: 0.0,
		},
		{
			name: "no overlap",
			a: map[string]interface{}{
				"properties": map[string]interface{}{
					"text": map[string]interface{}{"type": "string"},
				},
			},
			b: map[string]interface{}{
				"properties": map[string]interface{}{
					"image": map[string]interface{}{"type": "string"},
				},
			},
			expected: 0.0,
		},
		{
			name: "partial overlap",
			a: map[string]interface{}{
				"properties": map[string]interface{}{
					"text":   map[string]interface{}{"type": "string"},
					"target": map[string]interface{}{"type": "string"},
				},
			},
			b: map[string]interface{}{
				"properties": map[string]interface{}{
					"text": map[string]interface{}{"type": "string"},
					"lang": map[string]interface{}{"type": "string"},
				},
			},
			expected: 0.3333333333333333,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SchemaPairCompatibility(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("SchemaPairCompatibility(%v, %v) = %f, want %f", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}

func TestSchemaCompatibility(t *testing.T) {
	inputA := map[string]interface{}{
		"properties": map[string]interface{}{
			"text": map[string]interface{}{"type": "string"},
		},
	}
	outputA := map[string]interface{}{
		"properties": map[string]interface{}{
			"result": map[string]interface{}{"type": "string"},
		},
	}
	inputB := map[string]interface{}{
		"properties": map[string]interface{}{
			"text": map[string]interface{}{"type": "string"},
			"lang": map[string]interface{}{"type": "string"},
		},
	}
	outputB := map[string]interface{}{
		"properties": map[string]interface{}{
			"result": map[string]interface{}{"type": "string"},
			"score":  map[string]interface{}{"type": "number"},
		},
	}

	result := SchemaCompatibility(inputA, outputA, inputB, outputB)
	// Input overlap: 1/2 = 0.5, Output overlap: 1/2 = 0.5
	// Average: (0.5 + 0.5) / 2 = 0.5
	expected := 0.5
	if result != expected {
		t.Errorf("SchemaCompatibility = %f, want %f", result, expected)
	}
}

func TestDetermineRecommendation(t *testing.T) {
	tests := []struct {
		name                 string
		capOverlap, semSim   float64
		schemaCompat         float64
		expectedRec          string
	}{
		{
			name:         "keep_better - high overlap",
			capOverlap:   0.85,
			semSim:       0.95,
			schemaCompat: 0.7,
			expectedRec:  "keep_better",
		},
		{
			name:         "clarify_positioning - moderate overlap",
			capOverlap:   0.6,
			semSim:       0.8,
			schemaCompat: 0.5,
			expectedRec:  "clarify_positioning",
		},
		{
			name:         "human_review - high semantic",
			capOverlap:   0.4,
			semSim:       0.9,
			schemaCompat: 0.7,
			expectedRec:  "human_review",
		},
		{
			name:         "keep_optimize - low overlap",
			capOverlap:   0.2,
			semSim:       0.3,
			schemaCompat: 0.1,
			expectedRec:  "keep_optimize",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec, _ := DetermineRecommendation(tt.capOverlap, tt.semSim, tt.schemaCompat)
			if rec != tt.expectedRec {
				t.Errorf("DetermineRecommendation(%f, %f, %f) = %s, want %s",
					tt.capOverlap, tt.semSim, tt.schemaCompat, rec, tt.expectedRec)
			}
		})
	}
}

func TestMockEmbeddingService(t *testing.T) {
	svc := NewMockEmbeddingService(128)

	// Test embedding generation
	emb1, err := svc.EmbedSkill("Text Translator", "Translates text", []string{"translation", "nlp"})
	if err != nil {
		t.Fatalf("EmbedSkill failed: %v", err)
	}
	if len(emb1) != 128 {
		t.Errorf("Expected embedding dimension 128, got %d", len(emb1))
	}

	// Test cosine similarity with same vector
	sim := svc.CosineSimilarity(emb1, emb1)
	if sim != 1.0 {
		t.Errorf("Self-similarity should be 1.0, got %f", sim)
	}

	// Test cosine similarity with different vectors
	emb2, _ := svc.EmbedSkill("Sentiment Analyzer", "Analyzes emotions", []string{"sentiment", "emotion"})
	sim2 := svc.CosineSimilarity(emb1, emb2)
	if sim2 < 0 || sim2 > 1 {
		t.Errorf("Similarity should be between 0 and 1, got %f", sim2)
	}
	t.Logf("Similarity between different skills: %f", sim2)
}

func TestMockEmbeddingService_Deterministic(t *testing.T) {
	svc := NewMockEmbeddingService(64)

	emb1, _ := svc.EmbedSkill("Test Skill", "Test description", []string{"test"})
	emb2, _ := svc.EmbedSkill("Test Skill", "Test description", []string{"test"})

	// Same input should produce same output
	for i := range emb1 {
		if emb1[i] != emb2[i] {
			t.Errorf("Embedding not deterministic: index %d differs", i)
			break
		}
	}
}

func TestMockEmbeddingService_CosineSimilarityEdgeCases(t *testing.T) {
	svc := NewMockEmbeddingService(128)

	// Zero vectors
	zeroVec := make([]float64, 128)
	normalVec, _ := svc.EmbedSkill("test", "desc", []string{"cap"})

	sim := svc.CosineSimilarity(zeroVec, normalVec)
	if sim != 0 {
		t.Errorf("Similarity with zero vector should be 0, got %f", sim)
	}

	// Empty vectors
	sim = svc.CosineSimilarity([]float64{}, []float64{})
	if sim != 0 {
		t.Errorf("Similarity of empty vectors should be 0, got %f", sim)
	}

	// Different dimensions
	sim = svc.CosineSimilarity([]float64{1, 2}, []float64{1, 2, 3})
	if sim != 0 {
		t.Errorf("Similarity of different dimension vectors should be 0, got %f", sim)
	}
}
