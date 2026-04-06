import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useSkillStore } from '@/store/skillStore'
import { cn } from '@/lib/utils'

const CLUSTER_COLORS = [
  { bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400', text: 'text-violet-700' },
  { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400', text: 'text-blue-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700' },
  { bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-400', text: 'text-pink-700' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-400', text: 'text-cyan-700' },
]

export function SkillClusterView() {
  const { clusters, skills } = useSkillStore()
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))

  // Fallback: group skills by first category if no clusters from backend
  const displayClusters = clusters.length > 0
    ? clusters
    : buildFallbackClusters(skills)

  if (displayClusters.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-8">
        No cluster data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="space-y-2 pr-1 pb-4 pt-1">
        {displayClusters.map((cluster, idx) => {
          const colors = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]
          const isExpanded = expanded.has(cluster.id)

          return (
            <div
              key={cluster.id}
              className={cn('rounded-lg border', colors.border, colors.bg)}
            >
              {/* Cluster header */}
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2"
                onClick={() => {
                  setExpanded((prev) => {
                    const next = new Set(prev)
                    if (next.has(cluster.id)) next.delete(cluster.id)
                    else next.add(cluster.id)
                    return next
                  })
                }}
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                <span className={cn('text-xs font-semibold flex-1 text-left truncate', colors.text)}>
                  {cluster.label}
                </span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  {cluster.skills.length}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className={cn('h-3 w-3', colors.text)} />
                ) : (
                  <ChevronRight className={cn('h-3 w-3', colors.text)} />
                )}
              </button>

              {/* Skill list */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {cluster.skills.map((skill) => (
                    <div
                      key={skill.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/spinning-skill-id', skill.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white border border-slate-100 cursor-grab hover:border-blue-200 transition-colors"
                    >
                      <span className="text-[10px] font-semibold text-slate-700 flex-1 truncate">
                        {skill.name}
                      </span>
                      <span className="text-[9px] text-slate-400">{skill.call_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function buildFallbackClusters(skills: ReturnType<typeof useSkillStore.getState>['skills']) {
  const groups: Record<string, typeof skills> = {}
  skills.forEach((s) => {
    const key = s.category[0] || 'other'
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })

  return Object.entries(groups).map(([label, groupSkills], idx) => ({
    id: idx,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    description: `${label} skills`,
    skills: groupSkills,
    color: '#6366f1',
    total_calls: groupSkills.reduce((sum, s) => sum + s.call_count, 0),
    avg_rank_score: 0,
  }))
}
