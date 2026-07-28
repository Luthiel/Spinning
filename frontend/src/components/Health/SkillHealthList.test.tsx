import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillHealthList } from './SkillHealthList'
import type { SkillHealth } from '@/types'

const mockSkills: SkillHealth[] = [
  {
    skill_id: 's1',
    skill_name: 'Skill A',
    score: 92,
    grade: 'A',
    dimensions: [],
    issues: [],
    call_count: 100,
    checked_at: '2026-07-27T08:00:00Z',
  },
  {
    skill_id: 's2',
    skill_name: 'Skill B',
    score: 45,
    grade: 'D',
    dimensions: [],
    issues: [
      { id: 'i1', type: 'desc', severity: 'critical', message: 'Missing schema' },
    ],
    call_count: 10,
    checked_at: '2026-07-27T08:00:00Z',
  },
]

describe('SkillHealthList', () => {
  it('renders skill rows sorted by score desc', () => {
    render(<SkillHealthList skills={mockSkills} />)

    const rows = screen.getAllByTestId(/skill-row-/)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('data-testid', 'skill-row-s1')
    expect(rows[1]).toHaveAttribute('data-testid', 'skill-row-s2')
  })

  it('calls onViewReport when report button clicked', () => {
    const onViewReport = vi.fn()
    render(<SkillHealthList skills={mockSkills} onViewReport={onViewReport} />)

    const btn = screen.getAllByTitle('查看报告')[0]
    fireEvent.click(btn)
    expect(onViewReport).toHaveBeenCalledWith('s1')
  })

  it('toggles sort order', () => {
    render(<SkillHealthList skills={mockSkills} />)

    const sortBtn = screen.getByText(/健康分/)
    fireEvent.click(sortBtn)

    const rows = screen.getAllByTestId(/skill-row-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'skill-row-s2')
    expect(rows[1]).toHaveAttribute('data-testid', 'skill-row-s1')
  })

  it('shows empty state', () => {
    render(<SkillHealthList skills={[]} />)
    expect(screen.getByText('暂无 Skill 数据')).toBeInTheDocument()
  })
})