import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FlowNode } from '@/store/flowStore'

const STATUS_COLORS = {
  idle: 'border-amber-300 bg-amber-50',
  running: 'border-amber-400 bg-amber-100 animate-pulse',
  success: 'border-emerald-400 bg-emerald-50',
  error: 'border-red-400 bg-red-50',
  skipped: 'border-slate-200 bg-slate-50',
}

export const ConditionNode = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const status = data.status || 'idle'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 80 }}>
      {/* Diamond shape via CSS transform */}
      <div
        className={cn(
          'absolute w-[80px] h-[80px] rotate-45 border-2 rounded-sm transition-all',
          STATUS_COLORS[status] || STATUS_COLORS.idle,
          selected && 'ring-2 ring-blue-400 ring-offset-1'
        )}
      />

      {/* Content inside diamond */}
      <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none">
        <GitBranch className="h-4 w-4 text-amber-600" />
        <span className="text-[10px] font-semibold text-amber-800 text-center leading-tight max-w-[60px] truncate">
          {data.label || 'Condition'}
        </span>
        {data.condition_expr && (
          <span className="text-[9px] text-amber-600 max-w-[70px] truncate">
            {data.condition_expr}
          </span>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0 }}
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-white"
      />
      {/* True branch — right */}
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        style={{ right: 0 }}
        className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white"
      />
      {/* False branch — left */}
      <Handle
        id="false"
        type="source"
        position={Position.Left}
        style={{ left: 0 }}
        className="!w-2.5 !h-2.5 !bg-red-400 !border-2 !border-white"
      />
      {/* Default / bottom */}
      <Handle
        id="default"
        type="source"
        position={Position.Bottom}
        style={{ bottom: 0 }}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  )
})

ConditionNode.displayName = 'ConditionNode'
