import { useState } from 'react'
import { AlertTriangle, X, CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFlowStore } from '@/store/flowStore'
import { conflictsApi } from '@/services/api'
import type { ConflictReport, ConflictResolution } from '@/types'
import { cn } from '@/lib/utils'
import type { FlowNodeRecord, FlowEdgeRecord } from '@/types'
import type { FlowNode, FlowEdge } from '@/store/flowStore'

const SEVERITY_COLORS = {
  high: { badge: 'destructive' as const, bg: 'bg-red-50 border-red-200', icon: 'text-red-500' },
  medium: { badge: 'warning' as const, bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500' },
  low: { badge: 'secondary' as const, bg: 'bg-slate-50 border-slate-200', icon: 'text-slate-400' },
}

const STRATEGY_ICONS: Record<string, string> = {
  priority: '⚡',
  merge: '🔀',
  replace: '🔄',
  parallel_isolate: '🔒',
  conditional_route: '🔀',
  namespace_isolate: '📦',
}

function ResolutionCard({
  resolution,
  selected,
  onSelect,
  applying,
}: {
  resolution: ConflictResolution
  selected: boolean
  onSelect: () => void
  applying: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={applying}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        selected
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">{STRATEGY_ICONS[resolution.strategy] || '🔧'}</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-slate-800">{resolution.title}</span>
            {resolution.auto_applicable && (
              <Badge variant="success" className="text-[9px] px-1 py-0">auto</Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">{resolution.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1">
              <div className="text-[10px] text-slate-400">Confidence:</div>
              <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    resolution.confidence >= 0.8 ? 'bg-emerald-500' :
                    resolution.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-400'
                  )}
                  style={{ width: `${resolution.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                {Math.round(resolution.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />}
      </div>
    </button>
  )
}

function ConflictItem({ conflict }: { conflict: ConflictReport }) {
  const [expanded, setExpanded] = useState(true)
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [resolved, setResolved] = useState(false)
  const { setNodes, setEdges, nodes, edges } = useFlowStore()
  const colors = SEVERITY_COLORS[conflict.severity] || SEVERITY_COLORS.low

  const handleApply = async () => {
    if (!selectedResolution) return
    setApplying(true)
    try {
      const result = await conflictsApi.applyResolution(conflict.id, selectedResolution)
      // Convert to ReactFlow nodes/edges
      const rfNodes = result.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          type: n.type,
          label: n.label || n.type,
          skill_id: n.skill_id,
          status: n.status,
          enabled: n.enabled !== false,
          call_count: n.call_count,
          config: n.config,
        },
      }))
      const rfEdges = result.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'customEdge',
        data: { type: e.edge_type, condition: e.condition, label: e.label },
      }))
      setNodes(rfNodes as FlowNode[])
      setEdges(rfEdges as FlowEdge[])
      setResolved(true)
    } catch (e) {
      console.error('Apply resolution failed', e)
    } finally {
      setApplying(false)
    }
  }

  if (resolved) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-emerald-700 font-medium">
          Resolved: {conflict.skill_a_name} ↔ {conflict.skill_b_name}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', colors.bg)}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 p-3"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle className={cn('h-4 w-4 flex-shrink-0', colors.icon)} />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-slate-800">
              {conflict.skill_a_name} ↔ {conflict.skill_b_name}
            </span>
            <Badge variant={colors.badge} className="text-[9px] px-1 py-0 capitalize">
              {conflict.severity}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 capitalize">
            {conflict.conflict_type.replace(/_/g, ' ')}
          </p>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {/* Expanded resolutions */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[10px] text-slate-600 leading-relaxed">{conflict.description}</p>

          <div className="text-xs font-semibold text-slate-700 mt-2 mb-1">
            Choose a resolution:
          </div>

          <div className="space-y-1.5">
            {conflict.resolutions.map((res) => (
              <ResolutionCard
                key={res.id}
                resolution={res}
                selected={selectedResolution === res.id}
                onSelect={() => setSelectedResolution(res.id)}
                applying={applying}
              />
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={!selectedResolution || applying}
            className="w-full mt-2 h-7 text-xs"
          >
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {applying ? 'Applying...' : 'Apply Resolution'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function ConflictPanel() {
  const { conflicts, setConflictPanelOpen, conflictPanelOpen, nodes, edges, flowId } = useFlowStore()
  const [detecting, setDetecting] = useState(false)

  if (!conflictPanelOpen) return null

  const handleDetect = async () => {
    if (!flowId) return
    setDetecting(true)
    try {
      const nodeRecords: FlowNodeRecord[] = nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        skill_id: n.data.skill_id,
        position_x: n.position.x,
        position_y: n.position.y,
        config: n.data.config,
        status: n.data.status,
        enabled: n.data.enabled !== false,
        call_count: n.data.call_count,
        label: n.data.label,
      }))
      const edgeRecords: FlowEdgeRecord[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        edge_type: e.data?.type || 'serial',
        condition: e.data?.condition,
        label: e.data?.label,
      }))

      const detected = await conflictsApi.detect(flowId, nodeRecords, edgeRecords)
      useFlowStore.getState().setConflicts(detected)
    } catch (e) {
      console.error('Conflict detection failed', e)
    } finally {
      setDetecting(false)
    }
  }

  const highCount = conflicts.filter((c) => c.severity === 'high').length
  const mediumCount = conflicts.filter((c) => c.severity === 'medium').length

  return (
    <div className="absolute right-3 top-3 bottom-3 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-900">Conflicts</span>
          {highCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">{highCount} high</Badge>
          )}
          {mediumCount > 0 && (
            <Badge variant="warning" className="text-[10px]">{mediumCount} medium</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setConflictPanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Re-detect button */}
      <div className="px-4 py-2 border-b border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDetect}
          disabled={detecting || !flowId}
          className="w-full h-7 text-xs gap-1.5"
        >
          {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          {detecting ? 'Detecting...' : 'Re-detect Conflicts'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {conflicts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No conflicts detected</p>
            </div>
          ) : (
            conflicts.map((conflict) => (
              <ConflictItem key={conflict.id} conflict={conflict} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
