package engine

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"spinning/backend/internal/model"
)

// WSEvent is a message sent over WebSocket during execution
type WSEvent struct {
	Type        string                 `json:"type"`
	ExecutionID string                 `json:"execution_id"`
	Payload     map[string]interface{} `json:"payload"`
}

// Executor runs a flow DAG
type Executor struct {
	flow      *model.Flow
	skills    map[string]*model.Skill
	execution *model.FlowExecution
	eventCh   chan<- WSEvent
	mu        sync.Mutex
}

func NewExecutor(flow *model.Flow, skills map[string]*model.Skill, eventCh chan<- WSEvent) *Executor {
	execID := generateID()
	now := time.Now()
	return &Executor{
		flow:   flow,
		skills: skills,
		eventCh: eventCh,
		execution: &model.FlowExecution{
			ID:             execID,
			FlowID:         flow.ID,
			Status:         "running",
			StartedAt:      now,
			NodeExecutions: map[string]*model.NodeExecution{},
			Logs:           []model.ExecutionLog{},
		},
	}
}

func (e *Executor) ExecutionID() string {
	return e.execution.ID
}

// Run executes the DAG in topological order, respecting parallel branches
func (e *Executor) Run(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			e.sendEvent("execution_error", map[string]interface{}{
				"error": fmt.Sprintf("%v", r),
			})
			e.execution.Status = "failed"
		}
	}()

	e.log("", "Flow", "info", "Execution started", nil, nil)

	// Build adjacency structures
	nodeMap := map[string]*model.FlowNode{}
	for i := range e.flow.Nodes {
		nodeMap[e.flow.Nodes[i].ID] = &e.flow.Nodes[i]
	}

	// Build in-degree and adjacency list
	inDegree := map[string]int{}
	outEdges := map[string][]model.FlowEdge{}
	for _, n := range e.flow.Nodes {
		inDegree[n.ID] = 0
	}
	for _, edge := range e.flow.Edges {
		inDegree[edge.Target]++
		outEdges[edge.Source] = append(outEdges[edge.Source], edge)
	}

	// Track completion
	completed := map[string]bool{}
	completedMu := sync.Mutex{}

	// Channel to signal a node is done
	type nodeResult struct {
		nodeID  string
		success bool
		output  model.JSONMap
	}
	resultCh := make(chan nodeResult, len(e.flow.Nodes))

	// Ready queue: nodes with in-degree 0
	ready := []string{}
	for id, deg := range inDegree {
		if deg == 0 {
			ready = append(ready, id)
		}
	}

	remaining := len(e.flow.Nodes)

	for remaining > 0 {
		// Launch all ready nodes concurrently
		if len(ready) == 0 {
			// Deadlock or done — wait for a result
			select {
			case <-ctx.Done():
				e.finishExecution(false)
				return
			case res := <-resultCh:
				completedMu.Lock()
				completed[res.nodeID] = true
				completedMu.Unlock()
				remaining--
				// Unlock downstream nodes
				for _, edge := range outEdges[res.nodeID] {
					inDegree[edge.Target]--
					if inDegree[edge.Target] == 0 {
						ready = append(ready, edge.Target)
					}
				}
			}
			continue
		}

		// Drain the ready queue — launch goroutines for all
		launching := ready
		ready = nil
		var wg sync.WaitGroup
		for _, nodeID := range launching {
			wg.Add(1)
			go func(nid string) {
				defer wg.Done()
				node := nodeMap[nid]
				output, success := e.runNode(ctx, node)
				resultCh <- nodeResult{nodeID: nid, success: success, output: output}
			}(nodeID)
		}

		// Collect results as they come in
		for range launching {
			select {
			case <-ctx.Done():
				e.finishExecution(false)
				return
			case res := <-resultCh:
				completedMu.Lock()
				completed[res.nodeID] = true
				completedMu.Unlock()
				remaining--
				for _, edge := range outEdges[res.nodeID] {
					inDegree[edge.Target]--
					if inDegree[edge.Target] == 0 {
						ready = append(ready, edge.Target)
					}
				}
			}
		}
	}

	e.finishExecution(true)
}

