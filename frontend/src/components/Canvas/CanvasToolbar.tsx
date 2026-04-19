import { useState } from 'react'
import {
  Settings, Save, Play, Download, Upload, LayoutTemplate, Wand2,
  GitBranch, GitFork, GitMerge, Plus, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFlowStore } from '@/store/flowStore'
import { useExecutionStore } from '@/store/executionStore'
import { flowsApi } from '@/services/api'
import { applyDagreLayout } from '@/utils/dagLayout'
import type { FlowNodeRecord, FlowEdgeRecord } from '@/types'
import type { FlowNode, FlowEdge } from '@/store/flowStore'

export interface CanvasToolbarProps {
  onSettingsClick?: () => void
}

export function CanvasToolbar({ onSettingsClick }: CanvasToolbarProps) {
  const {
    flowId, flowName, nodes, edges, isDirty,
    setNodes, setEdges, setFlowId, setIsDirty,
    setConflictPanelOpen, setTemplateSelectorOpen,
    conflicts, addConditionNode, addParallelForkNode, addParallelJoinNode,
  } = useFlowStore()
  const { setPanelOpen, setIsExecuting } = useExecutionStore()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const nodeRecords: FlowNodeRecord[] = nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        skill_id: n.data.skill_id,
        position_x: n.position.x,
        position_y: n.position.y,
        config: n.data.config,
        status: n.data.status,
        call_count: n.data.call_count,
        condition_expr: n.data.condition_expr,
        label: n.data.label,
        description: n.data.description,
      }))
      const edgeRecords: FlowEdgeRecord[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        source_handle: e.sourceHandle ?? undefined,
        target_handle: e.targetHandle ?? undefined,
        edge_type: e.data?.type || 'serial',
        condition: e.data?.condition,
        label: e.data?.label,
      }))

      if (flowId) {
        await flowsApi.update(flowId, { name: flowName, nodes: nodeRecords, edges: edgeRecords })
      } else {
        const created = await flowsApi.create({ name: flowName })
        setFlowId(created.id)
        await flowsApi.update(created.id, { nodes: nodeRecords, edges: edgeRecords })
      }
      setIsDirty(false)
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  const handleAutoLayout = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laid = applyDagreLayout(nodes as any, edges as any)
    setNodes(laid as FlowNode[])
  }

  const handleExecute = async () => {
    if (!flowId) {
      await handleSave()
    }
    if (!flowId) return
    try {
      setIsExecuting(true)
      setPanelOpen(true)
      const { execution_id } = await flowsApi.execute(flowId)
      // WebSocket connection handled by ExecutionPanel
      console.log('Execution started:', execution_id)
    } catch (e) {
      setIsExecuting(false)
      console.error('Execute failed', e)
    }
  }

  const handleExport = async () => {
    if (!flowId) return
    const result = await flowsApi.export(flowId, 'json')
    const blob = new Blob([result.content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const addCenterNode = (adder: (pos: { x: number; y: number }) => void) => {
    // Add near center of visible canvas
    adder({ x: 400 + Math.random() * 100, y: 300 + Math.random() * 100 })
  }

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-sm px-2 py-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={onSettingsClick}>
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>

      <FlowNameEditor />

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Node type insertions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => addCenterNode(addConditionNode)}
            className="text-amber-600 hover:bg-amber-50"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Condition Node</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => addCenterNode(addParallelForkNode)}
            className="text-blue-600 hover:bg-blue-50"
          >
            <GitFork className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Parallel Fork</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => addCenterNode(addParallelJoinNode)}
            className="text-blue-600 hover:bg-blue-50"
          >
            <GitMerge className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Parallel Join</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Auto layout */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={handleAutoLayout}>
            <LayoutTemplate className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Auto Layout (Dagre)</TooltipContent>
      </Tooltip>

      {/* Templates */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTemplateSelectorOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Load Template</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConflictPanelOpen(true)}
              className="text-amber-600 hover:bg-amber-50 relative"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {conflicts.length}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Conflicts ({conflicts.length})</TooltipContent>
        </Tooltip>
      )}

      {/* Save */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isDirty ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={handleSave}
            disabled={saving}
            className={isDirty ? '' : 'text-slate-400'}
          >
            <Save className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isDirty ? 'Save (unsaved changes)' : 'Save'}</TooltipContent>
      </Tooltip>

      {/* Export */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={handleExport} disabled={!flowId}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export JSON</TooltipContent>
      </Tooltip>

      {/* Import (placeholder) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <Upload className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import Flow</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Execute */}
      <Button variant="success" size="sm" onClick={handleExecute} className="gap-1.5">
        <Play className="h-3.5 w-3.5" />
        Run
      </Button>
    </div>
  )
}

function FlowNameEditor() {
  const { flowName, setFlowName } = useFlowStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(flowName)

  const commit = () => {
    if (draft.trim()) setFlowName(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="text-sm font-semibold text-slate-800 bg-transparent border-b border-slate-300 outline-none w-40 px-0.5"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(flowName); setEditing(true) }}
      className="text-sm font-semibold text-slate-800 hover:text-slate-600 px-1 truncate max-w-[160px]"
    >
      <Wand2 className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
      {flowName}
    </button>
  )
}
