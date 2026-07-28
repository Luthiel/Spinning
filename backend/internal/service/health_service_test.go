package service

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spinning/backend/internal/model"
	"spinning/backend/internal/service/engine"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&model.Skill{}, &model.HealthReport{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func seedSkill(db *gorm.DB, id, name string, callCount int64, successRate float64) {
	db.Create(&model.Skill{
		ID:          id,
		Name:        name,
		CallCount:   callCount,
		SuccessRate: successRate,
	})
}

// --- Sliding Average Tests ---

func TestSuccessRate_FirstCall(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s1", "TestSkill", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{
		SkillID: "s1",
		Success: true,
	})

	skill, _ := svc.GetSkillHealth("s1")
	// First success: newRate = 1.0 + (1-1.0)/1 = 1.0
	if skill.SuccessRate != 1.0 {
		t.Errorf("expected success_rate=1.0 after first success, got %f", skill.SuccessRate)
	}
	if skill.CallCount != 1 {
		t.Errorf("expected call_count=1, got %d", skill.CallCount)
	}
}

func TestSuccessRate_FirstFailure(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s2", "TestSkill2", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{
		SkillID: "s2",
		Success: false,
	})

	skill, _ := svc.GetSkillHealth("s2")
	// First failure: newRate = 1.0 * (1 - 1/1) = 0.0
	if skill.SuccessRate != 0.0 {
		t.Errorf("expected success_rate=0.0 after first failure, got %f", skill.SuccessRate)
	}
	if skill.ErrorCount != 1 {
		t.Errorf("expected error_count=1, got %d", skill.ErrorCount)
	}
}

func TestSuccessRate_MixedSequence(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s3", "MixedSkill", 0, 1.0)
	svc := NewHealthService(db)

	// Sequence: success, success, failure, success
	// After call 1 (success): rate = 1.0 + (1-1.0)/1 = 1.0, total=1
	// After call 2 (success): rate = 1.0 + (1-1.0)/2 = 1.0, total=2
	// After call 3 (failure): rate = 1.0 * (1 - 1/3) = 0.6667, total=3
	// After call 4 (success): rate = 0.6667 + (1-0.6667)/4 = 0.75, total=4
_sequence := []bool{true, true, false, true}
	expected := []float64{1.0, 1.0, 2.0 / 3.0, 0.75}

	for i, success := range _sequence {
		svc.UpdateSkillMetrics(engine.NodeResult{
			SkillID: "s3",
			Success: success,
		})
		skill, _ := svc.GetSkillHealth("s3")
		if diff := skill.SuccessRate - expected[i]; diff > 0.001 || diff < -0.001 {
			t.Errorf("after call %d: expected success_rate=%.4f, got %.4f", i+1, expected[i], skill.SuccessRate)
		}
	}
}

func TestSuccessRate_AllFailures(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s4", "FailSkill", 0, 1.0)
	svc := NewHealthService(db)

	// 5 failures in a row
	// After 1: 1.0 * (1-1/1) = 0.0
	// After 2: 0.0 * (1-1/2) = 0.0
	// ... stays 0
	for i := 0; i < 5; i++ {
		svc.UpdateSkillMetrics(engine.NodeResult{
			SkillID: "s4",
			Success: false,
		})
	}
	skill, _ := svc.GetSkillHealth("s4")
	if skill.SuccessRate != 0.0 {
		t.Errorf("expected success_rate=0.0 after all failures, got %f", skill.SuccessRate)
	}
	if skill.ErrorCount != 5 {
		t.Errorf("expected error_count=5, got %d", skill.ErrorCount)
	}
}

func TestAvgLatency_FirstCall(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s5", "LatSkill", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{
		SkillID:  "s5",
		Success:  true,
		LatencyMs: 500,
	})

	skill, _ := svc.GetSkillHealth("s5")
	if skill.AvgLatencyMs != 500 {
		t.Errorf("expected avg_latency_ms=500, got %d", skill.AvgLatencyMs)
	}
}

func TestAvgLatency_ExponentialMovingAverage(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s6", "LatSkill2", 0, 1.0)
	svc := NewHealthService(db)

	// First call sets baseline
	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s6", Success: true, LatencyMs: 400})
	// Second call: (400*3 + 1200)/4 = 600
	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s6", Success: true, LatencyMs: 1200})

	skill, _ := svc.GetSkillHealth("s6")
	expected := int64((400*3 + 1200) / 4) // = 600
	if skill.AvgLatencyMs != expected {
		t.Errorf("expected avg_latency_ms=%d, got %d", expected, skill.AvgLatencyMs)
	}
}

func TestAvgLatency_Converges(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s7", "ConvSkill", 0, 1.0)
	svc := NewHealthService(db)

	// Set baseline
	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s7", Success: true, LatencyMs: 100})

	// Many calls at 200ms — integer EMA should converge very close to 200
	for i := 0; i < 30; i++ {
		svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s7", Success: true, LatencyMs: 200})
	}
	skill, _ := svc.GetSkillHealth("s7")
	// With integer division the EMA stabilises at 197 due to truncation:
	// (197*3+200)/4 = 791/4 = 197
	if skill.AvgLatencyMs != 197 {
		t.Errorf("expected avg_latency_ms=197 (integer EMA steady state), got %d", skill.AvgLatencyMs)
	}
}

func TestCallCount_Increments(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s8", "CountSkill", 0, 1.0)
	svc := NewHealthService(db)

	for i := 0; i < 10; i++ {
		svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s8", Success: true})
	}
	skill, _ := svc.GetSkillHealth("s8")
	if skill.CallCount != 10 {
		t.Errorf("expected call_count=10, got %d", skill.CallCount)
	}
}

