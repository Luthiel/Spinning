import axios from 'axios'
import type {
  Skill,
  Flow,
  FlowTemplate,
  ConflictReport,
  SkillCluster,
  SkillRanking,
  PromptGenerateRequest,
  PromptGenerateResponse,
  FlowNodeRecord,
  FlowEdgeRecord,
  ExternalSkillSource,
  SyncResult,
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

export default api
