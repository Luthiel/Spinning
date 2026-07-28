// ============================================================
// Skill Types (MCP-compatible)
// ============================================================

export type SkillStatus = 'active' | 'deprecated' | 'draft'
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped' | 'disabled' | 'blocked'

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  description?: string
  [key: string]: unknown
}

export interface JSONSchemaProperty {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
  [key: string]: unknown
}

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  author: string
  owner_team: string
  category: string[]
  input_schema: JSONSchema
  output_schema: JSONSchema
  capabilities: string[]
  conflict_tags: string[]
  call_count: number
  status: SkillStatus
  template_id?: string
  icon?: string
  color?: string
  // Clustering metadata
  cluster_id?: number
  cluster_label?: string
  rank_score?: number
}

// ============================================================
// Flow / DAG Types
// ============================================================

export type FlowNodeType =
  | 'skill'
  | 'condition'
  | 'parallel_fork'
  | 'parallel_join'
  | 'start'
  | 'end'
  | 'mcp'

export type EdgeType = 'serial' | 'parallel' | 'conditional'

export interface FlowNodeData extends Record<string, unknown> {
  type: FlowNodeType
  label: string
  skill_id?: string
  skill?: Skill
  status: NodeStatus
  call_count: number
  enabled: boolean
  config: Record<string, unknown>
  // For condition nodes
  condition_expr?: string
  // For MCP nodes
  mcp_server?: string
  mcp_tool?: string
  mcp_config?: Record<string, unknown>
  // For display
  description?: string
  error_message?: string
  execution_time?: number
  highlighted?: boolean
}

export interface FlowEdgeData extends Record<string, unknown> {
  type: EdgeType
  condition?: string
  label?: string
}

export interface Flow {
  id: string
  name: string
  description?: string
  nodes: FlowNodeRecord[]
  edges: FlowEdgeRecord[]
  created_by: string
  created_at: string
  updated_at: string
  version: number
  tags?: string[]
  template_id?: string
}

// Raw storage format (for API)
export interface FlowNodeRecord {
  id: string
  type: FlowNodeType
  skill_id?: string
  mcp_server?: string
  mcp_tool?: string
  mcp_config?: Record<string, unknown>
  position_x: number
  position_y: number
  config: Record<string, unknown>
  status: NodeStatus
  enabled: boolean
  call_count: number
  condition_expr?: string
  label?: string
  description?: string
}

export interface FlowEdgeRecord {
  id: string
  source: string
  target: string
  source_handle?: string
  target_handle?: string
  edge_type: EdgeType
  condition?: string
  label?: string
}

// ============================================================
// Conflict Types
// ============================================================

export type ConflictType =
  | 'input_overlap'
  | 'output_conflict'
  | 'capability_duplicate'
  | 'resource_contention'

export type ConflictSeverity = 'high' | 'medium' | 'low'

export type ResolutionStrategy =
  | 'priority'
  | 'merge'
  | 'replace'
  | 'parallel_isolate'
  | 'conditional_route'
  | 'namespace_isolate'

export interface ConflictResolution {
  id: string
  strategy: ResolutionStrategy
  title: string
  description: string
  confidence: number
  auto_applicable: boolean
  // What changes to apply if user selects this resolution
  changes?: FlowChange[]
}

export interface FlowChange {
  type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'update_node' | 'update_edge'
  target_id: string
  payload?: Record<string, unknown>
}

export interface ConflictReport {
  id: string
  flow_id: string
  node_a_id: string
  node_b_id: string
  skill_a_id: string
  skill_b_id: string
  skill_a_name: string
  skill_b_name: string
  conflict_type: ConflictType
  severity: ConflictSeverity
  description: string
  resolutions: ConflictResolution[]
  created_at: string
}

// ============================================================
// Execution Types
// ============================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked'

export interface ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  node_name: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
  duration_ms?: number
  input?: Record<string, unknown>
  output?: Record<string, unknown>
}

export interface NodeExecution {
  node_id: string
  status: NodeStatus
  started_at?: string
  completed_at?: string
  duration_ms?: number
  output?: Record<string, unknown>
  error?: string
}

export interface FlowExecution {
  id: string
  flow_id: string
  status: ExecutionStatus
  started_at: string
  completed_at?: string
  node_executions: Record<string, NodeExecution>
  logs: ExecutionLog[]
  trigger_input?: Record<string, unknown>
}

