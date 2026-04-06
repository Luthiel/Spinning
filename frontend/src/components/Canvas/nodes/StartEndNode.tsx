import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { FlowNode } from '@/store/flowStore'

export const StartNode = memo(({ selected }: NodeProps<FlowNode>) => (
  <div
    className={cn(
      'w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md',
      selected && 'ring-2 ring-blue-400 ring-offset-1'
    )}
  >
    <span className="text-white text-[10px] font-bold">START</span>
    <Handle
      type="source"
      position={Position.Bottom}
      className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
    />
  </div>
))

export const EndNode = memo(({ selected }: NodeProps<FlowNode>) => (
  <div
    className={cn(
      'w-12 h-12 rounded-full border-4 border-slate-800 bg-white flex items-center justify-center shadow-md',
      selected && 'ring-2 ring-blue-400 ring-offset-1'
    )}
  >
    <div className="w-6 h-6 rounded-full bg-slate-800" />
    <Handle
      type="target"
      position={Position.Top}
      className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
    />
  </div>
))

StartNode.displayName = 'StartNode'
EndNode.displayName = 'EndNode'
