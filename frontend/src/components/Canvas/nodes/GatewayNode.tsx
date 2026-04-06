import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitFork, GitMerge } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FlowNode } from '@/store/flowStore'

const STATUS_COLORS = {
  idle: 'border-blue-300 bg-blue-50 text-blue-600',
  running: 'border-blue-400 bg-blue-100 text-blue-700 animate-pulse',
  success: 'border-emerald-400 bg-emerald-50 text-emerald-600',
  error: 'border-red-400 bg-red-50 text-red-600',
  skipped: 'border-slate-200 bg-slate-50 text-slate-400',
}

export const ParallelForkNode = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const status = data.status || 'idle'

  return (
    <div
      className={cn(
        'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm',
        STATUS_COLORS[status] || STATUS_COLORS.idle,
        selected && 'ring-2 ring-blue-400 ring-offset-1'
      )}
    >
      <GitFork className="h-5 w-5" />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        id="out-1"
        type="source"
        position={Position.Bottom}
        style={{ left: '30%' }}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        id="out-2"
        type="source"
        position={Position.Bottom}
        style={{ left: '70%' }}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  )
})

export const ParallelJoinNode = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const status = data.status || 'idle'

  return (
    <div
      className={cn(
        'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm',
        STATUS_COLORS[status] || STATUS_COLORS.idle,
        selected && 'ring-2 ring-blue-400 ring-offset-1'
      )}
    >
      <GitMerge className="h-5 w-5" />

      <Handle
        id="in-1"
        type="target"
        position={Position.Top}
        style={{ left: '30%' }}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        id="in-2"
        type="target"
        position={Position.Top}
        style={{ left: '70%' }}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  )
})

ParallelForkNode.displayName = 'ParallelForkNode'
ParallelJoinNode.displayName = 'ParallelJoinNode'
