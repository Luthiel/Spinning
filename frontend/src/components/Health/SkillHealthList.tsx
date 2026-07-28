import { useState } from 'react'
import { ArrowUpDown, FileText, Copy, ChevronUp, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HealthIndicator } from './HealthIndicator'
import { cn } from '@/lib/utils'
import type { SkillHealth, HealthGrade } from '@/types'

interface SkillHealthListProps {
  skills: SkillHealth[]
  loading?: boolean
  onViewReport?: (skillId: string) => void
  onViewRedundancy?: (skillId: string) => void
}

const GRADE_BADGE: Record<HealthGrade, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-emerald-50 text-emerald-600',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
  untested: 'bg-slate-100 text-slate-500',
}

export function SkillHealthList({
  skills,
  loading,
  onViewReport,
  onViewRedundancy,
}: SkillHealthListProps) {
  const [sortDesc, setSortDesc] = useState(true)

  const sorted = [...skills].sort((a, b) =>
    sortDesc ? b.score - a.score : a.score - b.score
  )

  return (
    <Card className="border-slate-200 flex-1 min-h-0" data-testid="skill-health-list">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle>Skill 健康列表</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSortDesc((d) => !d)}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          健康分
          {sortDesc ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronUp className="w-3 h-3 ml-0.5" />}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-1.5 pr-2">
              {sorted.map((skill) => (
                <div
                  key={skill.skill_id}
                  className={cn(
                    'group flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-white',
                    'hover:border-slate-300 hover:shadow-sm transition-all'
                  )}
                  data-testid={`skill-row-${skill.skill_id}`}
                >
                  <HealthIndicator grade={skill.grade} score={skill.score} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {skill.skill_name}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                          GRADE_BADGE[skill.grade]
                        )}
                      >
                        {skill.grade === 'untested' ? '未测' : skill.grade}
                      </span>
                    </div>
                    {skill.issues.length > 0 && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {skill.issues.slice(0, 2).map((i) => i.message).join('；')}
                        {skill.issues.length > 2 && ` 等 ${skill.issues.length} 个问题`}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-shrink-0">
                    <span className="font-medium">{skill.call_count} calls</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => onViewReport?.(skill.skill_id)}
                      title="查看报告"
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => onViewRedundancy?.(skill.skill_id)}
                      title="查看冗余"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {sorted.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-8">暂无 Skill 数据</div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}