// ============================================================
// Cluster / Ranking Types
// ============================================================

export interface SkillCluster {
  id: number
  label: string
  description: string
  skills: Skill[]
  color: string
  total_calls: number
  avg_rank_score: number
}

export interface SkillRanking {
  skill: Skill
  rank: number
  call_count: number
  capability_score: number
  rank_score: number
  trend: 'up' | 'down' | 'stable'
}

// ============================================================
// Template Types
// ============================================================

export interface FlowTemplate {
  id: string
  name: string
  description: string
  category: string
  preview_image?: string
  nodes: FlowNodeRecord[]
  edges: FlowEdgeRecord[]
  created_by: string
  is_builtin: boolean
  tags: string[]
}

// ============================================================
// Skill Files
// ============================================================

export interface SkillFileInfo {
  path: string
  name: string
  kind: 'skill' | 'reference' | 'script'
  language: string
  size: number
  hash: string
  updated_at: string
}

export interface SkillFilesResponse {
  skill_id: string
  skill_file?: SkillFileInfo
  references: SkillFileInfo[]
  scripts: SkillFileInfo[]
}

export interface SkillFileContent {
  path: string
  kind: 'skill' | 'reference' | 'script'
  language: string
  content: string
  hash: string
  updated_at: string
}

export interface SkillFileVersion {
  id: string
  skill_id: string
  path: string
  kind: string
  language: string
  content: string
  hash: string
  message?: string
  source: string
  restore_from_version_id?: string
  created_at: string
  deleted_at?: string
}

export interface SkillFileEditProposal {
  path: string
  language: string
  proposed_content: string
  explanation: string
  diff: string
  base_hash: string
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

// ============================================================
// Prompt → DAG Generation
// ============================================================

export interface PromptGenerateRequest {
  prompt: string
  flow_id?: string
  context_skill_ids?: string[]
}

export interface PromptGenerateResponse {
  nodes: FlowNodeRecord[]
  edges: FlowEdgeRecord[]
  explanation: string
  confidence: number
}

export interface FlowChangePlan {
  summary: string
  changes: FlowChange[]
  confidence: number
}

// ============================================================
// WebSocket Message Types
// ============================================================

export type WSMessageType =
  | 'node_status'
  | 'execution_log'
  | 'execution_complete'
  | 'execution_error'

export interface WSMessage {
  type: WSMessageType
  execution_id: string
  payload: Record<string, unknown>
}

// ============================================================
// Provider Types
// ============================================================

export type ProviderType = 'openai' | 'opencode' | 'mock'

export interface ProviderConfig {
  type: ProviderType
  name: string
  api_key?: string
  base_url?: string
  model?: string
  timeout?: number
  cli_path?: string
  default_fallback?: ProviderType
  auto_sync_skills?: boolean
  sync_interval_mins?: number
}

export interface SyncResult {
  imported: number
  updated: number
  skipped: number
  errors: number
}

export interface ExternalSkillSource {
  name: string
  type: string
  path: string
  skill_count: number
  auto_sync: boolean
}

export interface ExternalSkillCandidate {
  id: string
  name: string
  description: string
  source_type: string
  path: string
  imported: boolean
  skill_id?: string
}

export interface SkillFindResponse {
  local: Skill[]
  external: ExternalSkillCandidate[]
}

// ============================================================
// Health Types
// ============================================================

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface HealthDimension {
  name: string
  score: number
  weight: number
}

export interface HealthCheckEvent {
  id: string
  type: 'skill_update' | 'health_check_trigger' | 'manual_review' | 'auto_fix'
  description: string
  timestamp: string
}

export interface HealthSnapshot {
  id: string
  skill_id: string
  health_score: number
  grade: HealthGrade
  dimensions: HealthDimension[]
  events: HealthCheckEvent[]
  checked_at: string
  changes?: string
}

export interface HealthHistoryResponse {
  skill_id: string
  snapshots: HealthSnapshot[]
  summary: {
    avg_score: number
    best_score: number
    worst_score: number
    trend: 'up' | 'down' | 'stable'
    total_checks: number
  }
}

export type TimeRange = '7d' | '30d' | '90d' | 'all'

// ============================================================
// Validation Types
// ============================================================

export interface ValidationError {
  node_id: string
  type: string
  message: string
  severity: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