func (e *Executor) runNode(ctx context.Context, node *model.FlowNode) (model.JSONMap, bool) {
	if node == nil {
		return nil, false
	}

	// Special node types don't need execution
	switch node.Type {
	case "start", "end", "parallel_fork", "parallel_join":
		e.setNodeStatus(node.ID, "success", nil, 0)
		return model.JSONMap{}, true
	case "condition":
		e.setNodeStatus(node.ID, "success", nil, 10)
		return model.JSONMap{"result": true}, true
	}

	// Skill node — simulate execution
	sk := e.skills[node.SkillID]
	skillName := node.Label
	if sk != nil {
		skillName = sk.Name
	}

	e.setNodeStatus(node.ID, "running", nil, 0)
	e.log(node.ID, skillName, "info", fmt.Sprintf("Starting skill execution: %s", skillName), nil, nil)

	// Simulate work with realistic random delay
	delay := time.Duration(300+rand.Intn(1200)) * time.Millisecond
	select {
	case <-ctx.Done():
		e.setNodeStatus(node.ID, "error", fmt.Errorf("cancelled"), 0)
		return nil, false
	case <-time.After(delay):
	}

	// 10% random failure rate for demo purposes
	if rand.Float64() < 0.10 {
		errMsg := fmt.Sprintf("Simulated failure in %s", skillName)
		e.setNodeStatus(node.ID, "error", fmt.Errorf(errMsg), delay.Milliseconds())
		e.log(node.ID, skillName, "error", errMsg, nil, nil)
		return nil, false
	}

	// Simulate output
	output := model.JSONMap{
		"status":     "success",
		"skill":      skillName,
		"duration_ms": delay.Milliseconds(),
		"timestamp":  time.Now().Format(time.RFC3339),
	}
	if sk != nil && sk.OutputSchema != nil {
		if props, ok := sk.OutputSchema["properties"].(map[string]interface{}); ok {
			for key, prop := range props {
				if propMap, ok := prop.(map[string]interface{}); ok {
					output[key] = mockValue(propMap["type"])
				}
			}
		}
	}

	durationMs := delay.Milliseconds()
	e.setNodeStatus(node.ID, "success", nil, durationMs)
	e.log(node.ID, skillName, "info",
		fmt.Sprintf("Skill completed in %dms", durationMs), nil, output)

	return output, true
}

func (e *Executor) setNodeStatus(nodeID, status string, err error, durationMs int64) {
	now := time.Now()
	e.mu.Lock()
	exec := &model.NodeExecution{
		NodeID:      nodeID,
		Status:      status,
		CompletedAt: &now,
	}
	if durationMs > 0 {
		exec.DurationMs = &durationMs
	}
	if err != nil {
		exec.Error = err.Error()
	}
	e.execution.NodeExecutions[nodeID] = exec
	e.mu.Unlock()

	payload := map[string]interface{}{
		"node_id":    nodeID,
		"status":     status,
		"duration_ms": durationMs,
	}
	if err != nil {
		payload["error"] = err.Error()
	}
	e.sendEvent("node_status", payload)
}

func (e *Executor) log(nodeID, nodeName, level, message string, input, output model.JSONMap) {
	entry := model.ExecutionLog{
		ID:          generateID(),
		ExecutionID: e.execution.ID,
		NodeID:      nodeID,
		NodeName:    nodeName,
		Level:       level,
		Message:     message,
		Timestamp:   time.Now(),
		Input:       input,
		Output:      output,
	}

	e.mu.Lock()
	e.execution.Logs = append(e.execution.Logs, entry)
	e.mu.Unlock()

	e.sendEvent("execution_log", map[string]interface{}{
		"node_id":    nodeID,
		"node_name":  nodeName,
		"level":      level,
		"message":    message,
		"timestamp":  entry.Timestamp.Format(time.RFC3339Nano),
	})

	log.Printf("[EXEC %s] [%s] %s: %s", e.execution.ID[:8], level, nodeName, message)
}

func (e *Executor) finishExecution(success bool) {
	now := time.Now()
	status := "completed"
	if !success {
		status = "failed"
	}
	e.execution.Status = status
	e.execution.CompletedAt = &now

	eventType := "execution_complete"
	if !success {
		eventType = "execution_error"
	}
	e.sendEvent(eventType, map[string]interface{}{
		"status":       status,
		"completed_at": now.Format(time.RFC3339),
	})
	e.log("", "Flow", "info", fmt.Sprintf("Execution %s", status), nil, nil)
}

func (e *Executor) sendEvent(eventType string, payload map[string]interface{}) {
	select {
	case e.eventCh <- WSEvent{
		Type:        eventType,
		ExecutionID: e.execution.ID,
		Payload:     payload,
	}:
	default:
		// Drop if channel is full
	}
}

func mockValue(typeVal interface{}) interface{} {
	switch typeVal {
	case "string":
		return "mock_value"
	case "number", "integer":
		return 42
	case "boolean":
		return true
	case "array":
		return []interface{}{"item1", "item2"}
	case "object":
		return map[string]interface{}{"key": "value"}
	default:
		return nil
	}
}

func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 9)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}
