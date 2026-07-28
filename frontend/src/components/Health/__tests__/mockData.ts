import type { HealthSnapshot, HealthHistoryResponse, HealthGrade } from '@/types'

export function createMockSnapshot(overrides?: Partial<HealthSnapshot>): HealthSnapshot {
  const id = overrides?.id || `snap-${Math.random().toString(36).slice(2)}`
  const timestamp = overrides?.checked_at || new Date().toISOString()
  return {
    id,
    skill_id: 'skill-1',
    health_score: 85,
    grade: 'B' as HealthGrade,
    dimensions: [
      { name: 'performance', score: 90, weight: 0.25 },
      { name: 'security', score: 80, weight: 0.25 },
      { name: 'code_quality', score: 85, weight: 0.25 },
      { name: 'adoption', score: 82, weight: 0.25 },
    ],
    events: [],
    checked_at: timestamp,
    changes: undefined,
    ...overrides,
  }
}

export function createMockHistoryResponse(overrides?: Partial<HealthHistoryResponse>): HealthHistoryResponse {
  return {
    skill_id: 'skill-1',
    snapshots: [
      createMockSnapshot({ id: 'snap-1', health_score: 72, grade: 'C', checked_at: '2026-07-20T10:00:00Z' }),
      createMockSnapshot({ id: 'snap-2', health_score: 78, grade: 'C', checked_at: '2026-07-22T10:00:00Z' }),
      createMockSnapshot({ id: 'snap-3', health_score: 85, grade: 'B', checked_at: '2026-07-25T10:00:00Z' }),
      createMockSnapshot({ id: 'snap-4', health_score: 92, grade: 'A', checked_at: '2026-07-27T10:00:00Z', events: [
        { id: 'ev-1', type: 'skill_update', description: 'Updated input schema', timestamp: '2026-07-27T10:00:00Z' },
      ]}),
    ],
    summary: {
      avg_score: 81.75,
      best_score: 92,
      worst_score: 72,
      trend: 'up',
      total_checks: 4,
    },
    ...overrides,
  }
}
