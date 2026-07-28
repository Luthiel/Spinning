import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GradeDistribution } from './GradeDistribution'
import type { GradeDistribution as GradeDistType } from '@/types'

const mockDistribution: GradeDistType[] = [
  { grade: 'A', count: 5, percentage: 25 },
  { grade: 'B', count: 8, percentage: 40 },
  { grade: 'C', count: 4, percentage: 20 },
  { grade: 'D', count: 2, percentage: 10 },
  { grade: 'F', count: 1, percentage: 5 },
  { grade: 'untested', count: 0, percentage: 0 },
]

describe('GradeDistribution', () => {
  it('renders all grade bars', () => {
    render(<GradeDistribution distribution={mockDistribution} />)

    expect(screen.getByTestId('grade-distribution')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-A')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-B')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-C')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-D')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-F')).toBeInTheDocument()
    expect(screen.getByTestId('grade-bar-untested')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<GradeDistribution distribution={mockDistribution} loading />)
    expect(screen.getByTestId('grade-distribution')).toBeInTheDocument()
  })
})