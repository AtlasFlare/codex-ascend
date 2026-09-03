import type { MissionState } from '../../domain/types'

export function missionDetailEvidenceCount(state: MissionState, stageId: string) {
  const stage = state.stages[stageId]
  if (!stage) return 0
  const evidenceIds = new Set(stage.evidenceIds)
  if (stage.kind === 'completion') {
    state.mission.successCriteria.forEach((criterion) => criterion.evidenceIds.forEach((id) => evidenceIds.add(id)))
  }
  return evidenceIds.size
}
