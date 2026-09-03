import type { MissionEventType, MissionState, Obstacle } from '../../domain/types'

export type ExpeditionSceneKind =
  | 'basecamp'
  | 'normal_route'
  | 'camp'
  | 'fog'
  | 'crevasse_blocker'
  | 'route_fork'
  | 'secured_crossing'
  | 'new_ridge'
  | 'final_approach'
  | 'summit'

export type ExpeditionCameraPreset = 'overview_establishing' | 'overview_active' | 'overview_hazard' | 'overview_decision' | 'overview_reveal' | 'overview_summit'

export interface ExpeditionSceneSelection {
  kind: ExpeditionSceneKind
  stageId?: string
  pathId?: string
  focalEntityId?: string
  camera: ExpeditionCameraPreset
  transition: 'cut' | 'crossfade' | 'fog_reveal' | 'camera_track' | 'ridge_reveal'
  hud: 'minimal' | 'decision' | 'completion'
}

function eventScene(type?: MissionEventType): Pick<ExpeditionSceneSelection, 'kind' | 'camera' | 'transition'> | undefined {
  if (type === 'scope_expanded') return { kind: 'new_ridge', camera: 'overview_reveal', transition: 'ridge_reveal' }
  if (type === 'path_reopened' || type === 'obstacle_resolved') {
    return { kind: 'secured_crossing', camera: 'overview_hazard', transition: 'crossfade' }
  }
  if (type === 'completion_verified') return { kind: 'final_approach', camera: 'overview_reveal', transition: 'fog_reveal' }
  if (type === 'stage_completed') return { kind: 'camp', camera: 'overview_establishing', transition: 'crossfade' }
}

function blockerScene(obstacle: Obstacle): ExpeditionSceneKind {
  if (obstacle.category === 'deadline' || obstacle.category === 'external_service') return 'fog'
  return 'crevasse_blocker'
}

/**
 * Selects a physical mountain-overview state from mission semantics. Topology
 * remains authoritative for relationships but is never drawn by the production scene.
 */
export function selectExpeditionScene(state: MissionState): ExpeditionSceneSelection {
  const mission = state.mission
  const activeStage = state.stages[mission.activeStageId ?? '']
  const activePath = state.paths[mission.activePathId ?? '']
  const pendingDecision = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
  const blocker = Object.values(state.obstacles).find(
    (obstacle) => obstacle.status !== 'resolved' && ['blocking', 'critical'].includes(obstacle.severity),
  )
  const latestEvent = state.events.at(-1)
  const sceneEvent = [...state.events]
    .reverse()
    .find((event) => event.createdAt === latestEvent?.createdAt && eventScene(event.type))

  if (mission.status === 'completed' || activeStage?.kind === 'completion') {
    return { kind: 'summit', stageId: activeStage?.id, focalEntityId: activeStage?.id, camera: 'overview_summit', transition: 'fog_reveal', hud: 'completion' }
  }
  if (pendingDecision) {
    return { kind: 'route_fork', stageId: pendingDecision.stageId, focalEntityId: pendingDecision.id, camera: 'overview_decision', transition: 'camera_track', hud: 'decision' }
  }
  if (blocker) {
    return { kind: blockerScene(blocker), stageId: blocker.stageId, focalEntityId: blocker.id, camera: 'overview_hazard', transition: 'cut', hud: 'minimal' }
  }

  const eventDriven = eventScene(sceneEvent?.type)
  if (eventDriven) {
    return { ...eventDriven, stageId: activeStage?.id, pathId: activePath?.id, focalEntityId: sceneEvent?.entityId, hud: 'minimal' }
  }
  if (activeStage?.kind === 'origin') {
    return { kind: 'basecamp', stageId: activeStage.id, focalEntityId: activeStage.id, camera: 'overview_establishing', transition: 'crossfade', hud: 'minimal' }
  }
  if (activeStage?.kind === 'deployment' || activeStage?.kind === 'finalization' || mission.status === 'completion_ready') {
    return { kind: 'final_approach', stageId: activeStage?.id, pathId: activePath?.id, focalEntityId: activeStage?.id, camera: 'overview_reveal', transition: 'fog_reveal', hud: 'minimal' }
  }
  if (activeStage?.status === 'completed') {
    return { kind: 'camp', stageId: activeStage.id, focalEntityId: activeStage.id, camera: 'overview_establishing', transition: 'crossfade', hud: 'minimal' }
  }
  if (mission.discoveryPercent < 35) {
    return { kind: 'fog', stageId: activeStage?.id, pathId: activePath?.id, camera: 'overview_active', transition: 'fog_reveal', hud: 'minimal' }
  }
  return { kind: 'normal_route', stageId: activeStage?.id, pathId: activePath?.id, focalEntityId: activeStage?.id, camera: 'overview_active', transition: 'camera_track', hud: 'minimal' }
}
