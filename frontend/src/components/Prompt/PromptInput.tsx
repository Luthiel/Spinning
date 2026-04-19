import { useState, useRef } from 'react'
import { Wand2, Loader2, Lightbulb, ChevronUp, AlertCircle, RefreshCw, Zap, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useFlowStore } from '@/store/flowStore'
import { useSkillStore } from '@/store/skillStore'
import { useProviderStore } from '@/store/providerStore'
import { flowsApi } from '@/services/api'
import { applyDagreLayout } from '@/utils/dagLayout'
import type { FlowNode, FlowEdge } from '@/store/flowStore'
import type { FlowNodeData, FlowEdgeData, ProviderType } from '@/types'
import { generateId } from '@/lib/utils'

const EXAMPLES = [
  'First translate the content to English, then run sentiment analysis and keyword extraction in parallel, finally merge the results',
  'Validate user input, if valid process with ML classifier, otherwise return error message',
  'Scrape webpage, extract text, summarize with AI, then send notification',
  'Load data from database, clean it, run statistical analysis, generate report',
]

interface FallbackOption {
  provider: ProviderType
  label: string
  icon: typeof Bot
  description: string
}

export function PromptInput() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { setNodes, setEdges, flowId } = useFlowStore()
  const { skills } = useSkillStore()
  const { selectedProvider, defaultFallback } = useProviderStore()

  const fallbackOptions: FallbackOption[] = [
    { provider: 'openai', label: 'OpenAI', icon: Bot, description: 'Use OpenAI API' },
    { provider: 'opencode', label: 'OpenCode', icon: Zap, description: 'Use OpenCode CLI' },
    { provider: 'mock', label: 'Mock', icon: Zap, description: 'Use built-in generator' },
  ].filter((opt): opt is FallbackOption => opt.provider !== selectedProvider)

  const handleGenerate = async (useFallback?: ProviderType) => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setShowFallback(false)
    
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
      const errorMessage = e.response?.data?.error || e.message || 'Unknown error'
      setError(errorMessage)
      setShowFallback(true)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setShowFallback(false)
    handleGenerate()
  }

  const handleUseFallback = (provider: ProviderType) => {
    setShowFallback(false)
    handleGenerate(provider)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
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
          <span className="text-xs text-slate-400">Describe your flow with natural language...</span>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-t border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700">AI Flow Generator</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          {EXAMPLES.slice(0, 2).map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center gap-0.5 max-w-[180px] truncate"
            >
              <Lightbulb className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{ex.slice(0, 40)}...</span>
            </button>
          ))}
        </div>

        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your skill orchestration flow in natural language..."
          className="text-xs min-h-[80px] resize-none"
        />

        {error && (
          <div className="space-y-2">
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
            
            {showFallback && fallbackOptions.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-2 space-y-2">
                  <p className="text-[10px] font-medium text-amber-700">
                    Generation failed. Choose a fallback option:
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={loading}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </Button>
                    {fallbackOptions.map((opt) => (
                      <Button
                        key={opt.provider}
                        size="sm"
                        onClick={() => handleUseFallback(opt.provider)}
                        disabled={loading}
                        className="h-7 text-xs gap-1"
                      >
                        <opt.icon className="h-3 w-3" />
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Ctrl+Enter to generate</span>
          <Button
            size="sm"
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || loading}
            className="gap-1.5 h-7 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  )
}
