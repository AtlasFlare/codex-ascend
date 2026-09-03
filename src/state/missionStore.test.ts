import { describe, expect, it } from 'vitest'
import { createDemoExpedition } from '../demo/demoExpedition'
import { normalizeRestoredMission } from './missionStore'

describe('mission store restoration', () => {
  it('normalizes legacy completed sessions to a verified 100 percent', () => {
    const legacy = createDemoExpedition()
    legacy.mission.status = 'completed'
    legacy.mission.discoveryPercent = 52
    legacy.mission.progressEstimate = 0.94

    const restored = normalizeRestoredMission(legacy)

    expect(restored.mission.discoveryPercent).toBe(100)
    expect(restored.mission.progressEstimate).toBe(1)
    expect(restored).not.toBe(legacy)
  })

  it('does not rewrite an active session', () => {
    const active = createDemoExpedition()

    expect(normalizeRestoredMission(active)).toBe(active)
  })
})
