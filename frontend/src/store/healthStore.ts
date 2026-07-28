import { create } from 'zustand'
import type { SkillHealth, HealthOverview, GradeDistribution } from '@/types'

interface HealthState {
  overview: HealthOverview | null
  distribution: GradeDistribution[]
  skills: SkillHealth[]
  loading: boolean
  error: string | null
  selectedSkillId: string | null

  setOverview: (overview: HealthOverview) => void
  setDistribution: (distribution: GradeDistribution[]) => void
  setSkills: (skills: SkillHealth[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedSkillId: (id: string | null) => void
}

export const useHealthStore = create<HealthState>((set) => ({
  overview: null,
  distribution: [],
  skills: [],
  loading: false,
  error: null,
  selectedSkillId: null,

  setOverview: (overview) => set({ overview }),
  setDistribution: (distribution) => set({ distribution }),
  setSkills: (skills) => set({ skills }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
}))