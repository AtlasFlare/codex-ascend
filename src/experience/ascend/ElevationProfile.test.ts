import { describe, expect, it } from 'vitest'
import { advanceDemo, createDemoExpedition, DEMO_IDS } from '../../demo/demoExpedition'
import type { MountainTopology } from './topology'
import { getElevationCheckpointSignal, getSurveyedPercent } from './elevationProfileTelemetry'

function advanceTo(target: number) {
  let state = createDemoExpedition()
  let cursor = 0
  while (cursor < target) {
    const advanced = advanceDemo(state, cursor)
    state = advanced.state
    cursor = advanced.cursor
  }
  return state
}

describe('elevation profile telemetry', () => {
  it('reports survey coverage from revealed topology instead of stale mission metadata', () => {
    const topology = {
      nodes: [
        { hidden: false },
        { hidden: false },
        { hidden: true },
        { hidden: true },
      ],
    } as MountainTopology

    expect(getSurveyedPercent(topology, 12)).toBe(50)
    topology.nodes.forEach((node) => { node.hidden = false })
    expect(getSurveyedPercent(topology, 12)).toBe(100)
  })

  it('uses mission discovery before the route topology exists', () => {
    expect(getSurveyedPercent({ nodes: [] } as unknown as MountainTopology, 0)).toBe(0)
    expect(getSurveyedPercent({ nodes: [{ hidden: false }] } as MountainTopology, 18)).toBe(18)
  })

  it('prioritizes decisions, blockers, and evidence as checkpoint signals', () => {
    expect(getElevationCheckpointSignal(advanceTo(3), DEMO_IDS.foundation)).toMatchObject({ kind: 'evidence', count: 1 })
    expect(getElevationCheckpointSignal(advanceTo(9), DEMO_IDS.validation)).toEqual({ kind: 'blocker', label: 'Blocked' })
    expect(getElevationCheckpointSignal(advanceTo(11), DEMO_IDS.validation)).toEqual({ kind: 'decision', label: 'Decision' })
  })
})
