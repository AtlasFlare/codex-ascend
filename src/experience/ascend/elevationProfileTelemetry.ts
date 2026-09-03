import type { MissionState } from '../../domain/types'
import type { MountainTopology } from './topology'

export const getSurveyedPercent = (topology: MountainTopology, discoveryPercent: number) => {
  if (topology.nodes.length <= 1) return Math.round(discoveryPercent)
  return Math.round((topology.nodes.filter((node) => !node.hidden).length / topology.nodes.length) * 100)
}

export type ElevationCheckpointSignal =
  | { kind: 'decision'; label: 'Decision' }
  | { kind: 'blocker'; label: 'Blocked' }
  | { kind: 'evidence'; label: string; count: number }
  | { kind: 'none'; label: '' }

export function getElevationCheckpointSignal(state: MissionState, stageId: string): ElevationCheckpointSignal {
  const decision = Object.values(state.decisions).find((item) => item.stageId === stageId && !item.resolvedAt)
  if (decision) return { kind: 'decision', label: 'Decision' }

  const blocker = Object.values(state.obstacles).find((item) => item.stageId === stageId && item.status !== 'resolved')
  if (blocker) return { kind: 'blocker', label: 'Blocked' }

  const stage = state.stages[stageId]
  const evidenceIds = new Set(stage?.evidenceIds ?? [])
  if (stage?.kind === 'completion') {
    state.mission.successCriteria.forEach((criterion) => criterion.evidenceIds.forEach((id) => evidenceIds.add(id)))
  }
  if (evidenceIds.size > 0) return { kind: 'evidence', label: `${evidenceIds.size} evidence`, count: evidenceIds.size }
  return { kind: 'none', label: '' }
}
