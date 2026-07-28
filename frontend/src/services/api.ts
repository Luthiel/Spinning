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
  RouterConfig,
  RouterSimulationRequest,
  RouterSimulationResult,
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

// ── Smart Router ────────────────────────────────────────────
export const routerApi = {
  getConfig: () => api.get<RouterConfig>('/router/config').then((r) => r.data),

  updateConfig: (config: RouterConfig) =>
    api.put<RouterConfig>('/router/config', config).then((r) => r.data),

  simulate: (req: RouterSimulationRequest) =>
    api.post<RouterSimulationResult>('/router/simulate', req).then((r) => r.data),
}

export default api
