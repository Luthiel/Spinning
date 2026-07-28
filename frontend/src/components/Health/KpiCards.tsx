import { Activity, AlertTriangle, Gauge, Layers, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HealthOverview } from '@/types'

interface KpiCardsProps {
  overview: HealthOverview | null
  loading?: boolean
}

const KPI_CONFIG = [
  {
    key: 'total_skills' as const,
    label: '总 Skill 数',
    icon: Layers,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'avg_health_score' as const,
    label: '平均健康分',
    icon: Gauge,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    suffix: '',
  },
  {
    key: 'redundant_pairs' as const,
    label: '冗余对数',
    icon: Activity,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    key: 'critical_issues' as const,
    label: '严重问题数',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  {
    key: 'long_unused_count' as const,
    label: '长期未使用',
    icon: Clock,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
]

export function KpiCards({ overview, loading }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="kpi-cards">
      {KPI_CONFIG.map((cfg) => {
        const Icon = cfg.icon
        const value = overview?.[cfg.key] ?? 0
        return (
          <Card key={cfg.key} className="border-slate-200">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 font-medium truncate">{cfg.label}</div>
                {loading ? (
                  <div className="h-5 w-10 bg-slate-100 animate-pulse rounded mt-0.5" />
                ) : (
                  <div className="text-lg font-bold text-slate-800 leading-tight" data-testid={`kpi-${cfg.key}`}>
                    {value}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}