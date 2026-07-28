import { create } from 'zustand'
import type { RouterConfig, RouterSimulationResult } from '@/types'
import { routerApi } from '@/services/api'

export const ROUTER_PRESETS = {
  strict: {
    name: 'strict',
    label: '严格',
    config: {
      token_budget: 2000,
      min_health_score: 80,
      max_skills: 5,
      dedup_threshold: 0.95,
    },
  },
  balanced: {
    name: 'balanced',
    label: '均衡',
    config: {
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    },
  },
  relaxed: {
    name: 'relaxed',
    label: '宽松',
    config: {
      token_budget: 10000,
      min_health_score: 30,
      max_skills: 30,
      dedup_threshold: 0.7,
    },
  },
} as const

export type PresetKey = keyof typeof ROUTER_PRESETS

interface RouterState {
  config: RouterConfig
  activePreset: PresetKey | null
  loading: boolean
  saving: boolean
  simulating: boolean
  simulationResult: RouterSimulationResult | null
  simulationError: string | null
  loadError: string | null

  setConfig: (config: RouterConfig) => void
  setActivePreset: (preset: PresetKey | null) => void
  applyPreset: (preset: PresetKey) => void
  updateField: <K extends keyof RouterConfig>(key: K, value: RouterConfig[K]) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<boolean>
  simulate: (prompt: string) => Promise<void>
  resetSimulation: () => void
}

const DEFAULT_CONFIG: RouterConfig = {
  token_budget: 5000,
  min_health_score: 60,
  max_skills: 15,
  dedup_threshold: 0.85,
}

export const useRouterStore = create<RouterState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  activePreset: 'balanced',
  loading: false,
  saving: false,
  simulating: false,
  simulationResult: null,
  simulationError: null,
  loadError: null,

  setConfig: (config) => set({ config, activePreset: null }),

  setActivePreset: (preset) => set({ activePreset: preset }),

  applyPreset: (preset) => {
    const p = ROUTER_PRESETS[preset]
    set({ config: { ...p.config }, activePreset: preset })
  },

  updateField: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
      activePreset: null,
    }))
  },

  loadConfig: async () => {
    set({ loading: true, loadError: null })
    try {
      const config = await routerApi.getConfig()
      set({ config, loading: false })
      // Try to match preset
      const matched = (Object.keys(ROUTER_PRESETS) as PresetKey[]).find((k) => {
        const p = ROUTER_PRESETS[k].config
        return (
          p.token_budget === config.token_budget &&
          p.min_health_score === config.min_health_score &&
          p.max_skills === config.max_skills &&
          p.dedup_threshold === config.dedup_threshold
        )
      })
      set({ activePreset: matched ?? null })
    } catch (error) {
      console.error('Failed to load router config:', error)
      set({ loadError: '加载配置失败，使用默认配置', loading: false })
    }
  },

  saveConfig: async () => {
    set({ saving: true })
    try {
      await routerApi.updateConfig(get().config)
      set({ saving: false })
      return true
    } catch (error) {
      console.error('Failed to save router config:', error)
      set({ saving: false })
      return false
    }
  },

  simulate: async (prompt) => {
    if (!prompt.trim()) {
      set({ simulationError: '请输入任务描述' })
      return
    }
    set({ simulating: true, simulationError: null, simulationResult: null })
    try {
      const result = await routerApi.simulate({ prompt })
      set({ simulationResult: result, simulating: false })
    } catch (error) {
      console.error('Simulation failed:', error)
      set({ simulationError: '模拟请求失败，请稍后重试', simulating: false })
    }
  },

  resetSimulation: () =>
    set({ simulationResult: null, simulationError: null }),
}))
