package db

import (
	"encoding/json"
	"log"

	"spinning/backend/internal/model"
)

// Seed inserts demo skills and templates if the DB is empty
func Seed() {
	var count int64
	DB.Model(&model.Skill{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[DB] Seeding demo data...")

	skills := []model.Skill{
		{
			ID: "skill-translate", Name: "Text Translator",
			Description: "Translates text between languages using neural machine translation",
			Version: "1.2.0", Author: "alice", OwnerTeam: "nlp-team",
			Category: model.StringSlice{"nlp", "transform"},
			Capabilities: model.StringSlice{"translation", "multilingual", "text-processing"},
			ConflictTags: model.StringSlice{"text-input", "language"},
			CallCount: 342, Status: "active", Icon: "TL",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"text":{"type":"string","description":"Text to translate"},"target_lang":{"type":"string","description":"Target language code"}},"required":["text","target_lang"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"translated_text":{"type":"string"},"confidence":{"type":"number"},"detected_lang":{"type":"string"}}}`),
		},
		{
			ID: "skill-sentiment", Name: "Sentiment Analyzer",
			Description: "Analyzes emotional tone of text — positive, negative, or neutral",
			Version: "2.0.1", Author: "bob", OwnerTeam: "nlp-team",
			Category: model.StringSlice{"nlp", "ai"},
			Capabilities: model.StringSlice{"sentiment-analysis", "emotion-detection", "text-classification"},
			ConflictTags: model.StringSlice{"text-input"},
			CallCount: 521, Status: "active", Icon: "SA",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"text":{"type":"string","description":"Text to analyze"}},"required":["text"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"sentiment":{"type":"string"},"score":{"type":"number"},"emotions":{"type":"object"}}}`),
		},
		{
			ID: "skill-keywords", Name: "Keyword Extractor",
			Description: "Extracts key phrases and named entities from text",
			Version: "1.0.3", Author: "carol", OwnerTeam: "nlp-team",
			Category: model.StringSlice{"nlp"},
			Capabilities: model.StringSlice{"keyword-extraction", "ner", "text-analysis"},
			ConflictTags: model.StringSlice{"text-input"},
			CallCount: 289, Status: "active", Icon: "KE",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"text":{"type":"string"},"max_keywords":{"type":"number"}},"required":["text"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"keywords":{"type":"array"},"entities":{"type":"array"},"summary":{"type":"string"}}}`),
		},
		{
			ID: "skill-summarize", Name: "Text Summarizer",
			Description: "Generates concise summaries of long documents using LLM",
			Version: "1.1.0", Author: "alice", OwnerTeam: "nlp-team",
			Category: model.StringSlice{"nlp", "ai"},
			Capabilities: model.StringSlice{"summarization", "text-compression", "nlp"},
			ConflictTags: model.StringSlice{"text-input", "llm"},
			CallCount: 198, Status: "active", Icon: "SU",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"text":{"type":"string"},"max_length":{"type":"number"},"style":{"type":"string"}},"required":["text"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"summary":{"type":"string"},"word_count":{"type":"number"}}}`),
		},
		{
			ID: "skill-classify", Name: "ML Classifier",
			Description: "Classifies input into predefined categories using trained ML model",
			Version: "3.0.0", Author: "dave", OwnerTeam: "ml-team",
			Category: model.StringSlice{"ai", "data"},
			Capabilities: model.StringSlice{"classification", "ml-inference", "prediction"},
			ConflictTags: model.StringSlice{"ml-model"},
			CallCount: 876, Status: "active", Icon: "CL",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"input":{"type":"string"},"model_id":{"type":"string"},"threshold":{"type":"number"}},"required":["input"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"label":{"type":"string"},"confidence":{"type":"number"},"probabilities":{"type":"object"}}}`),
		},
		{
			ID: "skill-ocr", Name: "OCR Extractor",
			Description: "Extracts text from images and PDFs using optical character recognition",
			Version: "2.1.0", Author: "eve", OwnerTeam: "vision-team",
			Category: model.StringSlice{"image", "data"},
			Capabilities: model.StringSlice{"ocr", "image-processing", "text-extraction"},
			ConflictTags: model.StringSlice{"image-input"},
			CallCount: 156, Status: "active", Icon: "OC",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"image_url":{"type":"string"},"language":{"type":"string"}},"required":["image_url"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"text":{"type":"string"},"confidence":{"type":"number"},"blocks":{"type":"array"}}}`),
		},
		{
			ID: "skill-search", Name: "Semantic Search",
			Description: "Finds semantically similar documents using vector embeddings",
			Version: "1.5.0", Author: "frank", OwnerTeam: "search-team",
			Category: model.StringSlice{"search", "ai"},
			Capabilities: model.StringSlice{"semantic-search", "vector-search", "retrieval"},
			ConflictTags: model.StringSlice{"vector-db"},
			CallCount: 445, Status: "active", Icon: "SS",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"query":{"type":"string"},"top_k":{"type":"number"},"collection":{"type":"string"}},"required":["query"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"results":{"type":"array"},"total":{"type":"number"}}}`),
		},
		{
			ID: "skill-notify", Name: "Notification Sender",
			Description: "Sends notifications via email, Slack, SMS, or webhook",
			Version: "1.0.0", Author: "grace", OwnerTeam: "platform-team",
			Category: model.StringSlice{"notify"},
			Capabilities: model.StringSlice{"email", "slack", "sms", "webhook"},
			ConflictTags: model.StringSlice{"notification"},
			CallCount: 1204, Status: "active", Icon: "NS",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"channel":{"type":"string"},"message":{"type":"string"},"recipient":{"type":"string"}},"required":["channel","message","recipient"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"sent":{"type":"boolean"},"message_id":{"type":"string"}}}`),
		},
		{
			ID: "skill-transform", Name: "Data Transformer",
			Description: "Transforms and normalises structured data between formats (JSON, CSV, XML)",
			Version: "2.2.0", Author: "henry", OwnerTeam: "data-team",
			Category: model.StringSlice{"data", "transform"},
			Capabilities: model.StringSlice{"data-transformation", "format-conversion", "etl"},
			ConflictTags: model.StringSlice{"data-pipeline"},
			CallCount: 634, Status: "active", Icon: "DT",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"data":{"type":"object"},"source_format":{"type":"string"},"target_format":{"type":"string"}},"required":["data","target_format"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"result":{"type":"object"},"format":{"type":"string"}}}`),
		},
		{
			ID: "skill-codegen", Name: "Code Generator",
			Description: "Generates boilerplate code from templates and specifications",
			Version: "1.0.0", Author: "iris", OwnerTeam: "dev-tools",
			Category: model.StringSlice{"code"},
			Capabilities: model.StringSlice{"code-generation", "templating", "scaffolding"},
			ConflictTags: model.StringSlice{"code-output", "llm"},
			CallCount: 87, Status: "draft", Icon: "CG",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"spec":{"type":"string"},"language":{"type":"string"},"template":{"type":"string"}},"required":["spec","language"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"code":{"type":"string"},"language":{"type":"string"},"files":{"type":"array"}}}`),
		},
		{
			ID: "skill-validate", Name: "Input Validator",
			Description: "Validates structured input against a JSON Schema definition",
			Version: "1.3.0", Author: "alice", OwnerTeam: "platform-team",
			Category: model.StringSlice{"data"},
			Capabilities: model.StringSlice{"validation", "schema-check", "data-quality"},
			ConflictTags: model.StringSlice{"data-pipeline"},
			CallCount: 923, Status: "active", Icon: "IV",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"data":{"type":"object"},"schema":{"type":"object"}},"required":["data","schema"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"valid":{"type":"boolean"},"errors":{"type":"array"},"warnings":{"type":"array"}}}`),
		},
		{
			ID: "skill-scrape", Name: "Web Scraper",
			Description: "Scrapes structured content from web pages using CSS selectors",
			Version: "1.1.0", Author: "jack", OwnerTeam: "data-team",
			Category: model.StringSlice{"data", "search"},
			Capabilities: model.StringSlice{"web-scraping", "data-extraction", "html-parsing"},
			ConflictTags: model.StringSlice{"http-client"},
			CallCount: 201, Status: "active", Icon: "WS",
			InputSchema:  mustJSONMap(`{"type":"object","properties":{"url":{"type":"string"},"selectors":{"type":"object"}},"required":["url"]}`),
			OutputSchema: mustJSONMap(`{"type":"object","properties":{"data":{"type":"object"},"links":{"type":"array"},"metadata":{"type":"object"}}}`),
		},
	}

	for _, sk := range skills {
		DB.Create(&sk)
	}

	// Seed built-in templates
	seedTemplates()

	log.Printf("[DB] Seeded %d skills and built-in templates", len(skills))
}

func seedTemplates() {
	templates := []struct {
		ID          string
		Name        string
		Description string
		Category    string
		Tags        []string
		Nodes       []model.FlowNode
		Edges       []model.FlowEdge
	}{
		{
			ID: "tpl-nlp-pipeline", Name: "NLP Analysis Pipeline",
			Description: "Translate → parallel(sentiment + keywords) → merge → notify",
			Category:    "nlp", Tags: []string{"nlp", "analysis", "parallel"},
			Nodes: []model.FlowNode{
				{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}},
				{ID: "skill-1", Type: "skill", SkillID: "skill-translate", Label: "Text Translator", Config: model.JSONMap{}},
				{ID: "fork-1", Type: "parallel_fork", Label: "Parallel Fork", Config: model.JSONMap{}},
				{ID: "skill-2", Type: "skill", SkillID: "skill-sentiment", Label: "Sentiment Analyzer", Config: model.JSONMap{}},
				{ID: "skill-3", Type: "skill", SkillID: "skill-keywords", Label: "Keyword Extractor", Config: model.JSONMap{}},
				{ID: "join-1", Type: "parallel_join", Label: "Parallel Join", Config: model.JSONMap{}},
				{ID: "skill-4", Type: "skill", SkillID: "skill-notify", Label: "Notification Sender", Config: model.JSONMap{}},
				{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}},
			},
			Edges: []model.FlowEdge{
				{ID: "e1", Source: "start", Target: "skill-1", EdgeType: "serial"},
				{ID: "e2", Source: "skill-1", Target: "fork-1", EdgeType: "serial"},
				{ID: "e3", Source: "fork-1", Target: "skill-2", EdgeType: "parallel"},
				{ID: "e4", Source: "fork-1", Target: "skill-3", EdgeType: "parallel"},
				{ID: "e5", Source: "skill-2", Target: "join-1", EdgeType: "parallel"},
				{ID: "e6", Source: "skill-3", Target: "join-1", EdgeType: "parallel"},
				{ID: "e7", Source: "join-1", Target: "skill-4", EdgeType: "serial"},
				{ID: "e8", Source: "skill-4", Target: "end", EdgeType: "serial"},
			},
		},
		{
			ID: "tpl-approval", Name: "Approval Flow",
			Description: "Validate → classify → conditional(approve/reject) → notify",
			Category:    "workflow", Tags: []string{"approval", "conditional", "validation"},
			Nodes: []model.FlowNode{
				{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}},
				{ID: "skill-1", Type: "skill", SkillID: "skill-validate", Label: "Input Validator", Config: model.JSONMap{}},
				{ID: "skill-2", Type: "skill", SkillID: "skill-classify", Label: "ML Classifier", Config: model.JSONMap{}},
				{ID: "cond-1", Type: "condition", Label: "Approved?", Config: model.JSONMap{}, ConditionExpr: "score > 0.8"},
				{ID: "skill-3", Type: "skill", SkillID: "skill-notify", Label: "Notify Approved", Config: model.JSONMap{}},
				{ID: "skill-4", Type: "skill", SkillID: "skill-notify", Label: "Notify Rejected", Config: model.JSONMap{}},
				{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}},
			},
			Edges: []model.FlowEdge{
				{ID: "e1", Source: "start", Target: "skill-1", EdgeType: "serial"},
				{ID: "e2", Source: "skill-1", Target: "skill-2", EdgeType: "serial"},
				{ID: "e3", Source: "skill-2", Target: "cond-1", EdgeType: "serial"},
				{ID: "e4", Source: "cond-1", Target: "skill-3", EdgeType: "conditional", Label: "true"},
				{ID: "e5", Source: "cond-1", Target: "skill-4", EdgeType: "conditional", Label: "false"},
				{ID: "e6", Source: "skill-3", Target: "end", EdgeType: "serial"},
				{ID: "e7", Source: "skill-4", Target: "end", EdgeType: "serial"},
			},
		},
		{
			ID: "tpl-scrape-summarize", Name: "Scrape & Summarize",
			Description: "Scrape webpage → OCR(optional) → summarize → search → output",
			Category:    "data", Tags: []string{"scraping", "nlp", "data"},
			Nodes: []model.FlowNode{
				{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}},
				{ID: "skill-1", Type: "skill", SkillID: "skill-scrape", Label: "Web Scraper", Config: model.JSONMap{}},
				{ID: "skill-2", Type: "skill", SkillID: "skill-summarize", Label: "Text Summarizer", Config: model.JSONMap{}},
				{ID: "skill-3", Type: "skill", SkillID: "skill-search", Label: "Semantic Search", Config: model.JSONMap{}},
				{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}},
			},
			Edges: []model.FlowEdge{
				{ID: "e1", Source: "start", Target: "skill-1", EdgeType: "serial"},
				{ID: "e2", Source: "skill-1", Target: "skill-2", EdgeType: "serial"},
				{ID: "e3", Source: "skill-2", Target: "skill-3", EdgeType: "serial"},
				{ID: "e4", Source: "skill-3", Target: "end", EdgeType: "serial"},
			},
		},
		{
			ID: "tpl-etl", Name: "ETL Data Pipeline",
			Description: "Validate → transform → parallel(classify + search) → notify",
			Category:    "data", Tags: []string{"etl", "data", "parallel"},
			Nodes: []model.FlowNode{
				{ID: "start", Type: "start", Label: "Start", Config: model.JSONMap{}},
				{ID: "skill-1", Type: "skill", SkillID: "skill-validate", Label: "Input Validator", Config: model.JSONMap{}},
				{ID: "skill-2", Type: "skill", SkillID: "skill-transform", Label: "Data Transformer", Config: model.JSONMap{}},
				{ID: "fork-1", Type: "parallel_fork", Label: "Parallel Fork", Config: model.JSONMap{}},
				{ID: "skill-3", Type: "skill", SkillID: "skill-classify", Label: "ML Classifier", Config: model.JSONMap{}},
				{ID: "skill-4", Type: "skill", SkillID: "skill-search", Label: "Semantic Search", Config: model.JSONMap{}},
				{ID: "join-1", Type: "parallel_join", Label: "Parallel Join", Config: model.JSONMap{}},
				{ID: "skill-5", Type: "skill", SkillID: "skill-notify", Label: "Notification Sender", Config: model.JSONMap{}},
				{ID: "end", Type: "end", Label: "End", Config: model.JSONMap{}},
			},
			Edges: []model.FlowEdge{
				{ID: "e1", Source: "start", Target: "skill-1", EdgeType: "serial"},
				{ID: "e2", Source: "skill-1", Target: "skill-2", EdgeType: "serial"},
				{ID: "e3", Source: "skill-2", Target: "fork-1", EdgeType: "serial"},
				{ID: "e4", Source: "fork-1", Target: "skill-3", EdgeType: "parallel"},
				{ID: "e5", Source: "fork-1", Target: "skill-4", EdgeType: "parallel"},
				{ID: "e6", Source: "skill-3", Target: "join-1", EdgeType: "parallel"},
				{ID: "e7", Source: "skill-4", Target: "join-1", EdgeType: "parallel"},
				{ID: "e8", Source: "join-1", Target: "skill-5", EdgeType: "serial"},
				{ID: "e9", Source: "skill-5", Target: "end", EdgeType: "serial"},
			},
		},
	}

	for _, t := range templates {
		nodesJSON, _ := json.Marshal(t.Nodes)
		edgesJSON, _ := json.Marshal(t.Edges)
		tpl := model.FlowTemplate{
			ID:          t.ID,
			Name:        t.Name,
			Description: t.Description,
			Category:    t.Category,
			IsBuiltin:   true,
			CreatedBy:   "system",
			Tags:        model.StringSlice(t.Tags),
			NodesJSON:   string(nodesJSON),
			EdgesJSON:   string(edgesJSON),
		}
		DB.Create(&tpl)
	}
}

func mustJSONMap(s string) model.JSONMap {
	var m model.JSONMap
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		panic(err)
	}
	return m
}
