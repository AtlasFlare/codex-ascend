import { describe, expect, it } from 'vitest'
import { DEMO_IDS } from '../demo/demoExpedition'
import { MissionStore } from '../state/missionStore'
import { createWebMcpToolDefinitions, type WebMcpToolRegistration } from './registerTools'

function tool(tools: WebMcpToolRegistration[], name: string) {
  const found = tools.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Missing WebMCP tool: ${name}`)
  return found
}

function parse(result: string) {
  return JSON.parse(result) as Record<string, unknown>
}

function expectClosedObjects(schema: unknown): void {
  if (!schema || typeof schema !== 'object') return
  const record = schema as Record<string, unknown>
  if (record.type === 'object') expect(record.additionalProperties).toBe(false)
  Object.values(record).forEach(expectClosedObjects)
}

describe('WebMCP contest surface', () => {
  it('registers a unique, closed, demo-proof tool contract', () => {
    const tools = createWebMcpToolDefinitions(new MissionStore())
    const names = tools.map(({ name }) => name)

    expect(tools).toHaveLength(18)
    expect(new Set(names).size).toBe(names.length)
    expect(tools.filter(({ readOnly }) => readOnly).map(({ name }) => name).sort()).toEqual([
      'inspect_human_decision',
      'inspect_mission',
    ])
    tools.forEach(({ inputSchema }) => expectClosedObjects(inputSchema))
    expect(names).toEqual(expect.arrayContaining([
      'inspect_mission',
      'discover_mission',
      'report_obstacle',
      'request_human_decision',
      'inspect_human_decision',
      'resolve_obstacle',
      'attach_evidence',
      'verify_completion',
      'complete_mission',
    ]))
  })

  it('returns structured results instead of throwing for malformed calls', () => {
    const tools = createWebMcpToolDefinitions(new MissionStore())

    tools.forEach((definition) => {
      const result = parse(definition.execute({ unexpected: true }))
      expect(typeof result.ok).toBe('boolean')
      expect(result.ok).toBe(false)
    })
  })

  it('completes the critical agent to human to agent recovery loop', () => {
    const store = new MissionStore()
    for (let index = 0; index < 9; index += 1) store.advanceDemo()
    const tools = createWebMcpToolDefinitions(store)

    const repair = parse(tool(tools, 'propose_path').execute({
      id: DEMO_IDS.routeRepair,
      originStageId: DEMO_IDS.implementation,
      destinationStageId: DEMO_IDS.validation,
      title: 'Persistence repair',
      description: 'Repair hydration and rerun validation.',
      rationale: 'Preserves release integrity.',
      effort: 0.64,
      risk: 0.24,
      confidence: 0.86,
    }))
    const bypass = parse(tool(tools, 'propose_path').execute({
      id: DEMO_IDS.routeBypass,
      originStageId: DEMO_IDS.implementation,
      destinationStageId: DEMO_IDS.validation,
      title: 'Demo bypass',
      description: 'Disable persistence and accept elevated risk.',
      rationale: 'Faster but unsafe.',
      effort: 0.18,
      risk: 0.82,
      confidence: 0.61,
    }))
    expect(repair.ok).toBe(true)
    expect(bypass.ok).toBe(true)

    const requested = parse(tool(tools, 'request_human_decision').execute({
      stageId: DEMO_IDS.validation,
      question: 'How should the expedition cross the persistence failure?',
      context: 'Deployment remains blocked until the human chooses a strategy.',
      requestedBy: 'Codex',
      recommendedOptionId: 'repair',
      options: [
        { id: 'repair', label: 'Repair persistence', description: 'Fix the session layer.', pathId: DEMO_IDS.routeRepair, effort: 0.64, risk: 0.24 },
        { id: 'bypass', label: 'Take demo bypass', description: 'Accept elevated risk.', pathId: DEMO_IDS.routeBypass, effort: 0.18, risk: 0.82 },
      ],
    }))
    expect(requested.ok).toBe(true)

    const criticalInspection = parse(tool(tools, 'inspect_mission').execute({}))
    expect(criticalInspection.truncated).not.toBe(true)
    expect((criticalInspection.pendingDecisions as Array<{ id: string }>)[0]?.id).toMatch(/^decision_/)
    expect(JSON.stringify(criticalInspection).length).toBeLessThanOrEqual(1500)

    const decision = Object.values(store.getSnapshot().mission.decisions)[0]
    expect(decision).toBeDefined()
    expect(store.selectDecision(decision.id, 'repair').ok).toBe(true)
    const inspected = parse(tool(tools, 'inspect_human_decision').execute({ decisionId: decision.id }))
    expect(inspected.ok).toBe(true)
    expect((inspected.decision as { selectedOptionId?: string }).selectedOptionId).toBe('repair')

    const obstacle = Object.values(store.getSnapshot().mission.obstacles).find(({ status }) => status === 'open')
    expect(obstacle).toBeDefined()
    const resolved = parse(tool(tools, 'resolve_obstacle').execute({
      obstacleId: obstacle?.id,
      resolution: 'Session hydration repaired and integration suite passed.',
    }))
    expect(resolved.ok).toBe(true)
    expect(store.getSnapshot().mission.obstacles[obstacle?.id as string].status).toBe('resolved')
    expect(store.getSnapshot().mission.paths[DEMO_IDS.routeRepair]).toMatchObject({ selected: true })
  })
})
