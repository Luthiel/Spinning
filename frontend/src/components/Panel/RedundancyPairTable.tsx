import { useState } from 'react'
import { ArrowRightLeft, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RedundancyPair, RedundancyAction } from '@/types'
import { cn } from '@/lib/utils'

interface RedundancyPairTableProps {
  pairs: RedundancyPair[]
  loading?: boolean
  onAction?: (pairId: string, action: RedundancyAction) => void
}

const SEVERITY_CONFIG = {
  high: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', label: 'High' },
  medium: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Medium' },
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Low' },
}

const ACTION_LABELS: Record<RedundancyAction, string> = {
  differentiate: 'Differentiate',
  keep_better: 'Keep Better',
  keep_both: 'Keep Both',
}

function PairRow({
  pair,
  onAction,
}: {
  pair: RedundancyPair
  onAction?: (pairId: string, action: RedundancyAction) => void
}) {
  const [acting, setActing] = useState<RedundancyAction | null>(null)
  const severity = SEVERITY_CONFIG[pair.severity]
  const SeverityIcon = severity.icon

  const handleAction = async (action: RedundancyAction) => {
    setActing(action)
    try {
      await onAction?.(pair.id, action)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      {/* Severity indicator */}
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', severity.bg)}>
        <SeverityIcon className={cn('h-3 w-3', severity.color)} />
      </div>

      {/* Skill pair */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-slate-700 truncate">{pair.skill_a_name}</span>
          <ArrowRightLeft className="h-3 w-3 text-slate-400 flex-shrink-0" />
          <span className="font-semibold text-slate-700 truncate">{pair.skill_b_name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-[9px] text-slate-500">
            Overlap:{' '}
            <span className="font-medium text-slate-700">
              {(pair.capability_overlap * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-[9px] text-slate-500">
            Similarity:{' '}
            <span className="font-medium text-slate-700">
              {(pair.semantic_similarity * 100).toFixed(0)}%
            </span>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
            {ACTION_LABELS[pair.recommended_action]}
          </Badge>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 flex-shrink-0">
        {(['differentiate', 'keep_better', 'keep_both'] as RedundancyAction[]).map((action) => (
          <Button
            key={action}
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] px-2 py-0"
            disabled={!!acting}
            onClick={() => handleAction(action)}
          >
            {acting === action ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              ACTION_LABELS[action]
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function RedundancyPairTable({ pairs, loading, onAction }: RedundancyPairTableProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const filtered =
    filter === 'all' ? pairs : pairs.filter((p) => p.severity === filter)

  if (pairs.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-8">
        No redundancy pairs found. Run detection to find redundancies.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-1 pb-2 border-b border-slate-100">
        {(['all', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-[9px] px-2 py-0.5 rounded-full border transition-colors capitalize',
              filter === f
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            {f === 'all' ? `All (${pairs.length})` : `${SEVERITY_CONFIG[f].label} (${pairs.filter((p) => p.severity === f).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <ScrollArea className="flex-1 mt-2">
        <div className="space-y-1.5 pr-1 pb-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">
              No pairs match the selected filter
            </div>
          ) : (
            filtered.map((pair) => (
              <PairRow key={pair.id} pair={pair} onAction={onAction} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
