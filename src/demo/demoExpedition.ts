import { applyCommand, createMission } from '../domain/engine'
import type { MissionCommand, MissionState } from '../domain/types'

export const DEMO_IDS = {
  basecamp: '',
  foundation: 'cp_foundation',
  implementation: 'cp_implementation',
  validation: 'cp_validation',
  security: 'cp_security',
  deployment: 'cp_deployment',
  summit: 'cp_summit',
  routeFoundation: 'route_foundation',
  routeImplementation: 'route_implementation',
  routeValidation: 'route_validation',
  routeDeployment: 'route_deployment',
  routeSummit: 'route_summit',
  routeRepair: 'route_repair',
  routeBypass: 'route_bypass',
  routeSecurity: 'route_security',
  routeSecurityDeploy: 'route_security_deploy',
} as const

export const ASCEND_RELEASE_REFERENCE = 'self:/'

const DEMO_START = Date.parse('2026-08-28T18:00:00.000Z')

function demoTime(cursor: number) {
  return new Date(DEMO_START + cursor * 45_000).toISOString()
}

function run(state: MissionState, command: MissionCommand, cursor: number): MissionState {
  const result = applyCommand(state, command, demoTime(cursor))
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
  return result.state
}

export function createDemoExpedition(): MissionState {
  return createMission(
    {
      title: 'Production Ascent',
      objective: 'Ship Codex Ascend to production',
      description: 'Deliver a reliable public release with passing validation and a verified deployment.',
      successCriteria: ['Critical test suite passes', 'Production release is reachable and verified'],
      seed: 8_516_028,
      originStage: {
        title: 'Basecamp',
        description: 'The objective is established. The mountain is still unsurveyed.',
        successCriteria: ['Mission objective is clear enough to survey'],
      },
    },
    demoTime(0),
  )
}

export interface DemoAdvance {
  state: MissionState
  cursor: number
  message: string
  awaitingHuman?: boolean
  complete?: boolean
}

export const DEMO_STEP_COUNT = 24

