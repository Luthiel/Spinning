import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthIndicator } from './HealthIndicator'
import type { HealthGrade } from '@/types'

describe('HealthIndicator', () => {
  const grades: HealthGrade[] = ['A', 'B', 'C', 'D', 'F', 'untested']

  grades.forEach((grade) => {
    it(`renders dot for grade ${grade}`, () => {
      render(<HealthIndicator grade={grade} score={grade === 'untested' ? 0 : 75} />)
      const dot = screen.getByTestId('health-indicator-dot')
      expect(dot).toBeInTheDocument()
      expect(dot).toHaveAttribute('data-grade', grade)
    })
  })

  it('shows score when showScore is true', () => {
    render(<HealthIndicator grade="A" score={92} showScore />)
    expect(screen.getByTestId('health-indicator-score')).toHaveTextContent('92')
  })

  it('hides score when showScore is false', () => {
    render(<HealthIndicator grade="A" score={92} />)
    expect(screen.queryByTestId('health-indicator-score')).not.toBeInTheDocument()
  })

  it('shows dash for untested score', () => {
    render(<HealthIndicator grade="untested" score={0} showScore />)
    expect(screen.getByTestId('health-indicator-score')).toHaveTextContent('-')
  })
})