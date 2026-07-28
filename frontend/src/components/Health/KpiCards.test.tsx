import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCards } from './KpiCards'
import type { HealthOverview } from '@/types'

const mockOverview: HealthOverview = {
  total_skills: 24,
  avg_health_score: 72,
  redundant_pairs: 3,
  critical_issues: 5,
  long_unused_count: 2,
}

describe('KpiCards', () => {
  it('renders all 5 KPI cards with correct values', () => {
    render(<KpiCards overview={mockOverview} />)

    expect(screen.getByTestId('kpi-total_skills')).toHaveTextContent('24')
    expect(screen.getByTestId('kpi-avg_health_score')).toHaveTextContent('72')
    expect(screen.getByTestId('kpi-redundant_pairs')).toHaveTextContent('3')
    expect(screen.getByTestId('kpi-critical_issues')).toHaveTextContent('5')
    expect(screen.getByTestId('kpi-long_unused_count')).toHaveTextContent('2')
  })

  it('shows loading state', () => {
    render(<KpiCards overview={mockOverview} loading />)
    expect(screen.getByTestId('kpi-cards')).toBeInTheDocument()
  })

  it('renders with null overview', () => {
    render(<KpiCards overview={null} />)
    expect(screen.getByTestId('kpi-total_skills')).toHaveTextContent('0')
  })
})