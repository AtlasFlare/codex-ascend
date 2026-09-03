import type { HumanDecision, Mission, MissionEvent, MissionState, Obstacle, Stage } from './types'

export interface NarratorInput {
  revision: number
  mission: Pick<Mission, 'id' | 'title' | 'objective' | 'status' | 'progressEstimate' | 'overallConfidence' | 'discoveryPercent'>
  activeStage?: Pick<Stage, 'id' | 'title' | 'description' | 'kind' | 'status' | 'order'>
  openObstacles: Array<Pick<Obstacle, 'id' | 'title' | 'severity' | 'stageId' | 'blocks'>>
  pendingDecisions: Array<Pick<HumanDecision, 'id' | 'question' | 'stageId' | 'requestedBy'>>
  recentEvents: Array<Pick<MissionEvent, 'id' | 'type' | 'title' | 'description' | 'entityId' | 'createdAt'>>
}

export type NarratorTone = 'calm' | 'progress' | 'caution' | 'blocked' | 'decision' | 'success'

export interface NarratorAnnouncement {
  text: string
  tone: NarratorTone
  priority: 'polite' | 'assertive'
  entityId?: string
}

export interface NarratorOutput {
  headline: string
  summary: string
  stateLabel: string
  announcements: NarratorAnnouncement[]
  metrics: Array<{ id: string; label: string; value: string }>
}

export function createNarratorInput(state: MissionState): NarratorInput {
  const activeStage = state.stages[state.mission.activeStageId ?? '']
  return {
    revision: state.revision,
    mission: {
      id: state.mission.id,
      title: state.mission.title,
      objective: state.mission.objective,
      status: state.mission.status,
      progressEstimate: state.mission.progressEstimate,
      overallConfidence: state.mission.overallConfidence,
      discoveryPercent: state.mission.discoveryPercent,
    },
    activeStage,
    openObstacles: Object.values(state.obstacles).filter((obstacle) => obstacle.status !== 'resolved'),
    pendingDecisions: Object.values(state.decisions).filter((decision) => !decision.resolvedAt),
    recentEvents: state.events.slice(-8),
  }
}
