import { useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { AlertCircle, Bot, ChevronUp, GitBranchPlus, Loader2, Plus, Search, Sparkles, Wand2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useFlowStore } from '@/store/flowStore'
import { useSkillStore } from '@/store/skillStore'
import { flowsApi, skillsApi } from '@/services/api'
import { applyDagreLayout } from '@/utils/dagLayout'
import type {
  ExternalSkillCandidate,
  FlowChangePlan,
  FlowEdgeData,
  FlowEdgeRecord,
  FlowNodeData,
  FlowNodeRecord,
  ProviderType,
  Skill,
} from '@/types'
import type { FlowNode, FlowEdge } from '@/store/flowStore'
import { generateId } from '@/lib/utils'

const EXAMPLES = [
  'Add a summarizer before the final notification',
  '/find keyword extractor skill',
]

interface FallbackOption {
  provider: ProviderType
  label: string
  icon: typeof Bot
  description: string
}

interface FindState {
  query: string
  local: Skill[]
  external: ExternalSkillCandidate[]
  message: string
}

function toNodeRecords(nodes: FlowNode[]): FlowNodeRecord[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.data.type,
    skill_id: n.data.skill_id,
    mcp_server: n.data.mcp_server,
    mcp_tool: n.data.mcp_tool,
    mcp_config: n.data.mcp_config,
    position_x: n.position.x,
    position_y: n.position.y,
    config: n.data.config,
    status: n.data.status,
    enabled: n.data.enabled !== false,
    call_count: n.data.call_count,
    condition_expr: n.data.condition_expr,
    label: n.data.label,
    description: n.data.description,
  }))
}

function toEdgeRecords(edges: FlowEdge[]): FlowEdgeRecord[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    source_handle: e.sourceHandle ?? undefined,
    target_handle: e.targetHandle ?? undefined,
    edge_type: e.data?.type || 'serial',
    condition: e.data?.condition,
    label: e.data?.label,
  }))
}

