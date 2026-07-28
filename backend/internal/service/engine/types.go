package engine

// NodeResult carries the outcome of a single skill node execution
// for health metric updates.
type NodeResult struct {
	SkillID    string
	SkillName  string
	Success    bool
	LatencyMs  int64
	TokensUsed int64
	DurationMs int64 // wall-clock duration of the node execution
}
