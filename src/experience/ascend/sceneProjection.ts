export interface ScenePoint {
  x: number
  y: number
}

interface SceneSize {
  width: number
  height: number
}

export const ASCEND_SCENE_OVERSCAN = 1
export const ASCEND_COMPACT_SCENE_OVERSCAN = 1.32
const SAFE_EDGE_X = 0.045
const SAFE_EDGE_Y = 0.05

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

/**
 * Keep the authored full-mountain composition on ordinary landscape screens,
 * then add a controlled crop on portrait/side-panel viewports. The renderer
 * and waypoint projection both consume this value, so the route remains
 * registered to the terrain while the mountain occupies more of the frame.
 */
export function resolveAscendSceneOverscan(source: SceneSize, viewport: SceneSize) {
  if (source.width <= 0 || source.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return ASCEND_SCENE_OVERSCAN
  }
  const viewportAspect = viewport.width / viewport.height
  if (viewportAspect >= 1.1) return ASCEND_SCENE_OVERSCAN
  const sourceAspect = source.width / source.height
  const coverOverscan = sourceAspect / viewportAspect
  return clamp(1 + (coverOverscan - 1) * 0.36, ASCEND_SCENE_OVERSCAN, ASCEND_COMPACT_SCENE_OVERSCAN)
}

/**
 * Maps a normalized artwork coordinate through the same centered contained
 * stage used by the living mountain renderer. The master image is an entire-
 * mountain composition, so cropping it on narrow windows would remove both
 * terrain and authored waypoints. Keeping this presentation-only means a
 * viewport change cannot alter mission topology or semantic stage positions.
 */
export function projectScenePoint(
  point: ScenePoint,
  source: SceneSize,
  viewport: SceneSize,
  overscan = resolveAscendSceneOverscan(source, viewport),
): ScenePoint {
  if (source.width <= 0 || source.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return point
  const scale = Math.min(viewport.width / source.width, viewport.height / source.height) * overscan
  const renderedWidth = source.width * scale
  const renderedHeight = source.height * scale
  const offsetX = (viewport.width - renderedWidth) / 2
  const offsetY = (viewport.height - renderedHeight) / 2
  return {
    x: (offsetX + point.x * renderedWidth) / viewport.width,
    y: (offsetY + point.y * renderedHeight) / viewport.height,
  }
}

/** Keep interactive HUD markers reachable at the edge of the contained stage. */
export function keepScenePointReachable(point: ScenePoint): ScenePoint {
  return {
    x: clamp(point.x, SAFE_EDGE_X, 1 - SAFE_EDGE_X),
    y: clamp(point.y, SAFE_EDGE_Y, 1 - SAFE_EDGE_Y),
  }
}
