import { describe, expect, it } from 'vitest'
import type { AscendWaypointAnchor } from './waypointProjection'
import { createAscendRoutePath, reachedRoutePercent, unresolvedRouteCenter } from './routeTrace'

const anchors: AscendWaypointAnchor[] = [
  { entityId: 'base', label: 'Basecamp', altitude: 1_100, x: 0.68, y: 0.79, state: 'secured' },
  { entityId: 'camp-i', label: 'Camp I', altitude: 2_900, x: 0.64, y: 0.67, state: 'current' },
  { entityId: 'summit', label: 'Summit', altitude: 6_400, x: 0.48, y: 0.2, state: 'future' },
]

describe('Ascend terrain route trace', () => {
  it('passes through every authored waypoint without exposing topology edges', () => {
    const path = createAscendRoutePath(anchors)
    expect(path).toMatch(/^M 68 79 C /)
    expect(path).toContain('64 67')
    expect(path).toContain('48 20')
  })

  it('separates reached trail progress from the unresolved fog center', () => {
    expect(reachedRoutePercent(anchors)).toBe(50)
    expect(unresolvedRouteCenter(anchors)?.x).toBeCloseTo(0.56)
    expect(unresolvedRouteCenter(anchors)?.y).toBeCloseTo(0.435)
  })
})
