import { format, parseISO } from 'date-fns'
import { Activity, ChevronUp, ChevronDown, Minus, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { HealthSnapshot, HealthGrade } from '@/types'

interface HealthSnapshotTimelineProps {
  snapshots: HealthSnapshot[]
}

function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function getGradeColor(grade: HealthGrade): string {
  const map: Record<HealthGrade, string> = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    B: 'bg-blue-100 text-blue-700 border-blue-200',
    C: 'bg-amber-100 text-amber-700 border-amber-200',
    D: 'bg-orange-100 text-orange-700 border-orange-200',
    F: 'bg-red-100 text-red-700 border-red-200',
  }
  return map[grade] || 'bg-slate-100 text-slate-600 border-slate-200'
}

function getScoreChangeIcon(current: number, previous?: number) {
  if (previous === undefined) return <Minus className="h-3 w-3 text-slate-300" />
  if (current > previous) return <ChevronUp className="h-3 w-3 text-emerald-500" />
  if (current < previous) return <ChevronDown className="h-3 w-3 text-red-400" />
  return <Minus className="h-3 w-3 text-slate-300" />
}

function getScoreChangeText(current: number, previous?: number): string {
  if (previous === undefined) return 'Initial check'
  const diff = current - previous
  if (diff > 0) return `+${diff} pts`
  if (diff < 0) return `${diff} pts`
  return 'No change'
}

export function HealthSnapshotTimeline({ snapshots }: HealthSnapshotTimelineProps) {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6">
        No snapshot data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2 pr-2">
        {sorted.map((snapshot, idx) => {
          const prev = sorted[idx + 1]
          const prevScore = prev?.health_score
          const hasEvents = snapshot.events.length > 0

          return (
            <div
              key={snapshot.id}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              data-testid="health-snapshot-item"
            >
              {/* Grade badge */}
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-1.5 py-0 h-5 min-w-[24px] justify-center ${getGradeColor(snapshot.grade)}`}
              >
                {snapshot.grade}
              </Badge>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    Score: {snapshot.health_score}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                    {getScoreChangeIcon(snapshot.health_score, prevScore)}
                    {getScoreChangeText(snapshot.health_score, prevScore)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 mt-0.5">
                  {formatDateTime(snapshot.checked_at)}
                </div>

                {snapshot.changes && (
                  <div className="text-[10px] text-slate-500 mt-1 truncate">
                    {snapshot.changes}
                  </div>
                )}

                {hasEvents && (
                  <div className="flex items-start gap-1 mt-1.5">
                    <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {snapshot.events.map((ev) => (
                        <div key={ev.id} className="text-[10px] text-slate-500">
                          <span className="font-medium text-amber-600">{ev.type.replace(/_/g, ' ')}</span>
                          {': '}
                          {ev.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dimension mini bars */}
                {snapshot.dimensions.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {snapshot.dimensions.map((dim) => (
                      <div key={dim.name} className="flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5 text-slate-400" />
                        <span className="text-[9px] text-slate-500">{dim.name}:</span>
                        <span className="text-[9px] font-medium text-slate-700">{dim.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
