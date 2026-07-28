import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HealthRadarCard } from './HealthRadarCard'
import type { SkillHealth } from '@/types'

const mockHealth: SkillHealth = {
  skill_id: 's1',
  skill_name: 'Test Skill',
  score: 78,
  grade: 'B',
  dimensions: [
    { name: '描述清晰度', score: 80, weight: 0.2 },
    { name: 'IO 契约', score: 75, weight: 0.2 },
    { name: '独特性', score: 82, weight: 0.2 },
    { name: '使用活跃度', score: 70, weight: 0.2 },
    { name: '可靠性', score: 83, weight: 0.2 },
  ],
  issues: [
    { id: 'i1', type: 'desc', severity: 'warning', message: 'Minor issue', suggestion: 'Fix it' },
  ],
  call_count: 120,
  checked_at: '2026-07-27T08:00:00Z',
}

describe('HealthRadarCard', () => {
  it('renders skill name and grade', () => {
    render(<HealthRadarCard health={mockHealth} />)
    expect(screen.getByText('Test Skill')).toBeInTheDocument()
  })

  it('renders empty state when health is null', () => {
    render(<HealthRadarCard health={null} />)
    expect(screen.getByText('选择一个 Skill 查看健康详情')).toBeInTheDocument()
  })

  it('calls onRecheck when recheck button clicked', () => {
    const onRecheck = vi.fn()
    render(<HealthRadarCard health={mockHealth} onRecheck={onRecheck} />)

    const btn = screen.getByText('重新检查')
    fireEvent.click(btn)
    expect(onRecheck).toHaveBeenCalledWith('s1')
  })

  it('calls onViewHistory when history button clicked', () => {
    const onViewHistory = vi.fn()
    render(<HealthRadarCard health={mockHealth} onViewHistory={onViewHistory} />)

    const btn = screen.getByText('历史趋势')
    fireEvent.click(btn)
    expect(onViewHistory).toHaveBeenCalledWith('s1')
  })

  it('shows loading state', () => {
    render(<HealthRadarCard health={null} loading />)
    expect(screen.getByTestId('health-radar-card')).toBeInTheDocument()
  })
})