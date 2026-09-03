import { describe, expect, it } from 'vitest'
import type { AscendWaypointAnchor } from './waypointProjection'
import { createAscendRoutePath, reachedRoutePercent, unresolvedRouteCenter } from './routeTrace'

const anchors: AscendWaypointAnchor[] = [
  { entityId: 'base', label: 'Basecamp', altitude: 1_100, x: 0.56, y: 0.79, state: 'secured' },
  { entityId: 'camp-i', label: 'Camp I', altitude: 2_900, x: 0.615, y: 0.68, state: 'current' },
  { entityId: 'summit', label: 'Summit', altitude: 6_400, x: 0.455, y: 0.17, state: 'future' },
]

describe('Ascend terrain route trace', () => {
  it('passes through every authored waypoint without exposing topology edges', () => {
    const path = createAscendRoutePath(anchors)
    expect(path).toMatch(/^M 56 79 C /)
    expect(path).toContain('61.5 68')
    expect(path).toContain('45.5 17')
  })

  it('separates reached trail progress from the unresolved fog center', () => {
    expect(reachedRoutePercent(anchors)).toBe(50)
    expect(unresolvedRouteCenter(anchors)?.x).toBeCloseTo(0.535)
    expect(unresolvedRouteCenter(anchors)?.y).toBeCloseTo(0.425)
  })
})
