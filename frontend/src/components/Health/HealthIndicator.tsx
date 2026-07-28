import { cn } from '@/lib/utils'
import type { HealthGrade } from '@/types'

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: 'bg-emerald-500',
  B: 'bg-emerald-400',
  C: 'bg-amber-400',
  D: 'bg-orange-500',
  F: 'bg-red-500',
  untested: 'bg-slate-300',
}

const GRADE_RING: Record<HealthGrade, string> = {
  A: 'ring-emerald-200',
  B: 'ring-emerald-100',
  C: 'ring-amber-100',
  D: 'ring-orange-100',
  F: 'ring-red-100',
  untested: 'ring-slate-100',
}

interface HealthIndicatorProps {
  grade: HealthGrade
  score: number
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

export function HealthIndicator({
  grade,
  score,
  size = 'md',
  showScore = false,
  className,
}: HealthIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block rounded-full ring-2 ring-offset-1',
          SIZE_MAP[size],
          GRADE_COLORS[grade],
          GRADE_RING[grade]
        )}
        title={`Health: ${score} (${grade})`}
        data-testid="health-indicator-dot"
        data-grade={grade}
      />
      {showScore && (
        <span className="text-xs font-medium text-slate-600" data-testid="health-indicator-score">
          {score > 0 ? score : '-'}
        </span>
      )}
    </div>
  )
}