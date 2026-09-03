import { describe, expect, it } from 'vitest'
import { advanceDemo, createDemoExpedition, DEMO_STEP_COUNT } from '../../demo/demoExpedition'
import { applyCommand } from '../../domain/engine'
import { missionDetailEvidenceCount } from './missionDetailEvidence'

describe('mission detail evidence', () => {
  it('shows mission-level verification evidence at the Summit', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < DEMO_STEP_COUNT) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
      if (advanced.awaitingHuman) {
        const decision = Object.values(state.decisions).find(({ resolvedAt }) => !resolvedAt)
        const result = applyCommand(state, { type: 'resolve_human_decision', decisionId: decision?.id as string, optionId: 'repair' })
        if (!result.ok) throw new Error(result.message)
        state = result.state
      }
    }

    expect(missionDetailEvidenceCount(state, 'cp_summit')).toBe(2)
    expect(missionDetailEvidenceCount(state, 'cp_foundation')).toBe(1)
  })
})
