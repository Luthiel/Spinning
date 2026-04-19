import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertCircle, CheckCircle2, Clock, Loader2, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FlowNodeData } from '@/types'
import type { FlowNode } from '@/store/flowStore'

const STATUS_CONFIG = {
  idle: {
    dot: 'bg-slate-300',
    border: 'border-slate-200',
    bg: 'bg-white',
    icon: null,
  },
  running: {
    dot: 'bg-blue-500 animate-pulse',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    icon: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
  },
  success: {
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  },
  error: {
    dot: 'bg-red-500',
    border: 'border-red-300',
    bg: 'bg-red-50',
    icon: <AlertCircle className="h-3 w-3 text-red-500" />,
  },
  skipped: {
    dot: 'bg-slate-300',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    icon: null,
  },
}

const MCP_GRADIENT = 'from-cyan-500 to-blue-600'

export const MCPNode = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const status = data.status || 'idle'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle

  return (
    <div
      className={cn(
        'w-[240px] rounded-xl border-2 shadow-sm transition-all duration-200 cursor-pointer',
        cfg.border,
        cfg.bg,
        selected && 'ring-2 ring-cyan-400 ring-offset-1',
        status === 'running' && 'shadow-cyan-100 shadow-md'
      )}
    >
      <div className={cn('h-1.5 rounded-t-xl bg-gradient-to-r', MCP_GRADIENT)} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br',
              MCP_GRADIENT
            )}
          >
            <Plug className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
              {data.label || 'MCP Tool'}
            </div>
            {data.mcp_server && (
              <div className="text-[10px] text-cyan-600 font-medium truncate mt-0.5">
                {data.mcp_server}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-0.5">
            <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
          </div>
        </div>

        {data.mcp_tool && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-500">
              <span className="text-slate-400">Tool:</span>{' '}
              <span className="font-mono text-slate-700">{data.mcp_tool}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {data.execution_time !== undefined && (
              <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock className="h-2.5 w-2.5" />
                <span>{data.execution_time}ms</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {cfg.icon}
            {data.call_count > 0 && (
              <div className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                <span>×{data.call_count}</span>
              </div>
            )}
          </div>
        </div>

        {data.error_message && (
          <div className="mt-1.5 text-[10px] text-red-500 bg-red-50 rounded px-1.5 py-0.5 truncate">
            {data.error_message}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  )
})

MCPNode.displayName = 'MCPNode'