export function PromptInput() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<FlowChangePlan | null>(null)
  const [findState, setFindState] = useState<FindState | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reactFlow = useReactFlow()

  const {
    nodes,
    edges,
    flowId,
    setNodes,
    setEdges,
    applyFlowChanges,
    highlightNode,
    addSkillNode,
  } = useFlowStore()
  const { skills, setSkills } = useSkillStore()

  const fallbackOptions: FallbackOption[] = [
    { provider: 'openai', label: 'OpenAI', icon: Bot, description: 'Use OpenAI API' },
    { provider: 'opencode', label: 'OpenCode', icon: Zap, description: 'Use OpenCode CLI' },
    { provider: 'mock', label: 'Mock', icon: Zap, description: 'Use built-in generator' },
  ]

  const focusNode = (node: FlowNode) => {
    highlightNode(node.id)
    reactFlow.fitView({ nodes: [{ id: node.id }], padding: 0.45, duration: 500 })
  }

  const handleFind = async (raw: string) => {
    const query = raw.replace(/^\/find\s*/i, '').trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setPlan(null)
    setFindState(null)

    const q = query.toLowerCase()
    const existing = nodes.find((n) => {
      const haystack = `${n.data.label} ${n.data.skill?.name || ''} ${n.data.skill?.description || ''}`.toLowerCase()
      return n.data.type === 'skill' && haystack.includes(q)
    })
    if (existing) {
      focusNode(existing)
      setFindState({ query, local: [], external: [], message: `Found "${existing.data.label}" on the canvas.` })
      setLoading(false)
      return
    }

    const localSkill = skills.find((s) => `${s.name} ${s.description} ${s.capabilities.join(' ')}`.toLowerCase().includes(q))
    if (localSkill) {
      setFindState({ query, local: [localSkill], external: [], message: 'Found a local skill that is not on this workflow yet.' })
      setLoading(false)
      return
    }

    try {
      const result = await skillsApi.find(query)
      setFindState({
        query,
        local: result.local.filter((s) => !nodes.some((n) => n.data.skill_id === s.id)),
        external: result.external,
        message: result.local.length || result.external.length ? 'Found matching skills.' : 'No matching skills found.',
      })
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Find failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePlan = async () => {
    if (!prompt.trim()) return
    if (prompt.trim().startsWith('/find')) {
      await handleFind(prompt.trim())
      return
    }
    setLoading(true)
    setError(null)
    setPlan(null)
    setFindState(null)
    try {
      const next = await flowsApi.planChanges({
        prompt: prompt.trim(),
        flow_id: flowId || undefined,
        nodes: toNodeRecords(nodes),
        edges: toEdgeRecords(edges),
        context_skill_ids: skills.map((s) => s.id),
      })
      setPlan(next)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Planning failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReplaceFlow = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setPlan(null)
    setFindState(null)
    try {
      const result = await flowsApi.generate({
        prompt: prompt.trim(),
        flow_id: flowId || undefined,
        context_skill_ids: skills.map((s) => s.id),
      })

      const rfNodes: FlowNode[] = result.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          type: n.type,
          label: n.label || n.type,
          skill_id: n.skill_id,
          skill: n.skill_id ? skills.find((s) => s.id === n.skill_id) : undefined,
          status: 'idle' as const,
          enabled: n.enabled !== false,
          call_count: 0,
          config: n.config || {},
          condition_expr: n.condition_expr,
          description: n.description,
          mcp_server: n.mcp_server,
          mcp_tool: n.mcp_tool,
          mcp_config: n.mcp_config,
        } as FlowNodeData,
      }))

      const rfEdges: FlowEdge[] = result.edges.map((e) => ({
        id: e.id || `e-${generateId()}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
        type: 'customEdge',
        data: {
          type: e.edge_type || 'serial',
          condition: e.condition,
          label: e.label,
        } as FlowEdgeData,
      }))

      const laid = applyDagreLayout(rfNodes as any, rfEdges as any)
      setNodes(laid as FlowNode[])
      setEdges(rfEdges)
      setPrompt('')
      setOpen(false)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const applyPlan = () => {
    if (!plan) return
    applyFlowChanges(plan.changes, skills)
    setPlan(null)
    setPrompt('')
  }

  const addLocalSkill = (skill: Skill) => {
    addSkillNode(skill.id, skill.name, { x: 420 + Math.random() * 80, y: 320 + Math.random() * 80 }, skill)
    setFindState(null)
    setPrompt('')
  }

  const importExternal = async (candidate: ExternalSkillCandidate) => {
    setLoading(true)
    setError(null)
    try {
      const skill = await skillsApi.importExternal(candidate)
      setSkills([...skills.filter((s) => s.id !== skill.id), skill])
      addLocalSkill(skill)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handlePlan()
    }
  }

  if (!open) {
    return (
      <div className="rounded-xl border-t border-slate-200 bg-white p-2">
        <button
          onClick={() => { setOpen(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
          className="w-80 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
        >
          <Wand2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-400">Chat with this workflow...</span>
        </button>
      </div>
    )
  }

  return (
    <div className="w-[460px] rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700">Flow Chat</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center gap-0.5 max-w-[210px] truncate"
            >
              <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{ex}</span>
            </button>
          ))}
        </div>

        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add nodes, change connections, or use /find..."
          className="text-xs min-h-[80px] resize-none"
        />

        {error && (
          <p className="text-[10px] text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}

        {plan && (
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-2 space-y-2">
              <div className="flex items-start gap-2">
                <GitBranchPlus className="h-3.5 w-3.5 text-blue-600 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800">{plan.summary}</p>
                  <p className="text-[10px] text-slate-500">{plan.changes.length} changes · confidence {Math.round(plan.confidence * 100)}%</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-7" onClick={() => setPlan(null)}>Reject</Button>
                <Button size="sm" className="h-7" onClick={applyPlan} disabled={plan.changes.length === 0}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {findState && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-2 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Search className="h-3.5 w-3.5" /> {findState.message}
              </div>
              {findState.local.map((skill) => (
                <FindSkillRow key={skill.id} name={skill.name} description={skill.description} onClick={() => addLocalSkill(skill)} />
              ))}
              {findState.external.map((candidate) => (
                <FindSkillRow
                  key={candidate.id}
                  name={candidate.name}
                  description={candidate.description || candidate.path}
                  onClick={() => importExternal(candidate)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Ctrl+Enter to plan</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleReplaceFlow} disabled={!prompt.trim() || loading} className="gap-1.5 h-7 text-xs">
              Replace
            </Button>
            <Button size="sm" onClick={handlePlan} disabled={!prompt.trim() || loading} className="gap-1.5 h-7 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Plan
            </Button>
          </div>
        </div>

        {fallbackOptions.length > 0 && error && (
          <div className="flex gap-1">
            {fallbackOptions.map((opt) => (
              <span key={opt.provider} className="text-[9px] text-slate-400">{opt.label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FindSkillRow({ name, description, onClick }: { name: string; description: string; onClick: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white border border-slate-100 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-800 truncate">{name}</div>
        <div className="text-[10px] text-slate-400 truncate">{description}</div>
      </div>
      <Button size="sm" className="h-7" onClick={onClick}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  )
}
