import type { AscendWaypointAnchor } from './waypointProjection'

const point = (value: number) => Math.round(value * 1_000) / 10

/**
 * Produces one authored, terrain-like ascent trace. This is deliberately a
 * presentation detail: mission topology never reads from the route artwork.
 */
export function createAscendRoutePath(anchors: AscendWaypointAnchor[]) {
  if (anchors.length === 0) return ''
  const [first, ...rest] = anchors
  return rest.reduce((path, anchor, index) => {
    const previous = anchors[index]
    const bend = index % 2 === 0 ? 1.6 : -1.3
    const controlOneX = point(previous.x) + bend
    const controlOneY = point(previous.y) - 4.2
    const controlTwoX = point(anchor.x) - bend * 0.7
    const controlTwoY = point(anchor.y) + 3.8
    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point(anchor.x)} ${point(anchor.y)}`
  }, `M ${point(first.x)} ${point(first.y)}`)
}

export function reachedRoutePercent(anchors: AscendWaypointAnchor[]) {
  if (anchors.length <= 1) return anchors.length === 1 ? 100 : 0
  const reachedIndex = anchors.reduce(
    (highest, anchor, index) => anchor.state === 'future' ? highest : index,
    0,
  )
  return Math.max(1.5, reachedIndex / (anchors.length - 1) * 100)
}

export function unresolvedRouteCenter(anchors: AscendWaypointAnchor[]) {
  const firstFutureIndex = anchors.findIndex((anchor) => anchor.state === 'future')
  if (firstFutureIndex < 0) return undefined
  const future = anchors.slice(Math.max(0, firstFutureIndex - 1))
  return {
    x: future.reduce((total, anchor) => total + anchor.x, 0) / future.length,
    y: future.reduce((total, anchor) => total + anchor.y, 0) / future.length,
  }
}
