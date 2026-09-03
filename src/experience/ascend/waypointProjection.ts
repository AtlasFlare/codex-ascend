import type { MissionState } from '../../domain/types'
import type { MountainTopology } from './topology'

export type AscendWaypointState = 'secured' | 'current' | 'blocked' | 'future'

export interface AscendWaypointAnchor {
  entityId: string
  label: string
  altitude: number
  x: number
  y: number
  state: AscendWaypointState
}

export interface AscendWaypointPlan {
  sourceStageCount: number
  anchors: AscendWaypointAnchor[]
}

const MAX_WAYPOINTS = 10
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

// Authored against the canonical 16:9 mountain family. The lower traverse
// deliberately bends back onto the foreground snow shelf before climbing the
// right-hand ridge to the summit. Interpolating this spine keeps arbitrary
// mission sizes on physical terrain instead of drawing a generic diagonal.
const ASCEND_TERRAIN_SPINE = [
  { x: 0.56, y: 0.79 },
  { x: 0.615, y: 0.68 },
  { x: 0.61, y: 0.59 },
  { x: 0.58, y: 0.49 },
  { x: 0.545, y: 0.39 },
  { x: 0.505, y: 0.29 },
  { x: 0.455, y: 0.17 },
] as const

function pointOnTerrainSpine(progress: number) {
  const scaled = clamp(progress, 0, 1) * (ASCEND_TERRAIN_SPINE.length - 1)
  const startIndex = Math.floor(scaled)
  const endIndex = Math.min(ASCEND_TERRAIN_SPINE.length - 1, startIndex + 1)
  const localProgress = scaled - startIndex
  const start = ASCEND_TERRAIN_SPINE[startIndex]
  const end = ASCEND_TERRAIN_SPINE[endIndex]
  return {
    x: start.x + (end.x - start.x) * localProgress,
    y: start.y + (end.y - start.y) * localProgress,
  }
}

function sampledIndexes(length: number) {
  if (length <= MAX_WAYPOINTS) return Array.from({ length }, (_, index) => index)
  return Array.from({ length: MAX_WAYPOINTS }, (_, index) => Math.round(index * (length - 1) / (MAX_WAYPOINTS - 1)))
}

/**
 * Projects neutral stage order onto an Ascend-authored waypoint spine. The
 * same plan is consumed by image prompting and the live DOM HUD.
 */
export function createAscendWaypointPlan(state: MissionState, topology: MountainTopology): AscendWaypointPlan {
  const ordered = [...topology.nodes].sort((a, b) => a.stage.order - b.stage.order || a.id.localeCompare(b.id))
  const indexes = sampledIndexes(ordered.length)
  const activeId = state.mission.activeStageId
  const anchors = indexes.map((sourceIndex, visualIndex) => {
    const node = ordered[sourceIndex]
    const progress = indexes.length <= 1 ? 0 : visualIndex / (indexes.length - 1)
    const position = pointOnTerrainSpine(progress)
    const stageState: AscendWaypointState = node.id === activeId
      ? 'current'
      : node.stage.status === 'completed'
        ? 'secured'
        : node.stage.status === 'blocked'
          ? 'blocked'
          : 'future'
    return {
      entityId: node.id,
      label: node.stage.title,
      altitude: node.altitude,
      // Stage anchors stay fixed on the authored mountain spine. Alternate
      // route proposals may change diagnostic graph geometry, but must never
      // move the physical ledge used by generated scenario-card variants.
      x: position.x,
      y: position.y,
      state: stageState,
    }
  })
  return { sourceStageCount: ordered.length, anchors }
}
