package service

import (
	"context"
	"os"

	"spinning/backend/internal/model"
)

type ProviderType string

const (
	ProviderOpenAI   ProviderType = "openai"
	ProviderOpenCode ProviderType = "opencode"
	ProviderMock     ProviderType = "mock"
)

type LLMProvider interface {
	Generate(ctx context.Context, req GenerateRequest, skills []model.Skill) (*GenerateResponse, error)
	GetProviderType() ProviderType
	GetName() string
	IsConfigured() bool
}

func NewLLMService() *LLMService {
	providerType := ProviderType(os.Getenv("LLM_PROVIDER"))
	if providerType == "" {
		providerType = ProviderOpenAI
	}

	var provider LLMProvider
	switch providerType {
	case ProviderOpenCode:
		provider = NewOpenCodeProvider()
	default:
		provider = NewOpenAIProvider()
	}

	return &LLMService{
		provider: provider,
	}
}

type LLMService struct {
	provider LLMProvider
}

func (l *LLMService) Generate(ctx context.Context, req GenerateRequest, skills []model.Skill) (*GenerateResponse, error) {
	return l.provider.Generate(ctx, req, skills)
}

func (l *LLMService) GetProviderType() ProviderType {
	return l.provider.GetProviderType()
}

func (l *LLMService) GetProviderName() string {
	return l.provider.GetName()
}

func (l *LLMService) IsConfigured() bool {
	return l.provider.IsConfigured()
}

func (l *LLMService) SetProvider(providerType ProviderType) error {
	var provider LLMProvider
	switch providerType {
	case ProviderOpenCode:
		provider = NewOpenCodeProvider()
	case ProviderOpenAI:
		provider = NewOpenAIProvider()
	default:
		provider = NewMockProvider()
	}
	l.provider = provider
	return nil
}

type ProviderConfig struct {
	Type             ProviderType `json:"type"`
	Name             string       `json:"name"`
	APIKey           string       `json:"api_key,omitempty"`
	BaseURL          string       `json:"base_url,omitempty"`
	Model            string       `json:"model,omitempty"`
	Timeout          int          `json:"timeout,omitempty"`
	CLIPath          string       `json:"cli_path,omitempty"`
	DefaultFallback  ProviderType `json:"default_fallback,omitempty"`
	AutoSyncSkills   bool         `json:"auto_sync_skills,omitempty"`
	SyncIntervalMins int          `json:"sync_interval_mins,omitempty"`
}

func GetAvailableProviders() []ProviderConfig {
	return []ProviderConfig{
		{
			Type:    ProviderOpenAI,
			Name:    "OpenAI",
			BaseURL: "https://api.openai.com/v1",
			Model:   "gpt-4o-mini",
			Timeout: 60,
		},
		{
			Type:    ProviderOpenCode,
			Name:    "OpenCode",
			CLIPath: "opencode",
			Timeout: 120,
		},
		{
			Type:   ProviderMock,
			Name:   "Mock Generator",
			Model:  "mock",
			Timeout: 5,
		},
	}
}
