import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SkillHealthCard } from '../SkillHealthCard'
import type { Skill } from '@/types'

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const mockSkill: Skill = {
  id: 'skill-1',
  name: 'Test Skill',
  description: 'A test skill',
  version: '1.0.0',
  author: 'test',
  owner_team: 'team-a',
  category: ['code'],
  input_schema: { type: 'object' },
  output_schema: { type: 'object' },
  capabilities: ['test'],
  conflict_tags: [],
  call_count: 10,
  status: 'active',
}

describe('SkillHealthCard', () => {
  it('renders skill name and health score', () => {
    renderWithProviders(<SkillHealthCard skill={mockSkill} />)
    expect(screen.getByText('Test Skill')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders dimension bars', () => {
    renderWithProviders(<SkillHealthCard skill={mockSkill} />)
    expect(screen.getByText('performance')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('code quality')).toBeInTheDocument()
    expect(screen.getByText('adoption')).toBeInTheDocument()
  })

  it('opens history dialog when clicking History button', () => {
    renderWithProviders(<SkillHealthCard skill={mockSkill} />)
    const historyBtn = screen.getByTestId('view-history-skill-1')
    expect(historyBtn).toBeInTheDocument()

    fireEvent.click(historyBtn)
    // Dialog should appear with skill name in title
    expect(screen.getByText(/Health History/)).toBeInTheDocument()
  })

  it('uses provided healthData over mock data', () => {
    const customHealth = {
      skill_id: 'skill-1',
      health_score: 95,
      grade: 'A' as const,
      dimensions: [
        { name: 'performance', score: 95, weight: 0.5 },
      ],
      last_checked_at: new Date().toISOString(),
    }
    renderWithProviders(<SkillHealthCard skill={mockSkill} healthData={customHealth} />)
    expect(screen.getAllByText('95').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
