import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GradeDistribution, HealthGrade } from '@/types'

interface GradeDistributionProps {
  distribution: GradeDistribution[]
  loading?: boolean
}

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: 'bg-emerald-500',
  B: 'bg-emerald-400',
  C: 'bg-amber-400',
  D: 'bg-orange-500',
  F: 'bg-red-500',
  untested: 'bg-slate-300',
}

const GRADE_LABELS: Record<HealthGrade, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
  untested: '未测',
}

export function GradeDistribution({ distribution, loading }: GradeDistributionProps) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  return (
    <Card className="border-slate-200" data-testid="grade-distribution">
      <CardHeader className="pb-2">
        <CardTitle>Grade 分布</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 bg-slate-100 animate-pulse rounded-lg" />
        ) : (
          <div className="space-y-2">
            {distribution.map((item) => (
              <div key={item.grade} className="flex items-center gap-3">
                <span className="w-8 text-xs font-semibold text-slate-600 text-right">
                  {GRADE_LABELS[item.grade]}
                </span>
                <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden relative">
                  <div
                    className={cn('h-full rounded-md transition-all duration-500', GRADE_COLORS[item.grade])}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                    data-testid={`grade-bar-${item.grade}`}
                  />
                  {item.count > 0 && (
                    <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-medium text-slate-700">
                      {item.count} ({item.percentage}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}