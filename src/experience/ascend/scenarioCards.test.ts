import { describe, expect, it } from 'vitest'
import { applyCommand } from '../../domain/engine'
import { advanceDemo, createDemoExpedition } from '../../demo/demoExpedition'
import { buildMountainTopology } from './topology'
import { createAscendScenarioCard, createWaypointCrop } from './scenarioCards'
import { BUNDLED_SCENARIO_CARD_ASSETS, resolveBundledScenarioCardAsset } from './localScenarioCardReviewAssets'
import { createAscendWaypointPlan } from './waypointProjection'

describe('Ascend geography-aware scenario cards', () => {
  it('binds a card to the canonical master and local waypoint crop', () => {
    const state = createDemoExpedition()
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const anchor = createAscendWaypointPlan(state, topology).anchors[0]
    const node = topology.nodes.find((candidate) => candidate.id === anchor.entityId)!
    const card = createAscendScenarioCard({
      state,
      node,
      anchor,
      master: {
        generationId: 'master:test',
        assetUrl: '/master.png',
        width: 3840,
        height: 2160,
      },
    })

    expect(card.sourceReference).toMatchObject({
      generationId: 'master:test',
      assetUrl: '/master.png',
      focalEntityId: node.id,
      crop: createWaypointCrop(anchor),
    })
    expect(card.artPrompt).toContain(`canonical master master:test`)
    expect(card.artPrompt).toContain(`${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`)
    expect(card.negativePrompt).toContain('different mountain')
  })

  it('keeps every waypoint crop inside the master image', () => {
    const state = createDemoExpedition()
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const plan = createAscendWaypointPlan(state, topology)
    for (const anchor of plan.anchors) {
      const crop = createWaypointCrop(anchor)
      expect(crop.x).toBeGreaterThanOrEqual(0)
      expect(crop.y).toBeGreaterThanOrEqual(0)
      expect(crop.x + crop.width).toBeLessThanOrEqual(1)
      expect(crop.y + crop.height).toBeLessThanOrEqual(1)
    }
  })

  it('does not leak concealed mission stages into card copy or generation context', () => {
    const state = advanceDemo(createDemoExpedition(), 0).state
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const summit = topology.nodes.find((node) => node.stage.kind === 'completion')!
    const anchor = createAscendWaypointPlan(state, topology).anchors.find((candidate) => candidate.entityId === summit.id)!
    const card = createAscendScenarioCard({
      state,
      node: summit,
      anchor,
      master: { generationId: 'master:test', assetUrl: '/master.png', width: 3840, height: 2160 },
    })

    expect(card.concealed).toBe(true)
    expect(card.title).toBe('Route not yet revealed')
    expect(card.summary).not.toContain(summit.stage.description)
    expect(card.artPrompt).not.toContain(summit.stage.description)
    expect(card.decision).toBeUndefined()
  })

  it('prioritizes an unresolved human choice over its underlying blocker', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < 11) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
    }
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const node = topology.nodes.find((candidate) => candidate.id === state.mission.activeStageId)!
    const anchor = createAscendWaypointPlan(state, topology).anchors.find((candidate) => candidate.entityId === node.id)!
    const card = createAscendScenarioCard({
      state,
      node,
      anchor,
      master: { generationId: 'master:test', assetUrl: '/master.png', width: 3840, height: 2160 },
    })

    expect(card.kind).toBe('decision')
    expect(card.title).toBe('How should the expedition cross the persistence failure?')
    expect(card.decision?.options).toHaveLength(2)
  })

  it('keeps the Camp III physical anchor stable while route semantics change', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < 8) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
    }
    const normalTopology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const normalAnchor = createAscendWaypointPlan(state, normalTopology).anchors.find((anchor) => anchor.entityId === state.mission.activeStageId)!
    while (cursor < 11) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
    }
    const decisionTopology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const decisionAnchor = createAscendWaypointPlan(state, decisionTopology).anchors.find((anchor) => anchor.entityId === state.mission.activeStageId)!

    expect(decisionAnchor).toMatchObject({ x: normalAnchor.x, y: normalAnchor.y, altitude: normalAnchor.altitude })
  })

  it('binds each validation candidate to Camp III at the production card size', () => {
    expect(Object.keys(BUNDLED_SCENARIO_CARD_ASSETS.validation)).toEqual(['camp', 'blocker', 'decision'])
    for (const candidate of Object.values(BUNDLED_SCENARIO_CARD_ASSETS.validation)) {
      expect(candidate).toMatchObject({ width: 1600, height: 960, focalEntityId: 'cp_validation' })
      expect(candidate.generationId).toMatch(/^codex-subscription:/)
    }
  })

  it('uses contextual early-expedition art instead of repeating the master crop', () => {
    expect(resolveBundledScenarioCardAsset('origin-any-seed', 'basecamp')).toMatchObject({
      width: 1600,
      height: 960,
      focalEntityId: 'origin-any-seed',
      assetUrl: expect.stringContaining('basecamp-origin'),
    })
    expect(resolveBundledScenarioCardAsset('cp_foundation', 'camp')?.assetUrl).toContain('camp-i-foundation')
    expect(resolveBundledScenarioCardAsset('cp_implementation', 'camp')?.assetUrl).toContain('camp-ii-implementation')
    expect(resolveBundledScenarioCardAsset('cp_validation', 'blocker')?.assetUrl).toContain('camp-iii-blocker')
    expect(resolveBundledScenarioCardAsset('cp_security', 'route')?.assetUrl).toContain('security-ridge')
    expect(resolveBundledScenarioCardAsset('cp_deployment', 'discovery')?.assetUrl).toContain('final-approach-concealed')
    expect(resolveBundledScenarioCardAsset('cp_deployment', 'camp')?.assetUrl).toContain('final-approach-active')
    expect(resolveBundledScenarioCardAsset('cp_summit', 'discovery')?.assetUrl).toContain('summit-concealed')
    expect(resolveBundledScenarioCardAsset('cp_summit', 'summit')?.assetUrl).toContain('summit-verified')
    expect(resolveBundledScenarioCardAsset('cp_unknown', 'camp')).toBeUndefined()
  })

  it('shows verified mission-criterion evidence on the Summit card', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < 24) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
      if (advanced.awaitingHuman) {
        const decision = Object.values(state.decisions).find((item) => !item.resolvedAt)!
        const resolved = applyCommand(state, { type: 'resolve_human_decision', decisionId: decision.id, optionId: 'repair' })
        if (!resolved.ok) throw new Error(resolved.message)
        state = resolved.state
      }
    }
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const node = topology.nodes.find((candidate) => candidate.stage.kind === 'completion')!
    const anchor = createAscendWaypointPlan(state, topology).anchors.find((candidate) => candidate.entityId === node.id)!
    const card = createAscendScenarioCard({
      state,
      node,
      anchor,
      master: { generationId: 'master:test', assetUrl: '/master.png', width: 3840, height: 2160 },
    })

    expect(card.evidenceCount).toBe(2)
  })

  it('describes completed Basecamp as mission history instead of unsurveyed terrain', () => {
    let state = createDemoExpedition()
    let cursor = 0
    while (cursor < 24) {
      const advanced = advanceDemo(state, cursor)
      state = advanced.state
      cursor = advanced.cursor
      if (advanced.awaitingHuman) {
        const decision = Object.values(state.decisions).find((item) => !item.resolvedAt)!
        const resolved = applyCommand(state, { type: 'resolve_human_decision', decisionId: decision.id, optionId: 'repair' })
        if (!resolved.ok) throw new Error(resolved.message)
        state = resolved.state
      }
    }
    const topology = buildMountainTopology(state, { baseAltitude: 1120, summitAltitude: 6430 })
    const node = topology.nodes.find((candidate) => candidate.stage.kind === 'origin')!
    const anchor = createAscendWaypointPlan(state, topology).anchors.find((candidate) => candidate.entityId === node.id)!
    const card = createAscendScenarioCard({
      state,
      node,
      anchor,
      master: { generationId: 'master:test', assetUrl: '/master.png', width: 3840, height: 2160 },
    })

    expect(card.summary).toContain('expedition began')
    expect(card.summary).toContain('verified at the Summit')
    expect(card.summary).not.toContain('unsurveyed')
  })
})
