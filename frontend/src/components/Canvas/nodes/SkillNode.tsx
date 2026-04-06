import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Activity, AlertCircle, CheckCircle2, Clock, Loader2, User } from 'lucide-react'
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

const SKILL_COLORS: Record<string, string> = {
  nlp: 'from-violet-500 to-purple-600',
  data: 'from-blue-500 to-cyan-600',
  image: 'from-pink-500 to-rose-600',
  code: 'from-emerald-500 to-teal-600',
  search: 'from-amber-500 to-orange-600',
  default: 'from-slate-600 to-slate-700',
}

function getCategoryGradient(skill?: FlowNodeData['skill']): string {
  if (!skill) return SKILL_COLORS.default
  const cat = skill.category[0]?.toLowerCase() || ''
  return SKILL_COLORS[cat] || SKILL_COLORS.default
}

export const SkillNode = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const status = data.status || 'idle'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle
  const gradient = getCategoryGradient(data.skill)

  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border-2 shadow-sm transition-all duration-200 cursor-pointer',
        cfg.border,
        cfg.bg,
        selected && 'ring-2 ring-blue-400 ring-offset-1',
        status === 'running' && 'shadow-blue-100 shadow-md'
      )}
    >
      {/* Color header bar */}
      <div className={cn('h-1.5 rounded-t-xl bg-gradient-to-r', gradient)} />

      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start gap-2">
          {/* Icon area */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br',
              gradient
            )}
          >
            {data.skill?.icon || data.label?.slice(0, 2).toUpperCase() || 'SK'}
          </div>

          {/* Name & description */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
              {data.label}
            </div>
            {data.skill?.description && (
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {data.skill.description}
              </div>
            )}
          </div>

          {/* Status dot */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-0.5">
            <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* Author */}
            {data.skill?.author && (
              <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <User className="h-2.5 w-2.5" />
                <span className="truncate max-w-[60px]">{data.skill.author}</span>
              </div>
            )}
            {/* Execution time */}
            {data.execution_time !== undefined && (
              <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock className="h-2.5 w-2.5" />
                <span>{data.execution_time}ms</span>
              </div>
            )}
          </div>

          {/* Call count + status icon */}
          <div className="flex items-center gap-1">
            {cfg.icon}
            {data.call_count > 0 && (
              <div className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                <Activity className="h-2.5 w-2.5" />
                <span>{data.call_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {data.error_message && (
          <div className="mt-1.5 text-[10px] text-red-500 bg-red-50 rounded px-1.5 py-0.5 truncate">
            {data.error_message}
          </div>
        )}
      </div>

      {/* Handles */}
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

SkillNode.displayName = 'SkillNode'
