import { useEffect, useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { healthApi } from '@/services/api'
import { useHealthStore } from '@/store/healthStore'
import { KpiCards } from './KpiCards'
import { GradeDistribution } from './GradeDistribution'
import { SkillHealthList } from './SkillHealthList'
import { HealthRadarCard } from './HealthRadarCard'

export function HealthDashboard() {
  const {
    overview,
    distribution,
    skills,
    loading,
    setOverview,
    setDistribution,
    setSkills,
    setLoading,
    selectedSkillId,
    setSelectedSkillId,
  } = useHealthStore()

  const [selectedHealth, setSelectedHealth] = useState(useHealthStore.getState().skills.find((s) => s.skill_id === selectedSkillId) || null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSkillId) {
      const found = skills.find((s) => s.skill_id === selectedSkillId)
      if (found) {
        setSelectedHealth(found)
      } else {
        healthApi.get(selectedSkillId).then((h) => setSelectedHealth(h))
      }
    } else {
      setSelectedHealth(null)
    }
  }, [selectedSkillId, skills])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ov, dist, list] = await Promise.all([
        healthApi.overview(),
        healthApi.distribution(),
        healthApi.list(),
      ])
      setOverview(ov)
      setDistribution(dist)
      setSkills(list)
    } catch (e) {
      console.error('Failed to load health data', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="health-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-slate-800">Health Dashboard</h2>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Activity className="w-3 h-3" />
          刷新
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* KPI Cards */}
        <KpiCards overview={overview} loading={loading} />

        {/* Middle section: Grade Distribution + Radar Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GradeDistribution distribution={distribution} loading={loading} />
          <HealthRadarCard
            health={selectedHealth}
            loading={loading && !selectedHealth}
            onRecheck={(id) => {
              console.log('Recheck skill', id)
            }}
            onViewHistory={(id) => {
              console.log('View history', id)
            }}
          />
        </div>

        {/* Skill List */}
        <SkillHealthList
          skills={skills}
          loading={loading}
          onViewReport={(id) => setSelectedSkillId(id)}
          onViewRedundancy={(id) => console.log('View redundancy', id)}
        />
      </div>
    </div>
  )
}