import { create } from 'zustand'
import type { Skill, SkillCluster, SkillRanking } from '@/types'

interface SkillState {
  skills: Skill[]
  clusters: SkillCluster[]
  rankings: SkillRanking[]
  loading: boolean
  searchQuery: string
  selectedCategory: string | null
  viewMode: 'list' | 'cluster' | 'ranking' | 'redundancy'

  setSkills: (skills: Skill[]) => void
  setClusters: (clusters: SkillCluster[]) => void
  setRankings: (rankings: SkillRanking[]) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (cat: string | null) => void
  setViewMode: (mode: 'list' | 'cluster' | 'ranking' | 'redundancy') => void

  filteredSkills: () => Skill[]
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  clusters: [],
  rankings: [],
  loading: false,
  searchQuery: '',
  selectedCategory: null,
  viewMode: 'list',

  setSkills: (skills) => set({ skills }),
  setClusters: (clusters) => set({ clusters }),
  setRankings: (rankings) => set({ rankings }),
  setLoading: (loading) => set({ loading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setViewMode: (viewMode) => set({ viewMode }),

  filteredSkills: () => {
    const { skills, searchQuery, selectedCategory } = get()
    return skills.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory =
        !selectedCategory ||
        s.category.includes(selectedCategory)
      return matchesSearch && matchesCategory
    })
  },
}))
