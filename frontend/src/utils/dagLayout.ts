import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 220
const NODE_HEIGHT = 90
const CONDITION_SIZE = 80
const GATEWAY_SIZE = 48

function getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case 'condition':
      return { width: CONDITION_SIZE * 1.5, height: CONDITION_SIZE }
    case 'parallel_fork':
    case 'parallel_join':
    case 'start':
    case 'end':
      return { width: GATEWAY_SIZE, height: GATEWAY_SIZE }
    default:
      return { width: NODE_WIDTH, height: NODE_HEIGHT }
  }
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    ranksep: 80,
    nodesep: 50,
    marginx: 40,
    marginy: 40,
  })

  nodes.forEach((node) => {
    const dims = getNodeDimensions(node.type || '')
    g.setNode(node.id, { width: dims.width, height: dims.height })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    const dims = getNodeDimensions(node.type || '')
    return {
      ...node,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    }
  })
}
