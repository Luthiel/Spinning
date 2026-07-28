import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RedundancyMapView } from './RedundancyMapView'
import { redundancyApi } from '@/services/api'
import type { RedundancyMap } from '@/types'

vi.mock('@/services/api', () => ({
  redundancyApi: {
    getMap: vi.fn(),
    detect: vi.fn(),
  },
}))

const mockMap: RedundancyMap = {
  nodes: [
    {
      id: 's1',
      name: 'Text Summarizer',
      health_level: 'healthy',
      category: ['nlp'],
      call_count: 120,
    },
    {
      id: 's2',
      name: 'Content Compressor',
      health_level: 'warning',
      category: ['nlp'],
      call_count: 80,
    },
  ],
  edges: [
    { source: 's1', target: 's2', similarity: 0.85, severity: 'high' },
  ],
  pairs: [
    {
      id: '1',
      skill_a_id: 's1',
      skill_b_id: 's2',
      skill_a_name: 'Text Summarizer',
      skill_b_name: 'Content Compressor',
      capability_overlap: 0.85,
      semantic_similarity: 0.82,
      severity: 'high',
      recommended_action: 'differentiate',
      created_at: '2026-07-27T10:00:00Z',
    },
  ],
  generated_at: '2026-07-27T10:00:00Z',
}

describe('RedundancyMapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no initial map', () => {
    render(<RedundancyMapView />)
    expect(screen.getByText('No redundancy data available')).toBeInTheDocument()
    expect(screen.getByText('Click Detect to analyze skills')).toBeInTheDocument()
  })

  it('renders with initial map data', () => {
    render(<RedundancyMapView initialMap={mockMap} />)
    expect(screen.getByText('2 nodes · 1 pairs')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Network/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Pairs/i })).toBeInTheDocument()
  })

  it('switches between network and pairs tabs', async () => {
    const user = userEvent.setup()
    render(<RedundancyMapView initialMap={mockMap} />)

    // Default to Network tab
    expect(screen.getByRole('tab', { name: /Network/i })).toHaveAttribute('data-state', 'active')

    // Switch to Pairs tab
    await user.click(screen.getByRole('tab', { name: /Pairs/i }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Pairs/i })).toHaveAttribute('data-state', 'active')
    })
    expect(screen.getByText('Text Summarizer')).toBeInTheDocument()
    expect(screen.getByText('Content Compressor')).toBeInTheDocument()
  })

  it('calls detect API when Detect button is clicked', async () => {
    vi.mocked(redundancyApi.detect).mockResolvedValue({
      pairs_found: 1,
      map: mockMap,
    })

    render(<RedundancyMapView />)
    fireEvent.click(screen.getByRole('button', { name: /Detect/i }))

    await waitFor(() => {
      expect(redundancyApi.detect).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('2 nodes · 1 pairs')).toBeInTheDocument()
    })
  })

  it('calls refresh API when Refresh button is clicked', async () => {
    vi.mocked(redundancyApi.getMap).mockResolvedValue(mockMap)

    render(<RedundancyMapView />)
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }))

    await waitFor(() => {
      expect(redundancyApi.getMap).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('2 nodes · 1 pairs')).toBeInTheDocument()
    })
  })

  it('shows error message when detect fails', async () => {
    vi.mocked(redundancyApi.detect).mockRejectedValue(new Error('Network error'))

    render(<RedundancyMapView />)
    fireEvent.click(screen.getByRole('button', { name: /Detect/i }))

    await waitFor(() => {
      expect(screen.getByText('Detection failed. Please try again.')).toBeInTheDocument()
    })
  })
})