func TestTotalTokens_Accumulates(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s9", "TokenSkill", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s9", Success: true, TokensUsed: 100})
	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s9", Success: true, TokensUsed: 250})
	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s9", Success: true, TokensUsed: 50})

	skill, _ := svc.GetSkillHealth("s9")
	if skill.TotalTokens != 400 {
		t.Errorf("expected total_tokens=400, got %d", skill.TotalTokens)
	}
}

func TestLastUsedAt_Updated(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s10", "TimeSkill", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s10", Success: true})

	skill, _ := svc.GetSkillHealth("s10")
	if skill.LastUsedAt == nil {
		t.Error("expected last_used_at to be set")
	}
}

// --- Health History Tests ---

func TestHealthHistory_RecordedOnEachExecution(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s11", "HistSkill", 0, 1.0)
	svc := NewHealthService(db)

	for i := 0; i < 5; i++ {
		svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s11", Success: true})
	}

	reports, err := svc.GetHealthHistory("s11")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reports) != 5 {
		t.Fatalf("expected 5 history records, got %d", len(reports))
	}

	// Verify ascending order
	for i := 1; i < len(reports); i++ {
		if reports[i].CheckedAt.Before(reports[i-1].CheckedAt) {
			t.Errorf("history not in ascending order at index %d", i)
		}
	}

	// Verify each record has the right skill_id
	for _, r := range reports {
		if r.SkillID != "s11" {
			t.Errorf("expected skill_id=s11, got %s", r.SkillID)
		}
	}
}

func TestHealthHistory_MetricsSnapshotted(t *testing.T) {
	db := setupTestDB(t)
	seedSkill(db, "s12", "SnapSkill", 0, 1.0)
	svc := NewHealthService(db)

	svc.UpdateSkillMetrics(engine.NodeResult{SkillID: "s12", Success: true, LatencyMs: 500})

	reports, _ := svc.GetHealthHistory("s12")
	if len(reports) != 1 {
		t.Fatalf("expected 1 report, got %d", len(reports))
	}

	r := reports[0]
	if r.CallCount != 1 {
		t.Errorf("expected snapshotted call_count=1, got %d", r.CallCount)
	}
	if r.SuccessRate != 1.0 {
		t.Errorf("expected snapshotted success_rate=1.0, got %f", r.SuccessRate)
	}
	if r.AvgLatencyMs != 500 {
		t.Errorf("expected snapshotted avg_latency_ms=500, got %d", r.AvgLatencyMs)
	}
}

func TestHealthHistory_EmptyForUnknownSkill(t *testing.T) {
	db := setupTestDB(t)
	svc := NewHealthService(db)

	reports, err := svc.GetHealthHistory("nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(reports) != 0 {
		t.Errorf("expected 0 reports for unknown skill, got %d", len(reports))
	}
}

// --- Edge Cases ---

func TestUpdateSkillMetrics_NonexistentSkill(t *testing.T) {
	db := setupTestDB(t)
	svc := NewHealthService(db)

	// Should not panic — just silently return
	svc.UpdateSkillMetrics(engine.NodeResult{
		SkillID: "does-not-exist",
		Success: true,
	})
}

// --- Executor Callback Test ---

func TestExecutor_CallsOnNodeComplete(t *testing.T) {
	// Verify that the executor invokes the callback on skill node completion
	db := setupTestDB(t)
	seedSkill(db, "s-callback", "CallbackSkill", 0, 1.0)

	flow := &model.Flow{
		ID:   "flow-cb",
		Name: "Callback Test Flow",
		Nodes: []model.FlowNode{
			{ID: "start", FlowID: "flow-cb", Type: "start", PositionX: 100, PositionY: 100, Config: model.JSONMap{}},
			{ID: "skill-node", FlowID: "flow-cb", Type: "skill", SkillID: "s-callback", PositionX: 300, PositionY: 100, Enabled: true, Config: model.JSONMap{}},
			{ID: "end", FlowID: "flow-cb", Type: "end", PositionX: 500, PositionY: 100, Config: model.JSONMap{}},
		},
		Edges: []model.FlowEdge{
			{ID: "e1", FlowID: "flow-cb", Source: "start", Target: "skill-node", EdgeType: "serial"},
			{ID: "e2", FlowID: "flow-cb", Source: "skill-node", Target: "end", EdgeType: "serial"},
		},
	}

	skills := map[string]*model.Skill{
		"s-callback": {ID: "s-callback", Name: "CallbackSkill"},
	}

	eventCh := make(chan engine.WSEvent, 100)
	healthSvc := NewHealthService(db)

	var callbackCount int
	onComplete := func(result engine.NodeResult) {
		callbackCount++
		healthSvc.UpdateSkillMetrics(result)
	}

	exec := engine.NewExecutorWithCallback(flow, skills, eventCh, onComplete)

	// Run with enough time for the simulated delay
	done := make(chan struct{})
	go func() {
		exec.Run(t.Context())
		close(done)
	}()

	// Drain events
	go func() {
		for range eventCh {
		}
	}()

	<-done

	if callbackCount < 1 {
		t.Errorf("expected OnNodeComplete to be called at least once, called %d times", callbackCount)
	}

	// Verify skill metrics were updated
	skill, err := healthSvc.GetSkillHealth("s-callback")
	if err != nil {
		t.Fatalf("skill not found: %v", err)
	}
	if skill.CallCount < 1 {
		t.Errorf("expected call_count >= 1, got %d", skill.CallCount)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
