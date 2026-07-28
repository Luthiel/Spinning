import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { HealthSnapshot, HealthCheckEvent } from '@/types'

export interface ChartDataPoint {
  date: string
  timestamp: number
  health_score: number
  [dimension: string]: string | number
}

interface HealthHistoryChartProps {
  snapshots: HealthSnapshot[]
  showDimensions: boolean
  onEventClick?: (event: HealthCheckEvent) => void
}

function formatDateLabel(iso: string): string {
  try {
    return format(parseISO(iso), 'MM-dd')
  } catch {
    return iso.slice(5, 10)
  }
}

function formatTooltipDate(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function getGradeColor(score: number): string {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3b82f6'
  if (score >= 70) return '#f59e0b'
  if (score >= 60) return '#f97316'
  return '#ef4444'
}

const DIMENSION_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b']

export function HealthHistoryChart({ snapshots, showDimensions, onEventClick }: HealthHistoryChartProps) {
  const { data, dimensionNames } = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) =>
      new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
    )

    const dims = new Set<string>()
    sorted.forEach((s) => s.dimensions.forEach((d) => dims.add(d.name)))
    const dimNames = Array.from(dims)

    const points: ChartDataPoint[] = sorted.map((s) => {
      const point: ChartDataPoint = {
        date: formatDateLabel(s.checked_at),
        timestamp: new Date(s.checked_at).getTime(),
        health_score: s.health_score,
      }
      s.dimensions.forEach((d) => {
        point[d.name] = d.score
      })
      return point
    })

    return { data: points, dimensionNames: dimNames }
  }, [snapshots])

  const events = useMemo(() => {
    const eventMap = new Map<number, HealthCheckEvent[]>()
    snapshots.forEach((s) => {
      const ts = new Date(s.checked_at).getTime()
      s.events.forEach((ev) => {
        const existing = eventMap.get(ts) || []
        existing.push(ev)
        eventMap.set(ts, existing)
      })
    })
    return eventMap
  }, [snapshots])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No health history data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null
            const point = payload[0].payload as ChartDataPoint
            const timestamp = point.timestamp
            const eventList = events.get(timestamp) || []
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                <div className="text-xs font-medium text-slate-500 mb-1">
                  {formatTooltipDate(new Date(timestamp).toISOString())}
                </div>
                {payload.map((entry) => (
                  <div key={String(entry.dataKey)} className="flex items-center gap-2 text-xs py-0.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: entry.color || '#64748b' }}
                    />
                    <span className="text-slate-600 capitalize">{entry.name}:</span>
                    <span className="font-semibold text-slate-800">{entry.value}</span>
                  </div>
                ))}
                {eventList.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Events
                    </div>
                    {eventList.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick?.(ev)}
                        className="block text-left text-[11px] text-blue-600 hover:text-blue-800 hover:underline w-full"
                      >
                        {ev.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="health_score"
          name="Health Score"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={(props) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartDataPoint }
            const hasEvents = events.has(payload.timestamp)
            return (
              <g>
                <circle cx={cx} cy={cy} r={hasEvents ? 5 : 3} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
                {hasEvents && (
                  <circle cx={cx} cy={cy} r={8} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
                )}
              </g>
            )
          }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        {showDimensions &&
          dimensionNames.map((dim, idx) => (
            <Line
              key={dim}
              type="monotone"
              dataKey={dim}
              name={dim}
              stroke={DIMENSION_COLORS[idx % DIMENSION_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        {Array.from(events.entries()).map(([timestamp, eventList]) => {
          const point = data.find((d) => d.timestamp === timestamp)
          if (!point) return null
          return eventList.map((ev) => (
            <ReferenceDot
              key={ev.id}
              x={point.date}
              y={point.health_score}
              r={5}
              fill="#f59e0b"
              stroke="white"
              strokeWidth={2}
              onClick={() => onEventClick?.(ev)}
            />
          ))
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
