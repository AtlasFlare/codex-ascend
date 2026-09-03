import { describe, expect, it } from 'vitest'
import { advanceDemo, createDemoExpedition } from '../../demo/demoExpedition'
import { ascendExperiencePack } from './AscendExperiencePack'
import { resolveMissionMapScene } from './missionMapSceneGrammar'

function topologyFor(state: ReturnType<typeof createDemoExpedition>) {
  return ascendExperiencePack.project(state, ascendExperiencePack.createState(state.mission.seed)).topology
}

function demoAt(target: number) {
  let state = createDemoExpedition()
  let cursor = 0
  while (cursor < target) {
    const result = advanceDemo(state, cursor)
    state = result.state
    cursor = result.cursor
    if (result.awaitingHuman) break
  }
  return state
}

describe('mountain topology and scene grammar', () => {
  it('freezes the reviewed topology contract at representative demo states', () => {
    expect([0, 1, 4, 8, 9, 11].map((cursor) => topologyFor(demoAt(cursor)).fingerprint)).toMatchInlineSnapshot(`
      [
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false]],"routes":[]}",
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false],["cp_foundation","0.3901","0.6328",false],["cp_implementation","0.4917","0.5203",false],["cp_validation","0.6056","0.4036",false],["cp_deployment","0.6667","0.2848",true],["cp_summit","0.7712","0.1900",true]],"routes":[["route_deployment",true,false],["route_foundation",false,false],["route_implementation",false,false],["route_summit",true,false],["route_validation",false,false]]}",
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false],["cp_foundation","0.3901","0.6328",false],["cp_implementation","0.4917","0.5203",false],["cp_validation","0.6056","0.4036",false],["cp_deployment","0.6667","0.2848",true],["cp_summit","0.7712","0.1900",true]],"routes":[["route_deployment",true,false],["route_foundation",false,false],["route_implementation",false,false],["route_summit",true,false],["route_validation",false,false]]}",
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false],["cp_foundation","0.3901","0.6328",false],["cp_implementation","0.4917","0.5203",false],["cp_validation","0.6056","0.4036",false],["cp_deployment","0.6667","0.2848",true],["cp_summit","0.7712","0.1900",true]],"routes":[["route_deployment",true,false],["route_foundation",false,false],["route_implementation",false,false],["route_summit",true,false],["route_validation",false,false]]}",
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false],["cp_foundation","0.3901","0.6328",false],["cp_implementation","0.4917","0.5203",false],["cp_validation","0.6056","0.4036",false],["cp_deployment","0.6667","0.2848",true],["cp_summit","0.7712","0.1900",true]],"routes":[["route_deployment",true,false],["route_foundation",false,false],["route_implementation",false,false],["route_summit",true,false],["route_validation",false,true]]}",
        "{"seed":8516028,"nodes":[["stage_origin_-qzrt9v","0.1558","0.8600",false],["cp_foundation","0.3901","0.6328",false],["cp_implementation","0.4917","0.5203",false],["cp_validation","0.7656","0.4036",false],["cp_deployment","0.6667","0.2848",true],["cp_summit","0.7712","0.1900",true]],"routes":[["route_bypass",false,false],["route_deployment",true,false],["route_foundation",false,false],["route_implementation",false,false],["route_repair",false,false],["route_summit",true,false],["route_validation",false,true]]}",
      ]
    `)
  })

  it('produces identical geometry for identical mission state and seed', () => {
    const state = demoAt(8)
    expect(topologyFor(state).fingerprint).toBe(topologyFor(structuredClone(state)).fingerprint)
  })

  it('maps uncertainty to fog and completed checkpoints to camps', () => {
    const state = demoAt(4)
    const topology = topologyFor(state)
    const scene = resolveMissionMapScene(state, topology)
    expect(scene.some((item) => item.archetype === 'FOG')).toBe(true)
    expect(scene.some((item) => item.archetype === 'CAMP')).toBe(true)
  })

  it('maps a blocking test failure to a crevasse', () => {
    const state = demoAt(9)
    const scene = resolveMissionMapScene(state, topologyFor(state))
    expect(scene.some((item) => item.archetype === 'CREVASSE')).toBe(true)
  })

  it('maps a pending human decision to a route fork', () => {
    const state = demoAt(11)
    const scene = resolveMissionMapScene(state, topologyFor(state))
    expect(scene.some((item) => item.archetype === 'ROUTE_FORK')).toBe(true)
  })
})
