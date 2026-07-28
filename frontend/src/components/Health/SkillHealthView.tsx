import { HeartPulse } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkillHealthCard } from './SkillHealthCard'
import { useSkillStore } from '@/store/skillStore'

export function SkillHealthView() {
  const { skills, loading } = useSkillStore()

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="space-y-2 pr-1 pb-4 pt-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
          ))
        ) : skills.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8 flex flex-col items-center gap-2">
            <HeartPulse className="h-8 w-8 text-slate-200" />
            <span>No skills available for health monitoring</span>
          </div>
        ) : (
          skills.map((skill) => <SkillHealthCard key={skill.id} skill={skill} />)
        )}
      </div>
    </ScrollArea>
  )
}
