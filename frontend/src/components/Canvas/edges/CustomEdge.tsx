import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { FlowEdge } from '@/store/flowStore'

const EDGE_STYLES = {
  serial: {
    stroke: '#94a3b8',
    strokeWidth: 2,
    strokeDasharray: undefined,
  },
  parallel: {
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: '6 3',
  },
  conditional: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    strokeDasharray: '4 2',
  },
}

export const CustomEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  }: EdgeProps<FlowEdge>) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    const edgeType = data?.type || 'serial'
    const style = EDGE_STYLES[edgeType] || EDGE_STYLES.serial
    const label = data?.label || (data?.condition ? data.condition : null)

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            stroke: selected ? '#3b82f6' : style.stroke,
            filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.5))' : undefined,
          }}
        />

        {/* Edge type indicator dot */}
        {edgeType !== 'serial' && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'none',
              }}
            >
              <div
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[9px] font-semibold border',
                  edgeType === 'parallel' &&
                    'bg-blue-50 text-blue-600 border-blue-200',
                  edgeType === 'conditional' &&
                    'bg-amber-50 text-amber-600 border-amber-200'
                )}
              >
                {label || edgeType}
              </div>
            </div>
          </EdgeLabelRenderer>
        )}

        {/* Condition label */}
        {edgeType === 'conditional' && label && label !== edgeType && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${(labelY || 0) - 14}px)`,
                pointerEvents: 'none',
              }}
            >
              <div className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-mono max-w-[100px] truncate">
                {label}
              </div>
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }
)

CustomEdge.displayName = 'CustomEdge'
