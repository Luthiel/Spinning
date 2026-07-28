import { useMemo } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HealthIndicator } from './HealthIndicator'
import { cn } from '@/lib/utils'
import type { SkillHealth, HealthGrade, HealthIssue } from '@/types'

interface HealthRadarCardProps {
  health: SkillHealth | null
  loading?: boolean
  onRecheck?: (skillId: string) => void
  onViewHistory?: (skillId: string) => void
}

const GRADE_BADGE: Record<HealthGrade, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-emerald-50 text-emerald-600',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
  untested: 'bg-slate-100 text-slate-500',
}

function RadarChart({ dimensions }: { dimensions: SkillHealth['dimensions'] }) {
  const size = 180
  const center = size / 2
  const radius = 65
  const levels = 4

  const axes = useMemo(() => {
    const count = dimensions.length
    return dimensions.map((_, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        labelX: center + (radius + 18) * Math.cos(angle),
        labelY: center + (radius + 18) * Math.sin(angle),
        name: dimensions[i].name,
      }
    })
  }, [dimensions])

  const dataPoints = useMemo(() => {
    const count = dimensions.length
    return dimensions.map((d, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2
      const r = (d.score / 100) * radius
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      }
    })
  }, [dimensions])

  const gridLines = useMemo(() => {
    const lines = []
    for (let level = 1; level <= levels; level++) {
      const r = (radius * level) / levels
      const points = dimensions.map((_, i) => {
        const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
      })
      lines.push(points.join(' '))
    }
    return lines
  }, [dimensions])

  const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* Grid polygons */}
      {gridLines.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {axes.map((axis, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={axis.x}
          y2={axis.y}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {/* Data area */}
      <path
        d={pathD}
        fill="rgba(59, 130, 246, 0.15)"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
      ))}
      {/* Labels */}
      {axes.map((axis, i) => (
        <text
          key={`label-${i}`}
          x={axis.labelX}
          y={axis.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] fill-slate-500"
          style={{ fontSize: 9 }}
        >
          {axis.name.slice(0, 4)}
        </text>
      ))}
    </svg>
  )
}

function IssueItem({ issue }: { issue: HealthIssue }) {
  const severityConfig = {
    critical: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
    warning: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
    info: { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  }
  const cfg = severityConfig[issue.severity]

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-700">{issue.message}</span>
          <Badge variant="secondary" className={cn('text-[9px] px-1 py-0 h-4', cfg.badge)}>
            {issue.severity === 'critical' ? '严重' : issue.severity === 'warning' ? '警告' : '提示'}
          </Badge>
        </div>
        {issue.suggestion && (
          <p className="text-[10px] text-slate-400 mt-0.5">建议：{issue.suggestion}</p>
        )}
      </div>
    </div>
  )
}

export function HealthRadarCard({ health, loading, onRecheck, onViewHistory }: HealthRadarCardProps) {
  if (loading) {
    return (
      <Card className="border-slate-200" data-testid="health-radar-card">
        <CardContent className="p-4">
          <div className="h-64 bg-slate-100 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card className="border-slate-200" data-testid="health-radar-card">
        <CardContent className="p-8 text-center text-xs text-slate-400">
          选择一个 Skill 查看健康详情
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200" data-testid="health-radar-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{health.skill_name}</CardTitle>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                GRADE_BADGE[health.grade]
              )}
            >
              {health.grade === 'untested' ? '未测' : health.grade}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRecheck?.(health.skill_id)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              重新检查
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onViewHistory?.(health.skill_id)}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              历史趋势
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <RadarChart dimensions={health.dimensions} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <HealthIndicator grade={health.grade} score={health.score} size="lg" showScore />
              <span className="text-[10px] text-slate-400">{health.call_count} calls</span>
            </div>

            {/* Dimension scores */}
            <div className="space-y-1.5 mb-3">
              {health.dimensions.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{d.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          d.score >= 80 ? 'bg-emerald-500' : d.score >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        )}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 w-6 text-right">{d.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Issues */}
        {health.issues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">
              发现问题 ({health.issues.length})
            </div>
            <div className="space-y-0">
              {health.issues.map((issue) => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}