import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react'
import { Settings } from 'lucide-react'
import '@xyflow/react/dist/style.css'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { useFlowStore } from '@/store/flowStore'
import { useSkillStore } from '@/store/skillStore'
import { SkillNode } from './nodes/SkillNode'
import { MCPNode } from './nodes/MCPNode'
import { ConditionNode } from './nodes/ConditionNode'
import { ParallelForkNode, ParallelJoinNode } from './nodes/GatewayNode'
import { StartNode, EndNode } from './nodes/StartEndNode'
import { CustomEdge } from './edges/CustomEdge'
import { NodeDetailPanel } from './NodeDetailPanel'
import { CanvasToolbar } from './CanvasToolbar'
import { PromptInput } from '@/components/Prompt/PromptInput'

export interface FlowCanvasProps {
  onSettingsClick?: () => void
}

const nodeTypes: NodeTypes = {
  skill: SkillNode,
  mcp: MCPNode,
  condition: ConditionNode,
  parallel_fork: ParallelForkNode,
  parallel_join: ParallelJoinNode,
  start: StartNode,
  end: EndNode,
}

const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge,
}

export function FlowCanvas({ onSettingsClick }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addSkillNode,
    setSelectedNodeId,
    setSelectedEdgeId,
    selectedNodeId,
  } = useFlowStore()
  const { skills } = useSkillStore()

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
    },
    [setSelectedNodeId, setSelectedEdgeId]
  )

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_evt, edge) => {
      setSelectedEdgeId(edge.id)
      setSelectedNodeId(null)
    },
    [setSelectedEdgeId, setSelectedNodeId]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [setSelectedNodeId, setSelectedEdgeId])

  // Handle drop from skill panel
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const skillId = event.dataTransfer.getData('application/spinning-skill-id')
      if (!skillId || !reactFlowWrapper.current) return

      const skill = skills.find((s) => s.id === skillId)
      if (!skill) return

      const rect = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: event.clientX - rect.left - 110,
        y: event.clientY - rect.top - 45,
      }

      addSkillNode(skillId, skill.name, position)
    },
    [skills, addSkillNode]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="relative w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'customEdge',
          data: { type: 'serial' },
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-slate-50"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#cbd5e1"
        />
        <Controls className="!shadow-sm !border !border-slate-200 !rounded-lg !overflow-hidden" />
        <MiniMap
          className="!shadow-sm !border !border-slate-200 !rounded-lg !overflow-hidden"
          nodeColor={(node) => {
            const status = (node.data as { status?: string })?.status
            switch (status) {
              case 'running': return '#3b82f6'
              case 'success': return '#10b981'
              case 'error': return '#ef4444'
              default: return '#94a3b8'
            }
          }}
          maskColor="rgba(248,250,252,0.7)"
        />

        {/* Top toolbar panel */}
        <Panel position="top-center">
          <div className="flex items-center gap-2">
            <CanvasToolbar />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={onSettingsClick}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </Panel>

        {/* Bottom PromptInput panel */}
        <Panel position="bottom-center" className="!mb-4">
          <PromptInput />
        </Panel>
      </ReactFlow>

      {/* Node detail drawer */}
      {selectedNodeId && <NodeDetailPanel nodeId={selectedNodeId} />}
    </div>
  )
}
