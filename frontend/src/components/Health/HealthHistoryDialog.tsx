import { useState, useEffect, useCallback } from 'react'
import { History, TrendingUp, List, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HealthHistoryChart } from './HealthHistoryChart'
import { HealthSnapshotTimeline } from './HealthSnapshotTimeline'
import { healthApi } from '@/services/api'
import type { HealthHistoryResponse, TimeRange, HealthCheckEvent } from '@/types'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
]

interface HealthHistoryDialogProps {
  skillId: string
  skillName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HealthHistoryDialog({ skillId, skillName, open, onOpenChange }: HealthHistoryDialogProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [showDimensions, setShowDimensions] = useState(false)
  const [data, setData] = useState<HealthHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<HealthCheckEvent | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await healthApi.getHistory(skillId, timeRange)
      setData(resp)
    } catch (e) {
      console.error('Failed to load health history', e)
      setError('Failed to load health history data')
    } finally {
      setLoading(false)
    }
  }, [skillId, timeRange])

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open, loadHistory])

  const handleEventClick = (event: HealthCheckEvent) => {
    setSelectedEvent(event)
  }

  const snapshots = data?.snapshots || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-blue-500" />
                Health History — {skillName}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                View health score trends and historical snapshots over time
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="px-6 py-3 border-y border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
          {/* Time range selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1">Range:</span>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={timeRange === opt.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => setTimeRange(opt.value)}
                data-testid={`time-range-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Toggle dimensions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showDimensions ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => setShowDimensions(!showDimensions)}
                data-testid="toggle-dimensions"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Dimensions
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showDimensions ? 'Hide dimension trends' : 'Show dimension trends'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Summary stats */}
        {data?.summary && (
          <div className="px-6 py-2 grid grid-cols-4 gap-3 border-b border-slate-100">
            <StatBox label="Avg Score" value={data.summary.avg_score.toFixed(1)} />
            <StatBox label="Best" value={data.summary.best_score.toFixed(1)} color="text-emerald-600" />
            <StatBox label="Worst" value={data.summary.worst_score.toFixed(1)} color="text-red-500" />
            <StatBox label="Checks" value={data.summary.total_checks} />
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-64 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-32 bg-slate-100 animate-pulse rounded-lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadHistory}>
                Retry
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="chart">
              <TabsList className="h-7 mb-3">
                <TabsTrigger value="chart" className="text-[11px] h-5">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trend
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-[11px] h-5">
                  <List className="h-3 w-3 mr-1" />
                  Snapshots ({snapshots.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="mt-0">
                <div className="border border-slate-100 rounded-lg p-2 bg-white">
                  <HealthHistoryChart
                    snapshots={snapshots}
                    showDimensions={showDimensions}
                    onEventClick={handleEventClick}
                  />
                </div>
                {selectedEvent && (
                  <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-[11px] font-semibold text-amber-800">
                        {selectedEvent.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        {selectedEvent.description}
                      </div>
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        {selectedEvent.timestamp}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <div className="border border-slate-100 rounded-lg p-3 bg-white">
                  <HealthSnapshotTimeline snapshots={snapshots} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({
  label,
  value,
  color = 'text-slate-800',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}
