import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouterStore, ROUTER_PRESETS } from './routerStore'
import { routerApi } from '@/services/api'
import type { RouterConfig, RouterSimulationResult } from '@/types'

vi.mock('@/services/api', () => ({
  routerApi: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    simulate: vi.fn(),
  },
}))

describe('routerStore', () => {
  beforeEach(() => {
    useRouterStore.setState({
      config: {
        token_budget: 5000,
        min_health_score: 60,
        max_skills: 15,
        dedup_threshold: 0.85,
      },
      activePreset: 'balanced',
      loading: false,
      saving: false,
      simulating: false,
      simulationResult: null,
      simulationError: null,
      loadError: null,
    })
    vi.clearAllMocks()
  })

  it('should apply strict preset', () => {
    useRouterStore.getState().applyPreset('strict')
    const state = useRouterStore.getState()
    expect(state.config).toEqual(ROUTER_PRESETS.strict.config)
    expect(state.activePreset).toBe('strict')
  })

  it('should apply relaxed preset', () => {
    useRouterStore.getState().applyPreset('relaxed')
    const state = useRouterStore.getState()
    expect(state.config).toEqual(ROUTER_PRESETS.relaxed.config)
    expect(state.activePreset).toBe('relaxed')
  })

  it('should clear active preset when config is manually changed', () => {
    useRouterStore.getState().applyPreset('balanced')
    expect(useRouterStore.getState().activePreset).toBe('balanced')

    useRouterStore.getState().updateField('token_budget', 9999)
    expect(useRouterStore.getState().activePreset).toBeNull()
  })

  it('should load config from API and match preset', async () => {
    const mockConfig: RouterConfig = {
      token_budget: 2000,
      min_health_score: 80,
      max_skills: 5,
      dedup_threshold: 0.95,
    }
    vi.mocked(routerApi.getConfig).mockResolvedValue(mockConfig)

    await useRouterStore.getState().loadConfig()

    const state = useRouterStore.getState()
    expect(state.config).toEqual(mockConfig)
    expect(state.activePreset).toBe('strict')
    expect(state.loading).toBe(false)
  })

  it('should handle load config error gracefully', async () => {
    vi.mocked(routerApi.getConfig).mockRejectedValue(new Error('Network error'))

    await useRouterStore.getState().loadConfig()

    const state = useRouterStore.getState()
    expect(state.loadError).toBe('加载配置失败，使用默认配置')
    expect(state.loading).toBe(false)
  })

  it('should save config to API', async () => {
    vi.mocked(routerApi.updateConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    const result = await useRouterStore.getState().saveConfig()

    expect(result).toBe(true)
    expect(routerApi.updateConfig).toHaveBeenCalledWith(useRouterStore.getState().config)
    expect(useRouterStore.getState().saving).toBe(false)
  })

  it('should handle save config error', async () => {
    vi.mocked(routerApi.updateConfig).mockRejectedValue(new Error('Save failed'))

    const result = await useRouterStore.getState().saveConfig()

    expect(result).toBe(false)
    expect(useRouterStore.getState().saving).toBe(false)
  })

  it('should simulate and store result', async () => {
    const mockResult: RouterSimulationResult = {
      selected: [
        { skill_id: '1', name: 'Skill A', grade: 'A', score: 95, token_cost: 500, selected: true },
      ],
      filtered: [
        { skill_id: '2', name: 'Skill B', grade: 'B', score: 40, token_cost: 300, selected: false, reason: '健康分不足' },
      ],
      total_token_cost: 500,
      budget_usage_percent: 10,
    }
    vi.mocked(routerApi.simulate).mockResolvedValue(mockResult)

    await useRouterStore.getState().simulate('测试任务')

    const state = useRouterStore.getState()
    expect(state.simulationResult).toEqual(mockResult)
    expect(state.simulating).toBe(false)
    expect(state.simulationError).toBeNull()
  })

  it('should reject empty simulation prompt', async () => {
    await useRouterStore.getState().simulate('   ')

    const state = useRouterStore.getState()
    expect(state.simulationError).toBe('请输入任务描述')
    expect(state.simulating).toBe(false)
  })

  it('should handle simulation API error', async () => {
    vi.mocked(routerApi.simulate).mockRejectedValue(new Error('API error'))

    await useRouterStore.getState().simulate('测试任务')

    const state = useRouterStore.getState()
    expect(state.simulationError).toBe('模拟请求失败，请稍后重试')
    expect(state.simulating).toBe(false)
  })

  it('should reset simulation state', () => {
    useRouterStore.setState({
      simulationResult: {
        selected: [],
        filtered: [],
        total_token_cost: 0,
        budget_usage_percent: 0,
      },
      simulationError: 'some error',
    })

    useRouterStore.getState().resetSimulation()

    const state = useRouterStore.getState()
    expect(state.simulationResult).toBeNull()
    expect(state.simulationError).toBeNull()
  })
})
