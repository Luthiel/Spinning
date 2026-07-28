import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartRouterPanel } from './SmartRouterPanel'
import { useRouterStore } from '@/store/routerStore'
import { routerApi } from '@/services/api'

vi.mock('@/services/api', () => ({
  routerApi: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    simulate: vi.fn(),
  },
}))

describe('SmartRouterPanel', () => {
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

  it('should render nothing when closed', () => {
    render(<SmartRouterPanel isOpen={false} onOpenChange={() => {}} />)
    expect(screen.queryByText('Smart Router')).not.toBeInTheDocument()
  })

  it('should render config panel when open', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Smart Router')).toBeInTheDocument()
    })

    expect(screen.getByText('配置面板')).toBeInTheDocument()
    expect(screen.getByText('模拟测试')).toBeInTheDocument()
  })

  it('should display preset buttons', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('严格')).toBeInTheDocument()
    })

    expect(screen.getByText('均衡')).toBeInTheDocument()
    expect(screen.getByText('宽松')).toBeInTheDocument()
  })

  it('should switch preset when clicked', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('严格')).toBeInTheDocument()
    })

    const strictButton = screen.getByText('严格').closest('button')
    expect(strictButton).not.toBeNull()
    await userEvent.click(strictButton!)

    await waitFor(() => {
      const state = useRouterStore.getState()
      expect(state.config.token_budget).toBe(2000)
      expect(state.config.min_health_score).toBe(80)
      expect(state.activePreset).toBe('strict')
    })
  })

  it('should update slider values', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('slider', { name: /token budget/i })).toBeInTheDocument()
    })

    const tokenSlider = screen.getByRole('slider', { name: /token budget/i })
    fireEvent.change(tokenSlider, { target: { value: '3000' } })

    await waitFor(() => {
      expect(useRouterStore.getState().config.token_budget).toBe(3000)
    })
  })

  it('should call save config when save button clicked', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })
    vi.mocked(routerApi.updateConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('保存配置'))

    await waitFor(() => {
      expect(routerApi.updateConfig).toHaveBeenCalledTimes(1)
    })
  })

  it('should switch to simulate tab and run simulation', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })
    vi.mocked(routerApi.simulate).mockResolvedValue({
      selected: [
        { skill_id: '1', name: 'Skill A', grade: 'A', score: 95, token_cost: 500, selected: true },
      ],
      filtered: [],
      total_token_cost: 500,
      budget_usage_percent: 10,
    })

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('模拟测试')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('模拟测试'))

    const textarea = screen.getByPlaceholderText('例如：分析用户评论的情感倾向并生成总结报告...')
    await userEvent.type(textarea, '测试任务描述')

    await userEvent.click(screen.getByText('模拟'))

    await waitFor(() => {
      expect(routerApi.simulate).toHaveBeenCalledWith({ prompt: '测试任务描述' })
    })

    await waitFor(() => {
      expect(screen.getByText('Skill A')).toBeInTheDocument()
    })
  })

  it('should show simulation error when API fails', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })
    vi.mocked(routerApi.simulate).mockRejectedValue(new Error('API error'))

    render(<SmartRouterPanel isOpen={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('模拟测试')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('模拟测试'))

    const textarea = screen.getByPlaceholderText('例如：分析用户评论的情感倾向并生成总结报告...')
    await userEvent.type(textarea, '测试任务')

    await userEvent.click(screen.getByText('模拟'))

    await waitFor(() => {
      expect(screen.getByText('模拟请求失败，请稍后重试')).toBeInTheDocument()
    })
  })

  it('should close when X button clicked', async () => {
    vi.mocked(routerApi.getConfig).mockResolvedValue({
      token_budget: 5000,
      min_health_score: 60,
      max_skills: 15,
      dedup_threshold: 0.85,
    })

    const onOpenChange = vi.fn()
    render(<SmartRouterPanel isOpen={true} onOpenChange={onOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('✕')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('✕'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
