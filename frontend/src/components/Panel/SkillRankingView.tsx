import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSkillStore } from '@/store/skillStore'
import { cn } from '@/lib/utils'

export function SkillRankingView() {
  const { rankings, skills } = useSkillStore()

  // Fallback: rank by call_count if no backend data
  const displayRankings =
    rankings.length > 0
      ? rankings
      : skills
          .slice()
          .sort((a, b) => b.call_count - a.call_count)
          .map((skill, idx) => ({
            skill,
            rank: idx + 1,
            call_count: skill.call_count,
            capability_score: skill.capabilities.length * 10,
            rank_score: skill.call_count * 2 + skill.capabilities.length * 5,
            trend: 'stable' as const,
          }))

  if (displayRankings.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-8">
        No ranking data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="space-y-1.5 pr-1 pb-4 pt-1">
        {displayRankings.map((item, idx) => (
          <div
            key={item.skill.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/spinning-skill-id', item.skill.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white cursor-grab hover:border-blue-200 hover:shadow-sm transition-all"
          >
            {/* Rank badge */}
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                idx === 0 && 'bg-amber-400 text-white',
                idx === 1 && 'bg-slate-300 text-slate-700',
                idx === 2 && 'bg-orange-300 text-white',
                idx > 2 && 'bg-slate-100 text-slate-500'
              )}
            >
              {item.rank}
            </div>

            {/* Name & stats */}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-slate-800 truncate">
                {item.skill.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-0.5 text-[9px] text-slate-400">
                  <Activity className="h-2.5 w-2.5" />
                  <span>{item.call_count}</span>
                </div>
                <div className="text-[9px] text-slate-400">
                  score: {item.rank_score}
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="flex-shrink-0">
              {item.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              {item.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
              {item.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-slate-300" />}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
