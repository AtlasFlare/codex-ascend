import { describe, expect, it } from 'vitest'
import { advanceDemo, createDemoExpedition } from '../../demo/demoExpedition'
import { applyCommand } from '../../domain/engine'
import type { MissionState } from '../../domain/types'
import { selectExpeditionScene } from './sceneSelection'

function advanceTo(target: number): { state: MissionState; cursor: number } {
  let state = createDemoExpedition()
  let cursor = 0
  while (cursor < target) {
    const result = advanceDemo(state, cursor)
    state = result.state
    cursor = result.cursor
    if (result.awaitingHuman) break
  }
  return { state, cursor }
}

function passDecision(): { state: MissionState; cursor: number } {
  const pending = advanceTo(11)
  const decision = Object.values(pending.state.decisions).find((item) => !item.resolvedAt)
  if (!decision) throw new Error('Expected demo decision')
  const resolved = applyCommand(
    pending.state,
    { type: 'resolve_human_decision', decisionId: decision.id, optionId: 'repair' },
    '2026-08-28T18:09:00.000Z',
  )
  if (!resolved.ok) throw new Error(resolved.message)
  const crossing = advanceDemo(resolved.state, pending.cursor)
  return { state: crossing.state, cursor: crossing.cursor }
}

describe('Ascend mountain-overview scene selection', () => {
  it('turns neutral mission state into physical expedition scenes', () => {
    expect(selectExpeditionScene(advanceTo(0).state).kind).toBe('basecamp')
    expect(selectExpeditionScene(advanceTo(9).state).kind).toBe('crevasse_blocker')
    expect(selectExpeditionScene(advanceTo(11).state).kind).toBe('route_fork')
    expect(selectExpeditionScene(passDecision().state).kind).toBe('secured_crossing')
  })

  it('uses survey fog while a newly discovered route is still low-confidence terrain', () => {
    const state = structuredClone(advanceTo(1).state)
    state.mission.discoveryPercent = 24
    expect(selectExpeditionScene(state)).toMatchObject({ kind: 'fog', transition: 'fog_reveal' })
  })

  it('reveals new scope as a ridge instead of drawing a graph branch', () => {
    let current = passDecision()
    while (current.cursor < 16) {
      const next = advanceDemo(current.state, current.cursor)
      current = { state: next.state, cursor: next.cursor }
    }
    expect(selectExpeditionScene(current.state)).toMatchObject({
      kind: 'new_ridge',
      camera: 'overview_reveal',
      transition: 'ridge_reveal',
    })
  })

  it('uses a completion scene only after the mission is complete', () => {
    let current = passDecision()
    while (current.cursor < 24) {
      const next = advanceDemo(current.state, current.cursor)
      current = { state: next.state, cursor: next.cursor }
    }
    expect(selectExpeditionScene(current.state)).toMatchObject({ kind: 'summit', hud: 'completion' })
  })

  it('uses waypoint-safe overview camera presets only', () => {
    const camera = selectExpeditionScene(advanceTo(3).state).camera
    expect(camera).toMatch(/^overview_/)
  })
})
