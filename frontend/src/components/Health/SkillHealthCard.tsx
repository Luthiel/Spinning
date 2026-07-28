import { useState } from 'react'
import { History, Activity, Shield, Zap, FileCode, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HealthHistoryDialog } from './HealthHistoryDialog'
import { cn } from '@/lib/utils'
import type { Skill, HealthGrade, HealthDimension } from '@/types'

export interface SkillHealthData {
  skill_id: string
  health_score: number
  grade: HealthGrade
  dimensions: HealthDimension[]
  last_checked_at: string
}

interface SkillHealthCardProps {
  skill: Skill
  healthData?: SkillHealthData
}

const GRADE_CONFIG: Record<HealthGrade, { color: string; bg: string; label: string }> = {
  A: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Excellent' },
  B: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Good' },
  C: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Fair' },
  D: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Poor' },
  F: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Critical' },
}

function getHealthIcon(dimensionName: string) {
  const name = dimensionName.toLowerCase()
  if (name.includes('performance') || name.includes('speed')) return <Zap className="h-3 w-3" />
  if (name.includes('security') || name.includes('safe')) return <Shield className="h-3 w-3" />
  if (name.includes('code') || name.includes('quality')) return <FileCode className="h-3 w-3" />
  if (name.includes('usage') || name.includes('adoption')) return <Users className="h-3 w-3" />
  return <Activity className="h-3 w-3" />
}

function generateMockHealthData(skill: Skill): SkillHealthData {
  // Deterministic mock based on skill id
  const seed = skill.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const score = 55 + (seed % 40)
  let grade: HealthGrade = 'C'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else grade = 'F'

  return {
    skill_id: skill.id,
    health_score: score,
    grade,
    dimensions: [
      { name: 'performance', score: Math.min(100, score + (seed % 15) - 7), weight: 0.25 },
      { name: 'security', score: Math.min(100, score + ((seed * 2) % 15) - 7), weight: 0.25 },
      { name: 'code_quality', score: Math.min(100, score + ((seed * 3) % 15) - 7), weight: 0.25 },
      { name: 'adoption', score: Math.min(100, score + ((seed * 4) % 15) - 7), weight: 0.25 },
    ],
    last_checked_at: new Date(Date.now() - (seed % 86400000)).toISOString(),
  }
}

export function SkillHealthCard({ skill, healthData }: SkillHealthCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const data = healthData || generateMockHealthData(skill)
  const config = GRADE_CONFIG[data.grade]

  return (
    <>
      <Card className={cn('border transition-all hover:shadow-sm', config.bg)}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* Color indicator */}
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0',
                  'bg-gradient-to-br',
                  skill.category[0] === 'nlp' && 'from-violet-500 to-purple-600',
                  skill.category[0] === 'data' && 'from-blue-500 to-cyan-600',
                  skill.category[0] === 'image' && 'from-pink-500 to-rose-600',
                  skill.category[0] === 'code' && 'from-emerald-500 to-teal-600',
                  skill.category[0] === 'search' && 'from-amber-500 to-orange-600',
                  !['nlp','data','image','code','search'].includes(skill.category[0]||'') && 'from-slate-600 to-slate-700'
                )}
              >
                {skill.icon || skill.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{skill.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-xs font-bold', config.color)}>
                    {data.health_score}
                  </span>
                  <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium bg-white/80', config.color)}>
                    {data.grade}
                  </span>
                  <span className="text-[10px] text-slate-400">{config.label}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 text-slate-500 hover:text-blue-600"
              onClick={() => setDialogOpen(true)}
              data-testid={`view-history-${skill.id}`}
            >
              <History className="h-3 w-3 mr-1" />
              History
            </Button>
          </div>

          {/* Dimension bars */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
            {data.dimensions.map((dim) => (
              <div key={dim.name} className="flex items-center gap-1.5">
                <span className="text-slate-400">{getHealthIcon(dim.name)}</span>
                <span className="text-[10px] text-slate-500 capitalize flex-1 truncate">{dim.name.replace(/_/g, ' ')}</span>
                <div className="w-12 h-1.5 bg-white/60 rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      dim.score >= 80 ? 'bg-emerald-400' :
                      dim.score >= 60 ? 'bg-amber-400' :
                      'bg-red-400'
                    )}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-600 w-5 text-right">{dim.score}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <HealthHistoryDialog
        skillId={skill.id}
        skillName={skill.name}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
