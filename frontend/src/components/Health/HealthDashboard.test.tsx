import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HealthDashboard } from './HealthDashboard'

describe('HealthDashboard', () => {
  it('renders dashboard with header', async () => {
    render(<HealthDashboard />)

    expect(screen.getByTestId('health-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Health Dashboard')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument()
    })
  })

  it('renders grade distribution', async () => {
    render(<HealthDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('grade-distribution')).toBeInTheDocument()
    })
  })

  it('renders skill health list', async () => {
    render(<HealthDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('skill-health-list')).toBeInTheDocument()
    })
  })
})