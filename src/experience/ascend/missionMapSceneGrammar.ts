import type { MissionState, Obstacle } from '../../domain/types'
import type { MountainTopology, TopologyNode, TopologyPoint } from './topology'

export type VisualArchetype =
  | 'BASECAMP'
  | 'ASCENT'
  | 'CAMP'
  | 'FOG'
  | 'CREVASSE'
  | 'CLIFF'
  | 'PASS'
  | 'STORM'
  | 'ROUTE_FORK'
  | 'ANCHOR'
  | 'NEW_RIDGE'
  | 'INVALID_ROUTE'
  | 'FINAL_APPROACH'
  | 'SUMMIT'

export interface MissionMapSceneInstruction {
  id: string
  archetype: VisualArchetype
  position: TopologyPoint
  entityId?: string
  label: string
  intensity: number
  interactive: boolean
}

function obstacleArchetype(obstacle: Obstacle): VisualArchetype {
  if (obstacle.category === 'deadline' || obstacle.category === 'external_service') return 'STORM'
  if (obstacle.category === 'approval' || obstacle.category === 'policy') return 'PASS'
  if (obstacle.category === 'technical' && obstacle.severity !== 'blocking') return 'CLIFF'
  return 'CREVASSE'
}

function nodeArchetype(node: TopologyNode): VisualArchetype {
  if (node.stage.kind === 'origin') return 'BASECAMP'
  if (node.stage.kind === 'completion') return 'SUMMIT'
  if (node.stage.kind === 'finalization' || node.stage.kind === 'deployment') return 'FINAL_APPROACH'
  if (node.stage.status === 'invalidated') return 'INVALID_ROUTE'
  if (node.stage.kind === 'approval' && node.stage.evidenceIds.length > 0) return 'ANCHOR'
  return 'CAMP'
}

function entityPosition(topology: MountainTopology, entityId: string): TopologyPoint {
  const node = topology.nodes.find((item) => item.id === entityId)
  if (node) return { x: node.x, y: node.y }
  const route = topology.routes.find((item) => item.id === entityId)
  return route?.points[1] ?? { x: 0.5, y: 0.5 }
}

/** Instructions for the optional zoomed-out diagnostic Mission Map only. */
export function resolveMissionMapScene(state: MissionState, topology: MountainTopology): MissionMapSceneInstruction[] {
  const instructions: MissionMapSceneInstruction[] = topology.nodes.map((node) => ({
    id: `visual_${node.id}`,
    archetype: node.hidden ? 'FOG' : nodeArchetype(node),
    position: { x: node.x, y: node.y },
    entityId: node.id,
    label: node.hidden ? 'Unsurveyed terrain' : node.stage.title,
    intensity: node.stage.status === 'active' ? 1 : node.stage.status === 'completed' ? 0.8 : 0.55,
    interactive: true,
  }))

  Object.values(state.obstacles)
    .filter((obstacle) => obstacle.status !== 'resolved')
    .forEach((obstacle) => {
      const blockedTarget = obstacle.blocks[0] ?? obstacle.stageId
      instructions.push({
        id: `visual_${obstacle.id}`,
        archetype: obstacleArchetype(obstacle),
        position: entityPosition(topology, blockedTarget),
        entityId: obstacle.id,
        label: obstacle.title,
        intensity: obstacle.severity === 'critical' ? 1 : 0.85,
        interactive: true,
      })
    })

  Object.values(state.decisions)
    .filter((decision) => !decision.resolvedAt)
    .forEach((decision) => {
      instructions.push({
        id: `visual_${decision.id}`,
        archetype: 'ROUTE_FORK',
        position: entityPosition(topology, decision.stageId),
        entityId: decision.id,
        label: decision.question,
        intensity: 1,
        interactive: true,
      })
    })

  state.events
    .filter((event) => event.type === 'scope_expanded' && event.entityId)
    .slice(-1)
    .forEach((event) => {
      instructions.push({
        id: `visual_ridge_${event.id}`,
        archetype: 'NEW_RIDGE',
        position: entityPosition(topology, event.entityId as string),
        entityId: event.entityId,
        label: event.title,
        intensity: 0.9,
        interactive: true,
      })
    })

  return instructions
}
