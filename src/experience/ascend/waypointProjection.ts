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
      x: clamp(0.68 - progress * 0.2, 0.44, 0.72),
      y: clamp(0.79 - progress * 0.59, 0.18, 0.82),
      state: stageState,
    }
  })
  return { sourceStageCount: ordered.length, anchors }
}
