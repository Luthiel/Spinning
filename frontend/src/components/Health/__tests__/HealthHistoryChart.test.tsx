import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HealthHistoryChart } from '../HealthHistoryChart'
import { createMockSnapshot } from './mockData'

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: ({ name }: { name?: string }) => <div data-testid={`line-${name || 'unknown'}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 500, height: 320 }}>{children}</div>
  ),
  ReferenceDot: () => <div data-testid="reference-dot" />,
}))

describe('HealthHistoryChart', () => {
  it('renders empty state when no snapshots', () => {
    render(<HealthHistoryChart snapshots={[]} showDimensions={false} />)
    expect(screen.getByText('No health history data available')).toBeInTheDocument()
  })

  it('renders chart with snapshots', () => {
    const snapshots = [
      createMockSnapshot({ id: 's1', health_score: 70, checked_at: '2026-07-20T10:00:00Z' }),
      createMockSnapshot({ id: 's2', health_score: 80, checked_at: '2026-07-21T10:00:00Z' }),
    ]
    render(<HealthHistoryChart snapshots={snapshots} showDimensions={false} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-Health Score')).toBeInTheDocument()
  })

  it('renders dimension lines when showDimensions is true', () => {
    const snapshots = [
      createMockSnapshot({
        id: 's1',
        health_score: 70,
        checked_at: '2026-07-20T10:00:00Z',
        dimensions: [
          { name: 'performance', score: 80, weight: 0.25 },
          { name: 'security', score: 60, weight: 0.25 },
        ],
      }),
      createMockSnapshot({
        id: 's2',
        health_score: 80,
        checked_at: '2026-07-21T10:00:00Z',
        dimensions: [
          { name: 'performance', score: 85, weight: 0.25 },
          { name: 'security', score: 65, weight: 0.25 },
        ],
      }),
    ]
    render(<HealthHistoryChart snapshots={snapshots} showDimensions={true} />)
    expect(screen.getByTestId('line-performance')).toBeInTheDocument()
    expect(screen.getByTestId('line-security')).toBeInTheDocument()
  })

  it('does not render dimension lines when showDimensions is false', () => {
    const snapshots = [
      createMockSnapshot({
        id: 's1',
        health_score: 70,
        checked_at: '2026-07-20T10:00:00Z',
        dimensions: [
          { name: 'performance', score: 80, weight: 0.25 },
        ],
      }),
    ]
    render(<HealthHistoryChart snapshots={snapshots} showDimensions={false} />)
    expect(screen.queryByTestId('line-performance')).not.toBeInTheDocument()
  })

  it('renders event reference dots for snapshots with events', () => {
    const snapshots = [
      createMockSnapshot({ id: 's1', health_score: 70, checked_at: '2026-07-20T10:00:00Z' }),
      createMockSnapshot({
        id: 's2',
        health_score: 80,
        checked_at: '2026-07-21T10:00:00Z',
        events: [{ id: 'ev-1', type: 'skill_update', description: 'Updated', timestamp: '2026-07-21T10:00:00Z' }],
      }),
    ]
    render(<HealthHistoryChart snapshots={snapshots} showDimensions={false} />)
    expect(screen.getAllByTestId('reference-dot').length).toBeGreaterThan(0)
  })
})