export function advanceDemo(state: MissionState, cursor: number): DemoAdvance {
  const basecamp = Object.values(state.stages).find((stage) => stage.kind === 'origin')
  if (!basecamp) throw new Error('Demo basecamp is missing.')

  switch (cursor) {
    case 0:
      return {
        state: run(
          state,
          {
            type: 'discover_mission',
            confidence: 0.68,
            discoveryPercent: 64,
            stages: [
              {
                id: DEMO_IDS.foundation,
                title: 'Camp I · Foundation',
                description: 'Architecture, repository, and execution path are established.',
                kind: 'planning',
                status: 'available',
                successCriteria: ['Build foundation verified'],
                dependencies: [basecamp.id],
                confidence: 0.92,
                risk: 0.18,
                order: 2180,
              },
              {
                id: DEMO_IDS.implementation,
                title: 'Camp II · Implementation',
                description: 'The primary product surface and mission engine are integrated.',
                kind: 'implementation',
                status: 'discovered',
                successCriteria: ['Production build succeeds'],
                dependencies: [DEMO_IDS.foundation],
                confidence: 0.78,
                risk: 0.35,
                order: 3260,
              },
              {
                id: DEMO_IDS.validation,
                title: 'Camp III · Validation',
                description: 'Integration behavior and mission invariants are proven.',
                kind: 'validation',
                status: 'discovered',
                successCriteria: ['Critical test suite passes'],
                dependencies: [DEMO_IDS.implementation],
                confidence: 0.55,
                risk: 0.58,
                order: 4380,
              },
              {
                id: DEMO_IDS.deployment,
                title: 'Final Approach',
                description: 'The verified candidate is deployed and checked live.',
                kind: 'deployment',
                status: 'hidden',
                successCriteria: ['Live release responds correctly'],
                dependencies: [DEMO_IDS.validation],
                confidence: 0.44,
                risk: 0.48,
                order: 5520,
              },
              {
                id: DEMO_IDS.summit,
                title: 'Verified Summit',
                description: 'Every required outcome is supported by evidence.',
                kind: 'completion',
                status: 'hidden',
                dependencies: [DEMO_IDS.deployment],
                confidence: 0.4,
                risk: 0.25,
                order: 6430,
              },
            ],
            paths: [
              {
                id: DEMO_IDS.routeFoundation,
                originStageId: basecamp.id,
                destinationStageId: DEMO_IDS.foundation,
                title: 'Lower traverse',
                description: 'A stable line from objective to architecture.',
                estimatedRisk: 0.12,
                confidence: 0.92,
                selected: true,
                status: 'selected',
              },
              {
                id: DEMO_IDS.routeImplementation,
                originStageId: DEMO_IDS.foundation,
                destinationStageId: DEMO_IDS.implementation,
                title: 'Builder’s ridge',
                description: 'The known implementation route.',
                estimatedRisk: 0.3,
                confidence: 0.78,
                selected: true,
                status: 'selected',
              },
              {
                id: DEMO_IDS.routeValidation,
                originStageId: DEMO_IDS.implementation,
                destinationStageId: DEMO_IDS.validation,
                title: 'Integration couloir',
                description: 'A narrow validation line with uncertain footing.',
                estimatedRisk: 0.62,
                confidence: 0.55,
                selected: true,
                status: 'selected',
              },
              {
                id: DEMO_IDS.routeDeployment,
                originStageId: DEMO_IDS.validation,
                destinationStageId: DEMO_IDS.deployment,
                title: 'Cloud shelf',
                description: 'The upper route is obscured until validation is secure.',
                confidence: 0.44,
                status: 'unknown',
              },
              {
                id: DEMO_IDS.routeSummit,
                originStageId: DEMO_IDS.deployment,
                destinationStageId: DEMO_IDS.summit,
                title: 'Summit ridge',
                description: 'The final evidence-backed line.',
                confidence: 0.4,
                status: 'unknown',
              },
            ],
          },
          cursor + 1,
        ),
        cursor: cursor + 1,
        message: 'Survey complete. Five checkpoints emerge through the fog.',
      }
    case 1:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.foundation }, cursor + 1), cursor: 2, message: 'The ascent begins toward Camp I.' }
    case 2:
      return {
        state: run(
          state,
          {
            type: 'attach_evidence',
            stageId: DEMO_IDS.foundation,
            evidence: {
              type: 'commit',
              title: 'Foundation build recorded',
              description: 'Architecture and repository baseline are reproducible.',
              source: 'Codex',
              reference: 'demo:foundation',
            },
          },
          cursor + 1,
        ),
        cursor: 3,
        message: 'Foundation evidence is cached at Camp I.',
      }
    case 3:
      return { state: run(state, { type: 'complete_stage', stageId: DEMO_IDS.foundation }, cursor + 1), cursor: 4, message: 'Camp I secured.' }
    case 4:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.implementation }, cursor + 1), cursor: 5, message: 'Climbing Builder’s Ridge.' }
    case 5:
      return {
        state: run(
          state,
          {
            type: 'attach_evidence',
            stageId: DEMO_IDS.implementation,
            evidence: {
              type: 'result',
              title: 'Production bundle created',
              description: 'The application compiles into a deterministic release candidate.',
              source: 'Build pipeline',
              reference: 'demo:build-pass',
            },
          },
          cursor + 1,
        ),
        cursor: 6,
        message: 'Implementation build passes.',
      }
    case 6:
      return { state: run(state, { type: 'complete_stage', stageId: DEMO_IDS.implementation }, cursor + 1), cursor: 7, message: 'Camp II secured.' }
    case 7:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.validation }, cursor + 1), cursor: 8, message: 'The climber enters the Integration Couloir.' }
    case 8: {
      const result = applyCommand(
        state,
        {
          type: 'report_obstacle',
          stageId: DEMO_IDS.validation,
          title: 'Session persistence tests failing',
          description: 'Three integration tests lose authenticated state after reload. Deployment is unsafe.',
          category: 'test_failure',
          severity: 'blocking',
          source: 'Integration test suite',
          blocks: [DEMO_IDS.validation, DEMO_IDS.routeValidation],
          confidence: 0.97,
        },
        demoTime(cursor + 1),
      )
      if (!result.ok) throw new Error(result.message)
      return { state: result.state, cursor: 9, message: 'A crevasse opens across the active route.' }
    }
    case 9: {
      let next = run(
        state,
        {
          type: 'propose_path',
          path: {
            id: DEMO_IDS.routeRepair,
            originStageId: DEMO_IDS.implementation,
            destinationStageId: DEMO_IDS.validation,
            title: 'Persistence repair',
            description: 'Repair session hydration and rerun the full suite.',
            rationale: 'Slower, but preserves release integrity.',
            estimatedEffort: 0.64,
            estimatedRisk: 0.24,
            confidence: 0.86,
            status: 'available',
          },
        },
        cursor + 1,
      )
      next = run(
        next,
        {
          type: 'propose_path',
          path: {
            id: DEMO_IDS.routeBypass,
            originStageId: DEMO_IDS.implementation,
            destinationStageId: DEMO_IDS.validation,
            title: 'Demo bypass',
            description: 'Disable persistence for the demo and accept release risk.',
            rationale: 'Fast, but leaves the core regression unresolved.',
            estimatedEffort: 0.18,
            estimatedRisk: 0.82,
            confidence: 0.62,
            status: 'available',
          },
        },
        cursor + 1,
      )
      return { state: next, cursor: 10, message: 'Two possible routes grow around the crevasse.' }
    }
    case 10: {
      const result = applyCommand(
        state,
        {
          type: 'request_human_decision',
          stageId: DEMO_IDS.validation,
          question: 'How should the expedition cross the persistence failure?',
          context: 'The release cannot advance safely while authenticated state is lost on reload.',
          requestedBy: 'Codex',
          recommendedOptionId: 'repair',
          options: [
            {
              id: 'repair',
              label: 'Repair persistence',
              description: 'Fix the session layer and retain full product scope.',
              pathId: DEMO_IDS.routeRepair,
              effort: 0.64,
              risk: 0.24,
            },
            {
              id: 'bypass',
              label: 'Take demo bypass',
              description: 'Temporarily remove persistence and accept elevated risk.',
              pathId: DEMO_IDS.routeBypass,
              effort: 0.18,
              risk: 0.82,
            },
          ],
        },
        demoTime(cursor + 1),
      )
      if (!result.ok) throw new Error(result.message)
      return { state: result.state, cursor: 11, message: 'Human route choice required.', awaitingHuman: true }
    }
    case 11: {
      const pending = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
      if (pending) return { state, cursor, message: 'Choose a route on the mountain before the expedition can continue.', awaitingHuman: true }
      const obstacle = Object.values(state.obstacles).find((item) => item.status !== 'resolved')
      if (!obstacle) return { state, cursor: 12, message: 'The crossing is already secure.' }
      return {
        state: run(state, { type: 'resolve_obstacle', obstacleId: obstacle.id, resolution: 'Session hydration repaired; integration suite passes.' }, cursor + 1),
        cursor: 12,
        message: 'The agent observes the decision. A fixed rope secures the crossing.',
      }
    }
    case 12:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.validation }, cursor + 1), cursor: 13, message: 'The climber crosses and resumes validation.' }
    case 13: {
      const criterionId = state.mission.successCriteria[0]?.id
      return {
        state: run(
          state,
          {
            type: 'attach_evidence',
            stageId: DEMO_IDS.validation,
            criterionId,
            evidence: {
              type: 'test',
              title: 'Critical suite passes',
              description: 'All mission engine and integration tests pass after the repair.',
              source: 'Vitest',
              reference: 'demo:tests-green',
            },
          },
          cursor + 1,
        ),
        cursor: 14,
        message: 'Passing test evidence anchors Camp III.',
      }
    }
    case 14:
      return { state: run(state, { type: 'complete_stage', stageId: DEMO_IDS.validation }, cursor + 1), cursor: 15, message: 'Camp III secured.' }
    case 15: {
      let next = state
      if (!next.stages[DEMO_IDS.security]) {
        next = run(
          next,
          {
            type: 'expand_scope',
            reason: 'The live release also requires an explicit security review before deployment.',
            stage: {
              id: DEMO_IDS.security,
              title: 'Security Ridge',
              description: 'WebMCP mutations and persistence boundaries receive a final review.',
              kind: 'approval',
              status: 'available',
              dependencies: [DEMO_IDS.validation],
              successCriteria: ['Security review recorded'],
              confidence: 0.72,
              risk: 0.42,
              order: 5030,
            },
            path: {
              id: DEMO_IDS.routeSecurity,
              originStageId: DEMO_IDS.validation,
              destinationStageId: DEMO_IDS.security,
              title: 'Newly revealed ridge',
              description: 'A required review path emerges above Camp III.',
              status: 'selected',
              selected: true,
            },
          },
          cursor + 1,
        )
      } else if (!next.paths[DEMO_IDS.routeSecurity]) {
        next = run(next, {
          type: 'propose_path',
          path: {
            id: DEMO_IDS.routeSecurity,
            originStageId: DEMO_IDS.validation,
            destinationStageId: DEMO_IDS.security,
            title: 'Newly revealed ridge',
            description: 'A required review path emerges above Camp III.',
            status: 'selected',
            selected: true,
          },
        }, cursor + 1)
      }
      if (!next.paths[DEMO_IDS.routeSecurityDeploy]) {
        next = run(next, {
          type: 'propose_path',
          path: {
            id: DEMO_IDS.routeSecurityDeploy,
            originStageId: DEMO_IDS.security,
            destinationStageId: DEMO_IDS.deployment,
            title: 'Secured upper traverse',
            description: 'The reviewed line reconnects with the final approach.',
            status: 'selected',
            selected: true,
          },
        }, cursor + 1)
      }
      return { state: next, cursor: 16, message: 'Scope discovery lifts the summit. Security Ridge appears.' }
    }
    case 16:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.security }, cursor + 1), cursor: 17, message: 'Ascending the newly revealed ridge.' }
    case 17:
      return {
        state: run(
          state,
          {
            type: 'attach_evidence',
            stageId: DEMO_IDS.security,
            evidence: {
              type: 'approval',
              title: 'Security boundary reviewed',
              description: 'Mutating tools remain semantic, validated, and auditable.',
              source: 'Human review',
              reference: 'demo:security-review',
            },
          },
          cursor + 1,
        ),
        cursor: 18,
        message: 'An approval anchor is fixed on Security Ridge.',
      }
    case 18:
      return { state: run(state, { type: 'complete_stage', stageId: DEMO_IDS.security }, cursor + 1), cursor: 19, message: 'Security Ridge secured.' }
    case 19:
      return { state: run(state, { type: 'begin_stage', stageId: DEMO_IDS.deployment }, cursor + 1), cursor: 20, message: 'The final approach emerges from cloud.' }
    case 20: {
      const criterionId = state.mission.successCriteria[1]?.id
      return {
        state: run(
          state,
          {
            type: 'attach_evidence',
            stageId: DEMO_IDS.deployment,
            criterionId,
            evidence: {
              type: 'deployment',
              title: 'Live release verified',
              description: 'The public application responds and exposes the expected WebMCP tools.',
              source: 'Deployment verifier',
              reference: ASCEND_RELEASE_REFERENCE,
            },
          },
          cursor + 1,
        ),
        cursor: 21,
        message: 'Live verification evidence reaches the final approach.',
      }
    }
    case 21:
      return { state: run(state, { type: 'complete_stage', stageId: DEMO_IDS.deployment }, cursor + 1), cursor: 22, message: 'Final approach secured.' }
    case 22:
      return { state: run(state, { type: 'verify_completion' }, cursor + 1), cursor: 23, message: 'Every success criterion is verified. The summit beacon activates.' }
    case 23:
      return { state: run(state, { type: 'complete_mission' }, cursor + 1), cursor: 24, message: 'Summit reached. Mission complete.', complete: true }
    default:
      return { state, cursor, message: 'The expedition is complete.', complete: true }
  }
}
