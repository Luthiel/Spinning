import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RedundancyPairTable } from './RedundancyPairTable'
import type { RedundancyPair } from '@/types'

const mockPairs: RedundancyPair[] = [
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
  {
    id: '2',
    skill_a_id: 's3',
    skill_b_id: 's4',
    skill_a_name: 'Image Resizer',
    skill_b_name: 'Photo Cropper',
    capability_overlap: 0.65,
    semantic_similarity: 0.6,
    severity: 'medium',
    recommended_action: 'keep_better',
    created_at: '2026-07-27T10:00:00Z',
  },
  {
    id: '3',
    skill_a_id: 's5',
    skill_b_id: 's6',
    skill_a_name: 'Email Sender',
    skill_b_name: 'Notification Dispatcher',
    capability_overlap: 0.3,
    semantic_similarity: 0.35,
    severity: 'low',
    recommended_action: 'keep_both',
    created_at: '2026-07-27T10:00:00Z',
  },
]

describe('RedundancyPairTable', () => {
  it('renders empty state when no pairs', () => {
    render(<RedundancyPairTable pairs={[]} />)
    expect(screen.getByText('No redundancy pairs found. Run detection to find redundancies.')).toBeInTheDocument()
  })

  it('renders all pairs by default', () => {
    render(<RedundancyPairTable pairs={mockPairs} />)
    expect(screen.getByText('Text Summarizer')).toBeInTheDocument()
    expect(screen.getByText('Content Compressor')).toBeInTheDocument()
    expect(screen.getByText('Image Resizer')).toBeInTheDocument()
    expect(screen.getByText('Email Sender')).toBeInTheDocument()
  })

  it('filters pairs by severity', () => {
    render(<RedundancyPairTable pairs={mockPairs} />)

    // Default shows all
    expect(screen.getByText('Text Summarizer')).toBeInTheDocument()

    // Click high filter
    fireEvent.click(screen.getByText('High (1)'))
    expect(screen.getByText('Text Summarizer')).toBeInTheDocument()
    expect(screen.queryByText('Image Resizer')).not.toBeInTheDocument()
    expect(screen.queryByText('Email Sender')).not.toBeInTheDocument()

    // Click medium filter
    fireEvent.click(screen.getByText('Medium (1)'))
    expect(screen.queryByText('Text Summarizer')).not.toBeInTheDocument()
    expect(screen.getByText('Image Resizer')).toBeInTheDocument()
    expect(screen.queryByText('Email Sender')).not.toBeInTheDocument()

    // Click low filter
    fireEvent.click(screen.getByText('Low (1)'))
    expect(screen.queryByText('Text Summarizer')).not.toBeInTheDocument()
    expect(screen.queryByText('Image Resizer')).not.toBeInTheDocument()
    expect(screen.getByText('Email Sender')).toBeInTheDocument()
  })

  it('displays correct overlap and similarity percentages', () => {
    render(<RedundancyPairTable pairs={mockPairs} />)
    expect(screen.getByText(/85%/)).toBeInTheDocument()
    expect(screen.getByText(/82%/)).toBeInTheDocument()
  })

  it('calls onAction when action button is clicked', async () => {
    const onAction = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10)))
    render(<RedundancyPairTable pairs={mockPairs} onAction={onAction} />)

    const buttons = screen.getAllByRole('button', { name: /Differentiate/i })
    expect(buttons.length).toBe(3)
    expect(buttons[0]).not.toBeDisabled()

    fireEvent.click(buttons[0])

    // The async handler should call onAction with the pair id and action
    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('1', 'differentiate')
    }, { timeout: 2000 })
  })

  it('shows loading skeleton when loading prop is true', () => {
    render(<RedundancyPairTable pairs={mockPairs} loading />)
    // Skeleton elements are divs with animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
