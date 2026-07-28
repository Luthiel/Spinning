import axios from 'axios'
import type {
  Skill,
  Flow,
  FlowTemplate,
  ConflictReport,
  SkillCluster,
  SkillRanking,
  SkillFilesResponse,
  SkillFileContent,
  SkillFileVersion,
  SkillFileEditProposal,
  PromptGenerateRequest,
  PromptGenerateResponse,
  FlowChangePlan,
  FlowNodeRecord,
  FlowEdgeRecord,
  ExternalSkillSource,
  SkillFindResponse,
  ExternalSkillCandidate,
  SyncResult,
  SkillHealth,
  HealthOverview,
  GradeDistribution,
  HealthHistoryPoint,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Skills ──────────────────────────────────────────────────
export const skillsApi = {
  list: (params?: { search?: string; category?: string; sort?: string }) =>
    api.get<Skill[]>('/skills', { params }).then((r) => r.data),

  get: (id: string) => api.get<Skill>(`/skills/${id}`).then((r) => r.data),

  create: (skill: Omit<Skill, 'id' | 'call_count'>) =>
    api.post<Skill>('/skills', skill).then((r) => r.data),

  update: (id: string, skill: Partial<Skill>) =>
    api.put<Skill>(`/skills/${id}`, skill).then((r) => r.data),

  delete: (id: string) => api.delete(`/skills/${id}`),

  clusters: () => api.get<SkillCluster[]>('/skills/clusters').then((r) => r.data),

  rankings: () => api.get<SkillRanking[]>('/skills/rankings').then((r) => r.data),

  sync: (): Promise<SyncResult> =>
    api.post<SyncResult>('/skills/sync').then((r) => r.data),

  listSources: (): Promise<ExternalSkillSource[]> =>
    api.get<ExternalSkillSource[]>('/skills/sources').then((r) => r.data),

  find: (q: string): Promise<SkillFindResponse> =>
    api.get<SkillFindResponse>('/skills/find', { params: { q } }).then((r) => r.data),

  importExternal: (candidate: Pick<ExternalSkillCandidate, 'source_type' | 'path'>): Promise<Skill> =>
    api.post<Skill>('/skills/import', candidate).then((r) => r.data),

  listFiles: (id: string): Promise<SkillFilesResponse> =>
    api.get<SkillFilesResponse>(`/skills/${id}/files`).then((r) => r.data),

  readFile: (id: string, path: string): Promise<SkillFileContent> =>
    api.get<SkillFileContent>(`/skills/${id}/files/content`, { params: { path } }).then((r) => r.data),

  saveFile: (id: string, payload: { path: string; content: string; base_hash?: string; message?: string }) =>
    api.put<{ file: SkillFileContent; version: SkillFileVersion }>(`/skills/${id}/files/content`, payload).then((r) => r.data),

  proposeFileEdit: (
    id: string,
    payload: { path: string; prompt: string; current_content: string; chat_history?: Record<string, unknown>[] }
  ): Promise<SkillFileEditProposal> =>
    api.post<SkillFileEditProposal>(`/skills/${id}/files/propose`, payload).then((r) => r.data),

  listFileVersions: (id: string, path: string): Promise<SkillFileVersion[]> =>
    api.get<SkillFileVersion[]>(`/skills/${id}/files/versions`, { params: { path } }).then((r) => r.data),

  getFileVersion: (id: string, versionId: string): Promise<SkillFileVersion> =>
    api.get<SkillFileVersion>(`/skills/${id}/files/versions/${versionId}`).then((r) => r.data),

  restoreFileVersion: (id: string, versionId: string) =>
    api.post<{ file: SkillFileContent; version: SkillFileVersion }>(`/skills/${id}/files/versions/${versionId}/restore`).then((r) => r.data),

  deleteFileVersion: (id: string, versionId: string) =>
    api.delete(`/skills/${id}/files/versions/${versionId}`),
}

// ── Flows ────────────────────────────────────────────────────
export const flowsApi = {
  list: () => api.get<Flow[]>('/flows').then((r) => r.data),

  get: (id: string) => api.get<Flow>(`/flows/${id}`).then((r) => r.data),

  create: (flow: { name: string; description?: string }) =>
    api.post<Flow>('/flows', flow).then((r) => r.data),

  update: (
    id: string,
    payload: {
      name?: string
      description?: string
      nodes?: FlowNodeRecord[]
      edges?: FlowEdgeRecord[]
    }
  ) => api.put<Flow>(`/flows/${id}`, payload).then((r) => r.data),

  delete: (id: string) => api.delete(`/flows/${id}`),

  export: (id: string, format: 'json' | 'yaml') =>
    api.post<{ content: string; filename: string }>(`/flows/${id}/export`, { format }).then((r) => r.data),

  generate: (req: PromptGenerateRequest) =>
    api.post<PromptGenerateResponse>('/flows/generate', req).then((r) => r.data),

  planChanges: (req: {
    prompt: string
    flow_id?: string
    nodes: FlowNodeRecord[]
    edges: FlowEdgeRecord[]
    context_skill_ids?: string[]
  }) => api.post<FlowChangePlan>('/flows/plan-changes', req).then((r) => r.data),

  execute: (id: string, input?: Record<string, unknown>) =>
    api.post<{ execution_id: string }>(`/flows/${id}/execute`, { input }).then((r) => r.data),

  getExecution: (flowId: string, execId: string) =>
    api.get(`/flows/${flowId}/execution/${execId}`).then((r) => r.data),
}

// ── Conflicts ────────────────────────────────────────────────
export const conflictsApi = {
  detect: (flowId: string, nodes: FlowNodeRecord[], edges: FlowEdgeRecord[]) =>
    api
      .post<ConflictReport[]>('/conflicts/detect', { flow_id: flowId, nodes, edges })
      .then((r) => r.data),

  applyResolution: (conflictId: string, resolutionId: string) =>
    api
      .post<{ nodes: FlowNodeRecord[]; edges: FlowEdgeRecord[] }>(
        `/conflicts/${conflictId}/resolve`,
        { resolution_id: resolutionId }
      )
      .then((r) => r.data),
}

// ── Templates ────────────────────────────────────────────────
export const templatesApi = {
  list: () => api.get<FlowTemplate[]>('/templates').then((r) => r.data),

  get: (id: string) => api.get<FlowTemplate>(`/templates/${id}`).then((r) => r.data),

  create: (template: Omit<FlowTemplate, 'id' | 'is_builtin'>) =>
    api.post<FlowTemplate>('/templates', template).then((r) => r.data),

  delete: (id: string) => api.delete(`/templates/${id}`),
}

// ── Health ──────────────────────────────────────────────────
export const healthApi = {
  overview: (): Promise<HealthOverview> =>
    api.get<HealthOverview>('/health/overview').then((r) => r.data).catch(() => mockHealthOverview()),

  distribution: (): Promise<GradeDistribution[]> =>
    api.get<GradeDistribution[]>('/health/distribution').then((r) => r.data).catch(() => mockGradeDistribution()),

  list: (params?: { sort?: string; grade?: string }): Promise<SkillHealth[]> =>
    api.get<SkillHealth[]>('/health/skills', { params }).then((r) => r.data).catch(() => mockSkillHealthList(params)),

  get: (skillId: string): Promise<SkillHealth> =>
    api.get<SkillHealth>(`/health/skills/${skillId}`).then((r) => r.data).catch(() => mockSkillHealth(skillId)),

  history: (skillId: string): Promise<HealthHistoryPoint[]> =>
    api.get<HealthHistoryPoint[]>(`/health/skills/${skillId}/history`).then((r) => r.data).catch(() => mockHealthHistory(skillId)),
}

// ── Mock data (fallback until backend #2 is ready) ──────────
const MOCK_SKILLS: SkillHealth[] = [
  {
    skill_id: 'skill-1',
    skill_name: 'Sentiment Analysis',
    score: 92,
    grade: 'A',
    dimensions: [
      { name: '描述清晰度', score: 90, weight: 0.2 },
      { name: 'IO 契约', score: 95, weight: 0.2 },
      { name: '独特性', score: 88, weight: 0.2 },
      { name: '使用活跃度', score: 96, weight: 0.2 },
      { name: '可靠性', score: 91, weight: 0.2 },
    ],
    issues: [],
    call_count: 1240,
    last_used_at: '2026-07-26T10:00:00Z',
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 'skill-2',
    skill_name: 'Image Classification',
    score: 78,
    grade: 'B',
    dimensions: [
      { name: '描述清晰度', score: 70, weight: 0.2 },
      { name: 'IO 契约', score: 82, weight: 0.2 },
      { name: '独特性', score: 85, weight: 0.2 },
      { name: '使用活跃度', score: 75, weight: 0.2 },
      { name: '可靠性', score: 78, weight: 0.2 },
    ],
    issues: [
      { id: 'i1', type: 'description', severity: 'warning', message: '描述缺少输出字段说明', suggestion: '补充 output_schema 中各字段的含义' },
    ],
    call_count: 580,
    last_used_at: '2026-07-25T14:00:00Z',
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 'skill-3',
    skill_name: 'Text Summarizer',
    score: 65,
    grade: 'C',
    dimensions: [
      { name: '描述清晰度', score: 60, weight: 0.2 },
      { name: 'IO 契约', score: 70, weight: 0.2 },
      { name: '独特性', score: 55, weight: 0.2 },
      { name: '使用活跃度', score: 72, weight: 0.2 },
      { name: '可靠性', score: 68, weight: 0.2 },
    ],
    issues: [
      { id: 'i2', type: 'uniqueness', severity: 'warning', message: '与 Sentiment Analysis 能力重叠', suggestion: '考虑合并或差异化能力描述' },
      { id: 'i3', type: 'description', severity: 'info', message: '版本号未遵循 semver', suggestion: '更新版本号为 x.y.z 格式' },
    ],
    call_count: 320,
    last_used_at: '2026-07-20T09:00:00Z',
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 'skill-4',
    skill_name: 'Data Cleaner',
    score: 45,
    grade: 'D',
    dimensions: [
      { name: '描述清晰度', score: 40, weight: 0.2 },
      { name: 'IO 契约', score: 50, weight: 0.2 },
      { name: '独特性', score: 45, weight: 0.2 },
      { name: '使用活跃度', score: 42, weight: 0.2 },
      { name: '可靠性', score: 48, weight: 0.2 },
    ],
    issues: [
      { id: 'i4', type: 'description', severity: 'critical', message: '缺少 input_schema 定义', suggestion: '补充完整的输入参数定义' },
      { id: 'i5', type: 'reliability', severity: 'critical', message: '最近 30 天内 3 次执行失败', suggestion: '检查依赖服务状态' },
    ],
    call_count: 85,
    last_used_at: '2026-06-15T08:00:00Z',
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 'skill-5',
    skill_name: 'Legacy Parser',
    score: 22,
    grade: 'F',
    dimensions: [
      { name: '描述清晰度', score: 20, weight: 0.2 },
      { name: 'IO 契约', score: 25, weight: 0.2 },
      { name: '独特性', score: 30, weight: 0.2 },
      { name: '使用活跃度', score: 15, weight: 0.2 },
      { name: '可靠性', score: 20, weight: 0.2 },
    ],
    issues: [
      { id: 'i6', type: 'description', severity: 'critical', message: '无描述文档', suggestion: '编写完整的 skill 描述' },
      { id: 'i7', type: 'activity', severity: 'critical', message: '超过 90 天未使用', suggestion: '评估是否废弃或推广' },
      { id: 'i8', type: 'io', severity: 'warning', message: 'output_schema 为空', suggestion: '定义输出结构' },
    ],
    call_count: 12,
    last_used_at: '2026-04-01T10:00:00Z',
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 'skill-6',
    skill_name: 'New Experimental',
    score: 0,
    grade: 'untested',
    dimensions: [
      { name: '描述清晰度', score: 0, weight: 0.2 },
      { name: 'IO 契约', score: 0, weight: 0.2 },
      { name: '独特性', score: 0, weight: 0.2 },
      { name: '使用活跃度', score: 0, weight: 0.2 },
      { name: '可靠性', score: 0, weight: 0.2 },
    ],
    issues: [
      { id: 'i9', type: 'untested', severity: 'info', message: '尚未进行健康检查', suggestion: '运行健康检查以获取评分' },
    ],
    call_count: 0,
    checked_at: '2026-07-27T08:00:00Z',
  },
]

function mockHealthOverview(): HealthOverview {
  return {
    total_skills: MOCK_SKILLS.length,
    avg_health_score: Math.round(MOCK_SKILLS.filter((s) => s.score > 0).reduce((a, s) => a + s.score, 0) / MOCK_SKILLS.filter((s) => s.score > 0).length),
    redundant_pairs: 1,
    critical_issues: 4,
    long_unused_count: 2,
  }
}

function mockGradeDistribution(): GradeDistribution[] {
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0, untested: 0 }
  MOCK_SKILLS.forEach((s) => { counts[s.grade]++ })
  const total = MOCK_SKILLS.length
  return (['A', 'B', 'C', 'D', 'F', 'untested'] as const).map((grade) => ({
    grade,
    count: counts[grade],
    percentage: total > 0 ? Math.round((counts[grade] / total) * 100) : 0,
  }))
}

function mockSkillHealthList(params?: { sort?: string; grade?: string }): SkillHealth[] {
  let list = [...MOCK_SKILLS]
  if (params?.grade) {
    list = list.filter((s) => s.grade === params.grade)
  }
  if (params?.sort === 'score_asc') {
    list.sort((a, b) => a.score - b.score)
  } else {
    list.sort((a, b) => b.score - a.score)
  }
  return list
}

function mockSkillHealth(skillId: string): SkillHealth {
  return MOCK_SKILLS.find((s) => s.skill_id === skillId) || MOCK_SKILLS[0]
}

function mockHealthHistory(skillId: string): HealthHistoryPoint[] {
  const base = MOCK_SKILLS.find((s) => s.skill_id === skillId)?.score ?? 70
  return Array.from({ length: 7 }, (_, i) => ({
    checked_at: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
    score: Math.max(0, Math.min(100, base + Math.round((Math.random() - 0.5) * 20))),
  }))
}

export default api
