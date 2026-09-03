import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDemoExpedition } from '../demo/demoExpedition'
import { createNarratorInput } from '../domain/narrator'
import { MissionStore, missionStore } from '../state/missionStore'
import { createWebMcpToolDefinitions } from '../webmcp/registerTools'
import { ascendExperiencePack } from './ascend/AscendExperiencePack'
import { activeExperiencePack, getExperiencePack } from './registry'

describe('experience pack boundary', () => {
  it('keeps presentation vocabulary out of the mission core', () => {
    const core = ['types.ts', 'engine.ts', 'narrator.ts']
      .map((file) => readFileSync(resolve(process.cwd(), 'src/domain', file), 'utf8'))
      .join('\n')
      .toLowerCase()
    expect(core).not.toMatch(/\b(ascend|mountain|altitude|summit|basecamp|camp|crevasse|fog|ridge|climber|expedition|checkpoint|route)\b/)
  })

  it('registers Ascend as the only implemented pack', () => {
    expect(activeExperiencePack).toBe(ascendExperiencePack)
    expect(getExperiencePack('ascend')).toBe(ascendExperiencePack)
    expect(getExperiencePack('not-implemented')).toBeUndefined()
  })

  it('derives Ascend presentation and narration from neutral mission state', () => {
    const mission = createDemoExpedition()
    const experienceState = ascendExperiencePack.createState(mission.mission.seed)
    const projection = ascendExperiencePack.project(mission, experienceState)
    const narration = ascendExperiencePack.narrate(createNarratorInput(mission), projection)
    expect(projection.securedAltitude).toBeGreaterThan(0)
    expect(ascendExperiencePack.resolveScene(mission, projection).kind).toBe('basecamp')
    expect(narration.metrics.map((metric) => metric.id)).toContain('secured-altitude')
  })

  it('exposes only neutral WebMCP contracts', () => {
    const tools = createWebMcpToolDefinitions(missionStore)
    expect(tools).toHaveLength(18)
    expect(tools.map((tool) => tool.name)).toEqual([
      'inspect_mission',
      'discover_mission',
      'propose_stage',
      'propose_path',
      'begin_stage',
      'record_progress',
      'complete_stage',
      'report_obstacle',
      'resolve_obstacle',
      'request_human_decision',
      'inspect_human_decision',
      'attach_evidence',
      'select_path',
      'expand_scope',
      'invalidate_stage',
      'verify_completion',
      'complete_mission',
      'submit_project_handoff',
    ])
    expect(JSON.stringify(tools.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema }))).toLowerCase())
      .not.toMatch(/\b(ascend|mountain|altitude|summit|basecamp|camp|crevasse|fog|ridge|climber|expedition|checkpoint|route)\b/)
  })

  it('prepares an Ascend generation request from a neutral project handoff', () => {
    const store = new MissionStore()
    const tool = createWebMcpToolDefinitions(store).find(({ name }) => name === 'submit_project_handoff')
    const result = JSON.parse(tool!.execute({
      handoffId: 'handoff:test',
      projectId: 'project:test',
      projectName: 'Test project',
      objective: 'Deliver the reviewed release.',
      summary: 'Implementation is underway.',
      phase: 'implementation',
      activeWork: ['Integrate reviewed visuals'],
      constraints: ['Preserve semantic state'],
      risks: ['Asset review pending'],
      evidence: ['test suite'],
    }))
    expect(result.ok).toBe(true)
    expect(result.generation).toMatchObject({ status: 'prepared', experiencePackId: 'ascend' })
    expect(store.getSnapshot().handoff?.projectName).toBe('Test project')
    expect(store.getSnapshot().generation.request?.prompt).toContain('Test project')
    expect(store.getSnapshot().generation.request?.sourceEntityCount).toBe(1)
    expect(store.getSnapshot().generation.request?.placementAnchors).toHaveLength(1)
    store.advanceDemo()
    expect(store.getSnapshot().generation.request?.sourceEntityCount).toBe(6)
    expect(store.getSnapshot().generation.request?.placementAnchors).toHaveLength(6)
  })
})
