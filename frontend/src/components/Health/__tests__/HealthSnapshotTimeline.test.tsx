import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HealthSnapshotTimeline } from '../HealthSnapshotTimeline'
import { createMockSnapshot } from './mockData'

describe('HealthSnapshotTimeline', () => {
  it('renders empty state when no snapshots', () => {
    render(<HealthSnapshotTimeline snapshots={[]} />)
    expect(screen.getByText('No snapshot data available')).toBeInTheDocument()
  })

  it('renders snapshots in reverse chronological order', () => {
    const snapshots = [
      createMockSnapshot({ id: 's1', health_score: 70, checked_at: '2026-07-20T10:00:00Z' }),
      createMockSnapshot({ id: 's2', health_score: 85, checked_at: '2026-07-22T10:00:00Z' }),
      createMockSnapshot({ id: 's3', health_score: 90, checked_at: '2026-07-24T10:00:00Z' }),
    ]
    render(<HealthSnapshotTimeline snapshots={snapshots} />)
    const items = screen.getAllByTestId('health-snapshot-item')
    expect(items).toHaveLength(3)
    // Most recent first
    expect(within(items[0]).getByText('Score: 90')).toBeInTheDocument()
    expect(within(items[1]).getByText('Score: 85')).toBeInTheDocument()
    expect(within(items[2]).getByText('Score: 70')).toBeInTheDocument()
  })

  it('displays grade badge for each snapshot', () => {
    const snapshots = [
      createMockSnapshot({ id: 's1', health_score: 92, grade: 'A' }),
    ]
    render(<HealthSnapshotTimeline snapshots={snapshots} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows score change from previous snapshot', () => {
    const snapshots = [
      createMockSnapshot({ id: 's1', health_score: 85, checked_at: '2026-07-22T10:00:00Z' }),
      createMockSnapshot({ id: 's2', health_score: 70, checked_at: '2026-07-20T10:00:00Z' }),
    ]
    render(<HealthSnapshotTimeline snapshots={snapshots} />)
    const items = screen.getAllByTestId('health-snapshot-item')
    // First item (85) compared to previous (70) = +15
    expect(within(items[0]).getByText('+15 pts')).toBeInTheDocument()
  })

  it('renders events when present', () => {
    const snapshots = [
      createMockSnapshot({
        id: 's1',
        health_score: 85,
        events: [
          { id: 'ev-1', type: 'skill_update', description: 'Updated schema', timestamp: '2026-07-22T10:00:00Z' },
        ],
      }),
    ]
    render(<HealthSnapshotTimeline snapshots={snapshots} />)
    expect(screen.getByText('skill update')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Updated schema'))).toBeInTheDocument()
  })

  it('renders dimension details', () => {
    const snapshots = [
      createMockSnapshot({
        id: 's1',
        dimensions: [
          { name: 'performance', score: 90, weight: 0.25 },
          { name: 'security', score: 80, weight: 0.25 },
        ],
      }),
    ]
    render(<HealthSnapshotTimeline snapshots={snapshots} />)
    expect(screen.getByText('performance:')).toBeInTheDocument()
    expect(screen.getByText('security:')).toBeInTheDocument()
  })
})
