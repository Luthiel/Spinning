import { useEffect, useState } from 'react'
import { X, Loader2, LayoutTemplate, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFlowStore } from '@/store/flowStore'
import { useSkillStore } from '@/store/skillStore'
import { templatesApi } from '@/services/api'
import type { FlowTemplate } from '@/types'
import type { FlowNode, FlowEdge } from '@/store/flowStore'
import type { FlowNodeData, FlowEdgeData } from '@/types'
import { cn } from '@/lib/utils'
import { applyDagreLayout } from '@/utils/dagLayout'

const TEMPLATE_COLORS: Record<string, string> = {
  'data-pipeline': 'from-blue-500 to-cyan-600',
  'approval-flow': 'from-amber-500 to-orange-600',
  'ai-pipeline': 'from-violet-500 to-purple-600',
  'notification': 'from-emerald-500 to-teal-600',
  default: 'from-slate-600 to-slate-700',
}

export function TemplateSelector() {
  const { templateSelectorOpen, setTemplateSelectorOpen, setNodes, setEdges, setFlowName } = useFlowStore()
  const { skills } = useSkillStore()
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (templateSelectorOpen) loadTemplates()
  }, [templateSelectorOpen])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await templatesApi.list()
      setTemplates(data)
    } catch (e) {
      console.error('Failed to load templates', e)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!selected) return
    const template = templates.find((t) => t.id === selected)
    if (!template) return

    setApplying(true)
    try {
      const skillsMap = Object.fromEntries(skills.map((s) => [s.id, s]))

      const rfNodes: FlowNode[] = template.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          type: n.type,
          label: n.label || (n.skill_id ? skillsMap[n.skill_id]?.name : n.type) || n.type,
          skill_id: n.skill_id,
          skill: n.skill_id ? skillsMap[n.skill_id] : undefined,
          status: 'idle' as const,
          enabled: n.enabled !== false,
          call_count: 0,
          config: n.config || {},
          description: n.description,
        } as FlowNodeData,
      }))

      const rfEdges: FlowEdge[] = template.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'customEdge',
        data: {
          type: e.edge_type || 'serial',
          condition: e.condition,
          label: e.label,
        } as FlowEdgeData,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const laid = applyDagreLayout(rfNodes as any, rfEdges as any)
      setNodes(laid as FlowNode[])
      setEdges(rfEdges)
      setFlowName(template.name)
      setTemplateSelectorOpen(false)
      setSelected(null)
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={templateSelectorOpen} onOpenChange={setTemplateSelectorOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-slate-600" />
            Flow Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to scaffold your skill orchestration flow
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              No templates available
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              {templates.map((template) => {
                const isSelected = selected === template.id
                const gradient = TEMPLATE_COLORS[template.id] || TEMPLATE_COLORS.default

                return (
                  <button
                    key={template.id}
                    onClick={() => setSelected(isSelected ? null : template.id)}
                    className={cn(
                      'text-left rounded-xl border-2 overflow-hidden transition-all',
                      isSelected
                        ? 'border-blue-400 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    )}
                  >
                    {/* Color band */}
                    <div className={cn('h-1.5 bg-gradient-to-r', gradient)} />

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{template.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {template.description}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {template.is_builtin && (
                          <Badge variant="secondary" className="text-[9px] px-1.5">built-in</Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1.5">
                          {template.nodes.length} nodes
                        </Badge>
                        {template.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => setTemplateSelectorOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selected || applying}
            className="gap-1.5"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
            {applying ? 'Applying...' : 'Use Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
