import { useEffect } from 'react'
import { Search, RefreshCw, BarChart2, Layers, List, HeartPulse } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSkillStore } from '@/store/skillStore'
import { skillsApi } from '@/services/api'
import { SkillClusterView } from './SkillClusterView'
import { SkillRankingView } from './SkillRankingView'
import { SkillHealthView } from '@/components/Health/SkillHealthView'
import { cn } from '@/lib/utils'
import type { Skill } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  nlp: 'bg-violet-100 text-violet-700',
  data: 'bg-blue-100 text-blue-700',
  image: 'bg-pink-100 text-pink-700',
  code: 'bg-emerald-100 text-emerald-700',
  search: 'bg-amber-100 text-amber-700',
  ai: 'bg-purple-100 text-purple-700',
  transform: 'bg-cyan-100 text-cyan-700',
  notify: 'bg-orange-100 text-orange-700',
}

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] || 'bg-slate-100 text-slate-600'
}

function SkillCard({ skill }: { skill: Skill }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/spinning-skill-id', skill.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'group p-3 rounded-lg border border-slate-200 bg-white cursor-grab active:cursor-grabbing',
        'hover:border-blue-300 hover:shadow-sm transition-all duration-150',
        skill.status === 'deprecated' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800 truncate">{skill.name}</span>
            {skill.status === 'deprecated' && (
              <Badge variant="warning" className="text-[9px] px-1 py-0">deprecated</Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{skill.description}</p>
        </div>
      </div>

      {/* Tags & stats */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1 flex-wrap">
          {skill.category.slice(0, 2).map((c) => (
            <span key={c} className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', getCategoryColor(c))}>
              {c}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="font-medium">{skill.call_count}</span>
          <span>calls</span>
        </div>
      </div>
    </div>
  )
}

export function SkillPanel() {
  const {
    searchQuery, setSearchQuery, setSkills, setClusters, setRankings,
    setLoading, loading, filteredSkills, viewMode, setViewMode,
    selectedCategory, setSelectedCategory, skills,
  } = useSkillStore()

  useEffect(() => {
    loadSkills()
    loadClustersAndRankings()
  }, [])

  const loadSkills = async () => {
    setLoading(true)
    try {
      const data = await skillsApi.list()
      setSkills(data)
    } catch (e) {
      console.error('Failed to load skills', e)
    } finally {
      setLoading(false)
    }
  }

  const loadClustersAndRankings = async () => {
    try {
      const [clusters, rankings] = await Promise.all([
        skillsApi.clusters(),
        skillsApi.rankings(),
      ])
      setClusters(clusters)
      setRankings(rankings)
    } catch (e) {
      console.error('Failed to load clusters/rankings', e)
    }
  }

  // Collect all unique categories
  const categories = Array.from(new Set(skills.flatMap((s) => s.category))).sort()
  const filtered = filteredSkills()

  return (
    <div className="w-64 flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-800">Skills</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={loadSkills}
                disabled={loading}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh skills</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* View mode tabs */}
      <div className="px-3 pt-2">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="w-full h-7">
            <TabsTrigger value="list" className="flex-1 text-[11px] h-5">
              <List className="h-3 w-3 mr-1" />
              List
            </TabsTrigger>
            <TabsTrigger value="cluster" className="flex-1 text-[11px] h-5">
              <Layers className="h-3 w-3 mr-1" />
              Cluster
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1 text-[11px] h-5">
              <BarChart2 className="h-3 w-3 mr-1" />
              Rank
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 text-[11px] h-5">
              <HeartPulse className="h-3 w-3 mr-1" />
              Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {/* Category filter */}
            <div className="flex gap-1 flex-wrap py-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors',
                  !selectedCategory
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors capitalize',
                    selectedCategory === c
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-1.5 pr-1 pb-4">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">
                    No skills found
                  </div>
                ) : (
                  filtered.map((skill) => <SkillCard key={skill.id} skill={skill} />)
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cluster">
            <SkillClusterView />
          </TabsContent>

          <TabsContent value="ranking">
            <SkillRankingView />
          </TabsContent>

          <TabsContent value="health">
            <SkillHealthView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
