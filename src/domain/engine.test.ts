import { describe, expect, it } from 'vitest'
import { applyCommand, createMission } from './engine'
import type { MissionState } from './types'

function apply(state: MissionState, command: Parameters<typeof applyCommand>[1]) {
  const result = applyCommand(state, command, '2026-08-28T18:00:00.000Z')
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

function discoveredMission() {
  let state = createMission(
    { title: 'Test mission', objective: 'Ship safely', successCriteria: ['Tests pass'], seed: 42 },
    '2026-08-28T17:00:00.000Z',
  )
  const originId = state.mission.activeStageId as string
  state = apply(state, {
    type: 'discover_mission',
    confidence: 0.8,
    discoveryPercent: 70,
    stages: [
      {
        id: 'build',
        title: 'Build',
        description: 'Build is complete',
        kind: 'implementation',
        status: 'available',
        successCriteria: ['Build output exists'],
        dependencies: [originId],
        order: 1,
      },
      {
        id: 'finish',
        title: 'Finish',
        description: 'Release verified',
        kind: 'completion',
        status: 'hidden',
        dependencies: ['build'],
        order: 2,
      },
    ],
    paths: [
      {
        id: 'lower',
        originStageId: originId,
        destinationStageId: 'build',
        title: 'Primary path',
        description: 'Known path',
        selected: true,
        status: 'selected',
      },
      {
        id: 'upper',
        originStageId: 'build',
        destinationStageId: 'finish',
        title: 'Completion path',
        description: 'Final path',
        selected: true,
        status: 'selected',
      },
    ],
  })
  return state
}

describe('mission engine', () => {
  it('reconstructs identical mission ids from the same seed', () => {
    const first = createMission({ title: 'A', objective: 'B', seed: 19 }, '2026-08-28T00:00:00.000Z')
    const second = createMission({ title: 'A', objective: 'B', seed: 19 }, '2026-08-28T00:00:00.000Z')
    expect(first).toEqual(second)
  })

  it('rejects stage completion without evidence', () => {
    let state = discoveredMission()
    state = apply(state, { type: 'begin_stage', stageId: 'build' })
    expect(applyCommand(state, { type: 'complete_stage', stageId: 'build' })).toMatchObject({ ok: false, code: 'EVIDENCE_REQUIRED' })
  })

  it('selects the only viable inbound path before beginning a stage', () => {
    const state = discoveredMission()
    state.paths.lower.selected = false
    state.paths.lower.status = 'available'

    const started = apply(state, { type: 'begin_stage', stageId: 'build' })

    expect(started.paths.lower).toMatchObject({ selected: true, status: 'selected' })
    expect(started.mission.activePathId).toBe('lower')
  })

  it('requires an explicit path choice when multiple approaches are viable', () => {
    let state = discoveredMission()
    const originId = state.paths.lower.originStageId
    state.paths.lower.selected = false
    state.paths.lower.status = 'available'
    state = apply(state, {
      type: 'propose_path',
      path: { id: 'alternate', originStageId: originId, destinationStageId: 'build', title: 'Alternate', description: 'A second viable approach' },
    })

    expect(applyCommand(state, { type: 'begin_stage', stageId: 'build' })).toMatchObject({
      ok: false,
      code: 'INVALID_TRANSITION',
      message: 'Select one viable path before beginning this stage.',
    })
  })

  it('turns an obstacle and human path choice into inspectable mission state', () => {
    let state = discoveredMission()
    state = apply(state, { type: 'begin_stage', stageId: 'build' })
    state = apply(state, {
      type: 'report_obstacle',
      stageId: 'build',
      title: 'Tests fail',
      description: 'Integration suite is red',
      category: 'test_failure',
      severity: 'blocking',
      source: 'Vitest',
      blocks: ['build', 'lower'],
      confidence: 0.98,
    })
    expect(state.mission.status).toBe('blocked')
    expect(state.stages.build.status).toBe('blocked')
    expect(state.paths.lower.status).toBe('blocked')

    const originId = Object.values(state.stages).find((stage) => stage.kind === 'origin')?.id as string
    state = apply(state, {
      type: 'propose_path',
      path: { id: 'repair', originStageId: originId, destinationStageId: 'build', title: 'Repair', description: 'Fix the root cause' },
    })
    state = apply(state, {
      type: 'request_human_decision',
      stageId: 'build',
      question: 'Repair or bypass?',
      context: 'A real blocker needs a strategy.',
      requestedBy: 'agent',
      options: [
        { id: 'repair-option', label: 'Repair', description: 'Fix it', pathId: 'repair', effort: 0.6, risk: 0.2 },
        { id: 'wait-option', label: 'Wait', description: 'Pause', effort: 0.1, risk: 0.5 },
      ],
    })
    const decision = Object.values(state.decisions)[0]
    state = apply(state, { type: 'resolve_human_decision', decisionId: decision.id, optionId: 'repair-option' })
    expect(state.decisions[decision.id].selectedOptionId).toBe('repair-option')
    expect(state.paths.repair.selected).toBe(true)
    expect(state.events.map((event) => event.type)).toContain('human_decision_resolved')
  })

  it('requires criterion evidence and dependencies before completion verification', () => {
    let state = discoveredMission()
    expect(applyCommand(state, { type: 'verify_completion' })).toMatchObject({ ok: false, code: 'EVIDENCE_REQUIRED' })
    state = apply(state, { type: 'begin_stage', stageId: 'build' })
    state = apply(state, {
      type: 'attach_evidence',
      stageId: 'build',
      criterionId: state.mission.successCriteria[0].id,
      evidence: { type: 'test', title: 'Tests green', description: 'All checks pass', source: 'Vitest', reference: 'run:1' },
    })
    state = apply(state, { type: 'complete_stage', stageId: 'build' })
    state = apply(state, { type: 'verify_completion' })
    expect(state.mission.status).toBe('completion_ready')
    expect(state.paths.upper).toMatchObject({ status: 'selected', selected: true })
    state = apply(state, { type: 'complete_mission' })
    expect(state.mission.status).toBe('completed')
    expect(state.mission.discoveryPercent).toBe(100)
    expect(state.paths.upper.status).toBe('completed')
  })

  it('makes newly expanded required work available when its dependencies are complete', () => {
    let state = discoveredMission()
    state = apply(state, { type: 'begin_stage', stageId: 'build' })
    state = apply(state, {
      type: 'attach_evidence',
      stageId: 'build',
      evidence: { type: 'test', title: 'Build verified', description: 'The build is reproducible.', source: 'Vitest', reference: 'run:expand' },
    })
    state = apply(state, { type: 'complete_stage', stageId: 'build' })
    state = apply(state, {
      type: 'expand_scope',
      reason: 'A release review is now required.',
      stage: {
        id: 'review',
        title: 'Release review',
        description: 'Review the final release boundary.',
        kind: 'approval',
        dependencies: ['build'],
        order: 1.5,
      },
      path: {
        id: 'review-path',
        originStageId: 'build',
        destinationStageId: 'review',
        title: 'Review path',
        description: 'Connect verified build work to release review.',
      },
    })

    expect(state.stages.review.status).toBe('available')
    expect(state.paths['review-path'].destinationStageId).toBe('review')
  })

  it('does not re-block a stage when a human decision arrives after obstacle resolution', () => {
    let state = discoveredMission()
    state = apply(state, { type: 'begin_stage', stageId: 'build' })
    state = apply(state, {
      type: 'report_obstacle', stageId: 'build', title: 'External gate', description: 'A temporary gate.',
      category: 'external_service', severity: 'blocking', source: 'status check', blocks: ['build'], confidence: 0.9,
    })
    state = apply(state, {
      type: 'request_human_decision', stageId: 'build', question: 'Proceed after recovery?', context: 'The service recovered.', requestedBy: 'agent',
      options: [
        { id: 'continue', label: 'Continue', description: 'Resume safely', effort: 0.2, risk: 0.1 },
        { id: 'wait', label: 'Wait', description: 'Remain paused', effort: 0.1, risk: 0.2 },
      ],
    })
    const obstacle = Object.values(state.obstacles)[0]
    const decision = Object.values(state.decisions)[0]
    state = apply(state, { type: 'resolve_obstacle', obstacleId: obstacle.id, resolution: 'Service recovered.' })
    state = apply(state, { type: 'resolve_human_decision', decisionId: decision.id, optionId: 'continue' })
    expect(state.stages.build.status).toBe('available')
    expect(state.mission.status).toBe('active')
  })

  it('rejects invalid graph endpoints and nonexistent entities', () => {
    const state = discoveredMission()
    expect(applyCommand(state, {
      type: 'propose_path',
      path: { originStageId: 'missing', destinationStageId: 'build', title: 'Ghost', description: 'Invalid' },
    })).toMatchObject({ ok: false, code: 'NOT_FOUND' })
    expect(applyCommand(state, { type: 'resolve_obstacle', obstacleId: 'missing', resolution: 'Nope' })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    })
  })
})
