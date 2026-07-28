import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HealthHistoryDialog } from '../HealthHistoryDialog'
import { healthApi } from '@/services/api'
import { createMockHistoryResponse } from './mockData'

vi.mock('@/services/api', () => ({
  healthApi: {
    getHistory: vi.fn(),
  },
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('HealthHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with skill name', async () => {
    vi.mocked(healthApi.getHistory).mockResolvedValue(createMockHistoryResponse())
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Health History — Test Skill')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(healthApi.getHistory).mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    const loaders = document.querySelectorAll('.animate-pulse')
    expect(loaders.length).toBeGreaterThan(0)
  })

  it('shows error state on API failure', async () => {
    vi.mocked(healthApi.getHistory).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load health history data')).toBeInTheDocument()
    })
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('switches time range and refetches data', async () => {
    vi.mocked(healthApi.getHistory).mockResolvedValue(createMockHistoryResponse())
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Health History — Test Skill')).toBeInTheDocument()
    })

    const btn7d = screen.getByTestId('time-range-7d')
    fireEvent.click(btn7d)

    await waitFor(() => {
      expect(healthApi.getHistory).toHaveBeenCalledWith('skill-1', '7d')
    })
  })

  it('toggles dimension view', async () => {
    vi.mocked(healthApi.getHistory).mockResolvedValue(createMockHistoryResponse())
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Health History — Test Skill')).toBeInTheDocument()
    })

    const toggleBtn = screen.getByTestId('toggle-dimensions')
    fireEvent.click(toggleBtn)

    // Dialog should still be open after toggle
    expect(screen.getByText('Health History — Test Skill')).toBeInTheDocument()
  })

  it('displays summary stats', async () => {
    vi.mocked(healthApi.getHistory).mockResolvedValue(createMockHistoryResponse())
    renderWithProviders(<HealthHistoryDialog skillId="skill-1" skillName="Test Skill" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Avg Score')).toBeInTheDocument()
      expect(screen.getByText('81.8')).toBeInTheDocument()
      expect(screen.getByText('Best')).toBeInTheDocument()
      expect(screen.getByText('92.0')).toBeInTheDocument()
    })
  })
})
