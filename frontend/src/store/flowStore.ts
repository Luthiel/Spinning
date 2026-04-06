import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react'
import type { FlowNodeData, FlowEdgeData, Flow, ConflictReport, NodeStatus } from '@/types'
import { generateId } from '@/lib/utils'

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge<FlowEdgeData>

interface FlowState {
  // Current flow metadata
  flowId: string | null
  flowName: string
  isDirty: boolean

  // ReactFlow state
  nodes: FlowNode[]
  edges: FlowEdge[]

  // Conflict state
  conflicts: ConflictReport[]
  conflictPanelOpen: boolean

  // Selected elements
  selectedNodeId: string | null
  selectedEdgeId: string | null

  // Template selector
  templateSelectorOpen: boolean

  // Actions
  setFlowId: (id: string | null) => void
  setFlowName: (name: string) => void
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void
  onConnect: (connection: Connection) => void
  addSkillNode: (skillId: string, skillName: string, position: { x: number; y: number }) => void
  addConditionNode: (position: { x: number; y: number }) => void
  addParallelForkNode: (position: { x: number; y: number }) => void
  addParallelJoinNode: (position: { x: number; y: number }) => void
  updateNodeStatus: (nodeId: string, status: NodeStatus, callCount?: number) => void
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void
  setConflicts: (conflicts: ConflictReport[]) => void
  setConflictPanelOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setTemplateSelectorOpen: (open: boolean) => void
  loadFlow: (flow: Flow, skills: Record<string, import('@/types').Skill>) => void
  resetFlow: () => void
  setIsDirty: (dirty: boolean) => void
}

const initialNodes: FlowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 400, y: 80 },
    data: {
      type: 'start',
      label: 'Start',
      status: 'idle',
      call_count: 0,
      config: {},
    },
  },
]

export const useFlowStore = create<FlowState>((set, get) => ({
  flowId: null,
  flowName: 'Untitled Flow',
  isDirty: false,
  nodes: initialNodes,
  edges: [],
  conflicts: [],
  conflictPanelOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  templateSelectorOpen: false,

  setFlowId: (flowId) => set({ flowId }),
  setFlowName: (flowName) => set({ flowName, isDirty: true }),
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  setIsDirty: (isDirty) => set({ isDirty }),

  onNodesChange: (changes) => {
    set((state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: applyNodeChanges(changes as any, state.nodes) as FlowNode[],
      isDirty: true,
    }))
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edges: applyEdgeChanges(changes as any, state.edges) as FlowEdge[],
      isDirty: true,
    }))
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: `e-${generateId()}`,
          type: 'customEdge',
          data: { type: 'serial' as const },
          animated: false,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state.edges as any
      ) as FlowEdge[],
      isDirty: true,
    }))
  },

  addSkillNode: (skillId, skillName, position) => {
    const newNode: FlowNode = {
      id: `skill-${generateId()}`,
      type: 'skill',
      position,
      data: {
        type: 'skill',
        label: skillName,
        skill_id: skillId,
        status: 'idle',
        call_count: 0,
        config: {},
      },
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }))
  },

  addConditionNode: (position) => {
    const newNode: FlowNode = {
      id: `cond-${generateId()}`,
      type: 'condition',
      position,
      data: {
        type: 'condition',
        label: 'Condition',
        status: 'idle',
        call_count: 0,
        config: {},
        condition_expr: '',
      },
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }))
  },

  addParallelForkNode: (position) => {
    const newNode: FlowNode = {
      id: `fork-${generateId()}`,
      type: 'parallel_fork',
      position,
      data: {
        type: 'parallel_fork',
        label: 'Parallel Fork',
        status: 'idle',
        call_count: 0,
        config: {},
      },
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }))
  },

  addParallelJoinNode: (position) => {
    const newNode: FlowNode = {
      id: `join-${generateId()}`,
      type: 'parallel_join',
      position,
      data: {
        type: 'parallel_join',
        label: 'Parallel Join',
        status: 'idle',
        call_count: 0,
        config: {},
      },
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }))
  },

  updateNodeStatus: (nodeId, status, callCount) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                status,
                call_count: callCount !== undefined ? callCount : n.data.call_count,
              },
            }
          : n
      ),
    }))
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    }))
  },

  setConflicts: (conflicts) => set({ conflicts }),
  setConflictPanelOpen: (conflictPanelOpen) => set({ conflictPanelOpen }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId }),
  setTemplateSelectorOpen: (templateSelectorOpen) => set({ templateSelectorOpen }),

  loadFlow: (flow, skillsMap) => {
    const nodes: FlowNode[] = flow.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: {
        type: n.type,
        label: n.label || skillsMap[n.skill_id || '']?.name || n.type,
        skill_id: n.skill_id,
        skill: n.skill_id ? skillsMap[n.skill_id] : undefined,
        status: n.status,
        call_count: n.call_count,
        config: n.config,
        condition_expr: n.condition_expr,
        description: n.description,
      },
    }))
    const edges: FlowEdge[] = flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.source_handle,
      targetHandle: e.target_handle,
      type: 'customEdge',
      data: {
        type: e.edge_type,
        condition: e.condition,
        label: e.label,
      },
    }))
    set({
      flowId: flow.id,
      flowName: flow.name,
      nodes,
      edges,
      conflicts: [],
      isDirty: false,
    })
  },

  resetFlow: () => {
    set({
      flowId: null,
      flowName: 'Untitled Flow',
      nodes: initialNodes,
      edges: [],
      conflicts: [],
      isDirty: false,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },
}))
