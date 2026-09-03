import { describe, expect, it } from 'vitest'
import { applyCommand } from '../domain/engine'
import { advanceDemo, ASCEND_RELEASE_REFERENCE, createDemoExpedition, DEMO_IDS, DEMO_STEP_COUNT } from './demoExpedition'

describe('deterministic demo expedition', () => {
  it('reconciles event 15 when WebMCP already expanded Security Ridge', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < 15) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
      if (advanced.awaitingHuman) {
        const pending = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
        const result = applyCommand(state, {
          type: 'resolve_human_decision',
          decisionId: pending?.id as string,
          optionId: 'repair',
        })
        if (!result.ok) throw new Error(result.message)
        state = result.state
      }
    }

    const agentExpanded = advanceDemo(state, 15)
    const reconciled = advanceDemo(agentExpanded.state, 15)

    expect(reconciled.cursor).toBe(16)
    expect(reconciled.state.stages[DEMO_IDS.security]?.title).toBe('Security Ridge')
    expect(reconciled.state.paths[DEMO_IDS.routeSecurity]).toBeDefined()
    expect(reconciled.state.paths[DEMO_IDS.routeSecurityDeploy]).toBeDefined()
  })

  it('runs from basecamp through human decision to verified summit', () => {
    let state = createDemoExpedition()
    let cursor = 0
    let guard = 0
    let sawBlocker = false
    let sawDecision = false
    let sawNewRidge = false

    while (cursor < DEMO_STEP_COUNT && guard < 40) {
      guard += 1
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
      sawBlocker ||= Object.values(state.obstacles).some((obstacle) => obstacle.status === 'open')
      sawDecision ||= Object.values(state.decisions).length > 0
      sawNewRidge ||= state.events.some((event) => event.type === 'scope_expanded')

      if (advanced.awaitingHuman) {
        const pending = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
        expect(pending).toBeDefined()
        const result = applyCommand(state, {
          type: 'resolve_human_decision',
          decisionId: pending?.id as string,
          optionId: 'repair',
        })
        if (!result.ok) throw new Error(result.message)
        state = result.state
      }
    }

    expect(guard).toBeLessThan(40)
    expect(sawBlocker).toBe(true)
    expect(sawDecision).toBe(true)
    expect(sawNewRidge).toBe(true)
    expect(state.mission.status).toBe('completed')
    expect(state.mission.successCriteria.every((criterion) => criterion.verified)).toBe(true)
    expect(state.paths.route_repair.status).toBe('completed')
    expect(state.paths.route_validation.status).toBe('abandoned')
    expect(state.paths.route_deployment.status).toBe('abandoned')
    expect(state.paths.route_summit).toMatchObject({ status: 'completed', selected: true })
    expect(Object.values(state.evidence).some(({ reference }) => reference === ASCEND_RELEASE_REFERENCE)).toBe(true)
    expect(Object.values(state.evidence).some(({ reference }) => reference.includes('.invalid'))).toBe(false)
    expect(state.events.at(-1)?.type).toBe('mission_completed')
  })
})
