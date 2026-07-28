import { useRef, useEffect, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RedundancyNode, RedundancyEdge } from '@/types'

interface RedundancyNetworkGraphProps {
  nodes: RedundancyNode[]
  edges: RedundancyEdge[]
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string | null
}

// D3 force simulation mutates nodes with position properties
type SimNode = RedundancyNode & d3.SimulationNodeDatum
type SimEdge = RedundancyEdge & d3.SimulationLinkDatum<SimNode>

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  critical: '#ef4444', // red-500
}

const HEALTH_RADIUS: Record<string, number> = {
  healthy: 6,
  warning: 8,
  critical: 10,
}

export function RedundancyNetworkGraph({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
}: RedundancyNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    node?: RedundancyNode
  }>({ visible: false, x: 0, y: 0 })

  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }, [])

  const zoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 1.3)
    }
  }, [])

  const zoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(200)
        .call(zoomRef.current.scaleBy, 1 / 1.3)
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom)

    // Build node map for edge lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Filter edges to only those with existing nodes
    const validEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))

    // Force simulation
    const simNodes = nodes as SimNode[]
    const simEdges = validEdges as SimEdge[]

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simEdges)
          .id((d: unknown) => (d as SimNode).id)
          .distance((d: unknown) => {
            const edge = d as SimEdge
            return 120 + (1 - edge.similarity) * 150
          })
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20))

    // Edge lines
    const linkGroup = g.append('g').attr('class', 'links')

    const link = linkGroup
      .selectAll('line')
      .data(validEdges)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.similarity > 0.8) return '#ef4444'
        return '#f59e0b'
      })
      .attr('stroke-width', (d) => 1 + d.similarity * 3)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d) => {
        if (d.similarity > 0.8) return 'none'
        return '5,5'
      })

    // Node circles
    const nodeGroup = g.append('g').attr('class', 'nodes')

    const node = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => HEALTH_RADIUS[d.health_level] || 6)
      .attr('fill', (d) => HEALTH_COLORS[d.health_level] || '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', (d) => {
        if (!selectedNodeId) return 1
        const isConnected = validEdges.some(
          (e) =>
            (e.source === d.id || e.target === d.id) &&
            (e.source === selectedNodeId || e.target === selectedNodeId)
        )
        return d.id === selectedNodeId || isConnected ? 1 : 0.2
      })
      .call(
        d3
          .drag<SVGCircleElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x ?? null
            d.fy = d.y ?? null
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Node labels (only for larger nodes or when zoomed)
    const labelGroup = g.append('g').attr('class', 'labels')

    const labels = labelGroup
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.name)
      .attr('font-size', 10)
      .attr('fill', '#334155')
      .attr('text-anchor', 'middle')
      .attr('dy', -12)
      .style('pointer-events', 'none')
      .style('opacity', (d) => {
        if (!selectedNodeId) return 1
        const isConnected = validEdges.some(
          (e) =>
            (e.source === d.id || e.target === d.id) &&
            (e.source === selectedNodeId || e.target === selectedNodeId)
        )
        return d.id === selectedNodeId || isConnected ? 1 : 0.2
      })

    // Hover tooltip
    node
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect()
        setTooltip({
          visible: true,
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10,
          node: d,
        })
      })
      .on('mousemove', (event) => {
        const rect = container.getBoundingClientRect()
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10,
        }))
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }))
      })
      .on('click', (_event, d) => {
        onNodeClick?.(d.id)
      })

    // Tick update
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => ((d as SimEdge).source as SimNode).x!)
        .attr('y1', (d) => ((d as SimEdge).source as SimNode).y!)
        .attr('x2', (d) => ((d as SimEdge).target as SimNode).x!)
        .attr('y2', (d) => ((d as SimEdge).target as SimNode).y!)

      node.attr('cx', (d) => (d as SimNode).x!).attr('cy', (d) => (d as SimNode).y!)

      labels
        .attr('x', (d) => (d as SimNode).x!)
        .attr('y', (d) => (d as SimNode).y!)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, onNodeClick, selectedNodeId])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        No redundancy data available. Run detection to populate the map.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 flex gap-1">
        <Button variant="secondary" size="icon-sm" onClick={zoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="icon-sm" onClick={zoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="icon-sm" onClick={resetZoom}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 p-2.5 shadow-sm">
        <div className="text-[10px] font-semibold text-slate-700 mb-1.5">Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-red-500" />
            <span className="text-[9px] text-slate-500">High overlap (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-amber-500 border-dashed border-t border-amber-500" style={{ borderTopWidth: 1.5, height: 0 }} />
            <span className="text-[9px] text-slate-500">Medium (50-80%)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-slate-500">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[9px] text-slate-500">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[9px] text-slate-500">Critical</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div
          className="absolute pointer-events-none bg-white rounded-lg border border-slate-200 shadow-lg p-2.5 z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="text-[11px] font-semibold text-slate-800">{tooltip.node.name}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">
            Health:{' '}
            <span
              className="font-medium"
              style={{ color: HEALTH_COLORS[tooltip.node.health_level] }}
            >
              {tooltip.node.health_level}
            </span>
          </div>
          <div className="text-[9px] text-slate-500">Calls: {tooltip.node.call_count}</div>
          <div className="text-[9px] text-slate-500">
            Categories: {tooltip.node.category.join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}
