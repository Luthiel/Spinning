import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderType, ExternalSkillSource, SyncResult } from '@/types'
import { skillsApi } from '@/services/api'

interface ProviderState {
  selectedProvider: ProviderType
  openCodeCLIPath: string
  openAIBaseURL: string
  openAIModel: string
  defaultFallback: ProviderType
  autoSyncSkills: boolean
  syncIntervalMins: number
  externalSources: ExternalSkillSource[]
  isSyncing: boolean
  lastSyncResult: SyncResult | null

  setSelectedProvider: (provider: ProviderType) => void
  setOpenCodeCLIPath: (path: string) => void
  setOpenAIBaseURL: (url: string) => void
  setOpenAIModel: (model: string) => void
  setDefaultFallback: (fallback: ProviderType) => void
  setAutoSyncSkills: (autoSync: boolean) => void
  setSyncIntervalMins: (interval: number) => void
  loadExternalSources: () => Promise<void>
  syncSkills: () => Promise<SyncResult>
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      selectedProvider: 'openai',
      openCodeCLIPath: 'opencode',
      openAIBaseURL: 'https://api.openai.com/v1',
      openAIModel: 'gpt-4o-mini',
      defaultFallback: 'mock',
      autoSyncSkills: true,
      syncIntervalMins: 60,
      externalSources: [],
      isSyncing: false,
      lastSyncResult: null,

      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setOpenCodeCLIPath: (path) => set({ openCodeCLIPath: path }),
      setOpenAIBaseURL: (url) => set({ openAIBaseURL: url }),
      setOpenAIModel: (model) => set({ openAIModel: model }),
      setDefaultFallback: (fallback) => set({ defaultFallback: fallback }),
      setAutoSyncSkills: (autoSync) => set({ autoSyncSkills: autoSync }),
      setSyncIntervalMins: (interval) => set({ syncIntervalMins: interval }),

      loadExternalSources: async () => {
        try {
          const sources = await skillsApi.listSources()
          set({ externalSources: sources })
        } catch (error) {
          console.error('Failed to load external sources:', error)
        }
      },

      syncSkills: async () => {
        set({ isSyncing: true })
        try {
          const result = await skillsApi.sync()
          set({ lastSyncResult: result, isSyncing: false })
          return result
        } catch (error) {
          set({ isSyncing: false })
          throw error
        }
      },
    }),
    {
      name: 'spinning-provider-settings',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        openCodeCLIPath: state.openCodeCLIPath,
        openAIBaseURL: state.openAIBaseURL,
        openAIModel: state.openAIModel,
        defaultFallback: state.defaultFallback,
        autoSyncSkills: state.autoSyncSkills,
        syncIntervalMins: state.syncIntervalMins,
      }),
    }
  )
)
