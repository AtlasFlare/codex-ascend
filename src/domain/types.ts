export type MissionStatus =
  | 'draft'
  | 'discovering'
  | 'active'
  | 'blocked'
  | 'awaiting_human'
  | 'completion_ready'
  | 'completed'
  | 'abandoned'

export type StageKind =
  | 'origin'
  | 'planning'
  | 'research'
  | 'implementation'
  | 'validation'
  | 'approval'
  | 'deployment'
  | 'finalization'
  | 'completion'

export type StageStatus =
  | 'hidden'
  | 'discovered'
  | 'available'
  | 'active'
  | 'blocked'
  | 'awaiting_human'
  | 'completed'
  | 'invalidated'

export type PathStatus =
  | 'unknown'
  | 'discovered'
  | 'available'
  | 'selected'
  | 'blocked'
  | 'completed'
  | 'abandoned'
  | 'invalidated'

export type ObstacleCategory =
  | 'dependency'
  | 'test_failure'
  | 'missing_information'
  | 'missing_credentials'
  | 'external_service'
  | 'regression'
  | 'policy'
  | 'deadline'
  | 'budget'
  | 'technical'
  | 'approval'
  | 'unknown'

export type ObstacleSeverity = 'informational' | 'risk' | 'degrading' | 'blocking' | 'critical'
export type ObstacleStatus = 'open' | 'mitigating' | 'resolved'

export interface SuccessCriterion {
  id: string
  description: string
  required: boolean
  verified: boolean
  evidenceIds: string[]
}

export interface Mission {
  id: string
  title: string
  objective: string
  description: string
  successCriteria: SuccessCriterion[]
  status: MissionStatus
  createdAt: string
  updatedAt: string
  seed: number
  activeStageId?: string
  activePathId?: string
  progressEstimate: number
  overallConfidence: number
  discoveryPercent: number
  completionVerifiedAt?: string
}

export interface Stage {
  id: string
  missionId: string
  title: string
  description: string
  kind: StageKind
  status: StageStatus
  successCriteria: string[]
  dependencies: string[]
  evidenceIds: string[]
  confidence: number
  risk: number
  order: number
  effortWeight: number
  discoveredAt: string
  startedAt?: string
  completedAt?: string
}

export interface Path {
  id: string
  missionId: string
  originStageId: string
  destinationStageId: string
  title: string
  description: string
  rationale: string
  estimatedEffort: number
  estimatedRisk: number
  confidence: number
  status: PathStatus
  selected: boolean
  discoveredAt: string
}

export interface Obstacle {
  id: string
  missionId: string
  stageId: string
  title: string
  description: string
  category: ObstacleCategory
  severity: ObstacleSeverity
  source: string
  evidenceIds: string[]
  blocks: string[]
  proposedPathIds: string[]
  confidence: number
  status: ObstacleStatus
  discoveredAt: string
  resolvedAt?: string
}

export interface HumanDecisionOption {
  id: string
  label: string
  description: string
  pathId?: string
  effort: number
  risk: number
}

export interface HumanDecision {
  id: string
  missionId: string
  stageId: string
  question: string
  context: string
  options: HumanDecisionOption[]
  recommendedOptionId?: string
  selectedOptionId?: string
  requestedBy: string
  requestedAt: string
  resolvedAt?: string
}

export interface Evidence {
  id: string
  missionId: string
  stageId?: string
  criterionId?: string
  type: 'test' | 'commit' | 'screenshot' | 'artifact' | 'approval' | 'deployment' | 'report' | 'result'
  title: string
  description: string
  source: string
  reference: string
  createdAt: string
}

export type MissionEventType =
  | 'mission_created'
  | 'mission_discovery_started'
  | 'stage_discovered'
  | 'path_discovered'
  | 'path_selected'
  | 'stage_started'
  | 'progress_recorded'
  | 'stage_completed'
  | 'obstacle_discovered'
  | 'obstacle_resolved'
  | 'human_decision_requested'
  | 'human_decision_resolved'
  | 'evidence_attached'
  | 'path_blocked'
  | 'path_reopened'
  | 'stage_invalidated'
  | 'scope_expanded'
  | 'completion_revealed'
  | 'completion_verified'
  | 'mission_completed'

export interface MissionEvent {
  id: string
  missionId: string
  type: MissionEventType
  title: string
  description: string
  entityId?: string
  createdAt: string
  metadata?: Record<string, string | number | boolean>
}

export interface MissionState {
  schemaVersion: 2
  revision: number
  mission: Mission
  stages: Record<string, Stage>
  paths: Record<string, Path>
  obstacles: Record<string, Obstacle>
  decisions: Record<string, HumanDecision>
  evidence: Record<string, Evidence>
  events: MissionEvent[]
}

export interface CommandSuccess {
  ok: true
  state: MissionState
  entityId?: string
  message: string
}

export interface CommandFailure {
  ok: false
  code:
    | 'NOT_FOUND'
    | 'INVALID_TRANSITION'
    | 'BLOCKED'
    | 'DEPENDENCY_INCOMPLETE'
    | 'EVIDENCE_REQUIRED'
    | 'DECISION_REQUIRED'
    | 'INVALID_INPUT'
  message: string
}

export type CommandResult = CommandSuccess | CommandFailure

export interface StageDraft {
  id?: string
  title: string
  description: string
  kind: StageKind
  status?: StageStatus
  successCriteria?: string[]
  dependencies?: string[]
  confidence?: number
  risk?: number
  order: number
  effortWeight?: number
}

export interface PathDraft {
  id?: string
  originStageId: string
  destinationStageId: string
  title: string
  description: string
  rationale?: string
  estimatedEffort?: number
  estimatedRisk?: number
  confidence?: number
  status?: PathStatus
  selected?: boolean
}

export type MissionCommand =
  | { type: 'discover_mission'; stages: StageDraft[]; paths: PathDraft[]; confidence: number; discoveryPercent: number }
  | { type: 'propose_stage'; stage: StageDraft }
  | { type: 'propose_path'; path: PathDraft }
  | { type: 'begin_stage'; stageId: string }
  | { type: 'record_progress'; stageId: string; description: string; progressEstimate: number }
  | { type: 'complete_stage'; stageId: string }
  | {
      type: 'report_obstacle'
      stageId: string
      title: string
      description: string
      category: ObstacleCategory
      severity: ObstacleSeverity
      source: string
      blocks: string[]
      confidence: number
    }
  | { type: 'resolve_obstacle'; obstacleId: string; resolution: string }
  | {
      type: 'request_human_decision'
      stageId: string
      question: string
      context: string
      options: HumanDecisionOption[]
      recommendedOptionId?: string
      requestedBy: string
    }
  | { type: 'resolve_human_decision'; decisionId: string; optionId: string }
  | {
      type: 'attach_evidence'
      stageId?: string
      criterionId?: string
      evidence: Omit<Evidence, 'id' | 'missionId' | 'createdAt' | 'stageId' | 'criterionId'>
    }
  | { type: 'select_path'; pathId: string }
  | { type: 'expand_scope'; stage: StageDraft; path: PathDraft; reason: string }
  | { type: 'invalidate_stage'; stageId: string; reason: string }
  | { type: 'verify_completion' }
  | { type: 'complete_mission' }
