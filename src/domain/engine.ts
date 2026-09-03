import { hashSeed, stableId } from './seed'
import type {
  CommandFailure,
  CommandResult,
  Mission,
  MissionCommand,
  MissionEvent,
  MissionEventType,
  MissionState,
  Path,
  PathDraft,
  Stage,
  StageDraft,
  SuccessCriterion,
} from './types'

export interface CreateMissionInput {
  title: string
  objective: string
  description?: string
  successCriteria?: string[]
  seed?: number
  originStage?: {
    title: string
    description: string
    successCriteria?: string[]
  }
}

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))
const failure = (code: CommandFailure['code'], message: string): CommandFailure => ({ ok: false, code, message })

function nextId(state: MissionState, prefix: string): string {
  return stableId(prefix, state.mission.seed, state.revision + state.events.length)
}

function addEvent(
  state: MissionState,
  type: MissionEventType,
  title: string,
  description: string,
  now: string,
  entityId?: string,
  metadata?: MissionEvent['metadata'],
) {
  state.events.push({
    id: nextId(state, 'evt'),
    missionId: state.mission.id,
    type,
    title,
    description,
    entityId,
    createdAt: now,
    metadata,
  })
}

function createStage(state: MissionState, draft: StageDraft, now: string): Stage {
  const id = draft.id ?? nextId(state, 'stage')
  return {
    id,
    missionId: state.mission.id,
    title: draft.title,
    description: draft.description,
    kind: draft.kind,
    status: draft.status ?? 'discovered',
    successCriteria: draft.successCriteria ?? [],
    dependencies: draft.dependencies ?? [],
    evidenceIds: [],
    confidence: clamp(draft.confidence ?? 0.7),
    risk: clamp(draft.risk ?? 0.3),
    order: Math.max(0, draft.order),
    effortWeight: Math.max(0.01, draft.effortWeight ?? 1),
    discoveredAt: now,
  }
}

function createPath(state: MissionState, draft: PathDraft, now: string): Path {
  const id = draft.id ?? nextId(state, 'path')
  return {
    id,
    missionId: state.mission.id,
    originStageId: draft.originStageId,
    destinationStageId: draft.destinationStageId,
    title: draft.title,
    description: draft.description,
    rationale: draft.rationale ?? '',
    estimatedEffort: clamp(draft.estimatedEffort ?? 0.5),
    estimatedRisk: clamp(draft.estimatedRisk ?? 0.4),
    confidence: clamp(draft.confidence ?? 0.7),
    status: draft.status ?? 'available',
    selected: draft.selected ?? false,
    discoveredAt: now,
  }
}

function ensurePathEndpoints(state: MissionState, path: PathDraft): CommandFailure | undefined {
  if (!state.stages[path.originStageId] || !state.stages[path.destinationStageId]) {
    return failure('NOT_FOUND', 'A path endpoint does not exist in this mission.')
  }
  if (path.originStageId === path.destinationStageId) {
    return failure('INVALID_INPUT', 'A path must connect two different stages.')
  }
}

function completionRatio(state: MissionState): number {
  const stages = Object.values(state.stages).filter((stage) => stage.kind !== 'origin')
  const total = stages.reduce((sum, stage) => sum + stage.effortWeight, 0)
  const completed = stages
    .filter((stage) => stage.status === 'completed')
    .reduce((sum, stage) => sum + stage.effortWeight, 0)
  return total === 0 ? 0 : clamp(completed / total)
}

function recalculate(state: MissionState) {
  state.mission.progressEstimate = Math.max(state.mission.progressEstimate, completionRatio(state))
}

export function createMission(input: CreateMissionInput, now = new Date().toISOString()): MissionState {
  const title = input.title.trim()
  const objective = input.objective.trim()
  const seed = input.seed ?? hashSeed(`${title}:${objective}`)
  const missionId = stableId('mission', seed, 0)
  const criteria: SuccessCriterion[] = (input.successCriteria?.length
    ? input.successCriteria
    : ['The objective is delivered and verified'])
    .map((description, index) => ({
      id: stableId('criterion', seed, index),
      description,
      required: true,
      verified: false,
      evidenceIds: [],
    }))
  const originId = stableId('stage_origin', seed, 0)
  const mission: Mission = {
    id: missionId,
    title,
    objective,
    description: input.description?.trim() ?? '',
    successCriteria: criteria,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    seed,
    activeStageId: originId,
    progressEstimate: 0,
    overallConfidence: 0.35,
    discoveryPercent: 8,
  }
  const state: MissionState = {
    schemaVersion: 2,
    revision: 0,
    mission,
    stages: {},
    paths: {},
    obstacles: {},
    decisions: {},
    evidence: {},
    events: [],
  }
  state.stages[originId] = {
    id: originId,
    missionId,
    title: input.originStage?.title ?? 'Mission origin',
    description: input.originStage?.description ?? 'The objective is established. Required work is not yet discovered.',
    kind: 'origin',
    status: 'active',
    successCriteria: input.originStage?.successCriteria ?? ['Mission objective is clear enough to analyze'],
    dependencies: [],
    evidenceIds: [],
    confidence: 1,
    risk: 0.05,
    order: 0,
    effortWeight: 0.01,
    discoveredAt: now,
    startedAt: now,
  }
  addEvent(state, 'mission_created', 'Mission created', `Mission accepted: ${objective}`, now, missionId)
  return state
}

export function applyCommand(current: MissionState, command: MissionCommand, now = new Date().toISOString()): CommandResult {
  const state = structuredClone(current)
  const mission = state.mission
  const succeed = (message: string, entityId?: string): CommandResult => {
    state.revision += 1
    mission.updatedAt = now
    recalculate(state)
    return { ok: true, state, entityId, message }
  }

  switch (command.type) {
    case 'discover_mission': {
      if (mission.status === 'completed' || mission.status === 'abandoned') {
        return failure('INVALID_TRANSITION', 'A finished mission cannot be rediscovered.')
      }
      mission.status = 'discovering'
      addEvent(state, 'mission_discovery_started', 'Mission discovery started', 'The agent is mapping known work and uncertainty.', now)
      for (const draft of command.stages) {
        const stage = createStage(state, draft, now)
        if (state.stages[stage.id]) return failure('INVALID_INPUT', `Duplicate stage id: ${stage.id}`)
        state.stages[stage.id] = stage
        addEvent(state, 'stage_discovered', `${stage.title} discovered`, stage.description, now, stage.id)
      }
      for (const draft of command.paths) {
        const endpointError = ensurePathEndpoints(state, draft)
        if (endpointError) return endpointError
        const path = createPath(state, draft, now)
        if (state.paths[path.id]) return failure('INVALID_INPUT', `Duplicate path id: ${path.id}`)
        state.paths[path.id] = path
        addEvent(state, 'path_discovered', `${path.title} discovered`, path.description, now, path.id)
      }
      mission.overallConfidence = clamp(command.confidence)
      mission.discoveryPercent = Math.round(clamp(command.discoveryPercent, 0, 100))
      mission.status = 'active'
      const origin = state.stages[mission.activeStageId ?? '']
      if (origin?.kind === 'origin') {
        origin.status = 'completed'
        origin.completedAt = now
      }
      const firstAvailable = Object.values(state.stages)
        .filter((stage) => stage.status === 'available')
        .sort((a, b) => a.order - b.order)[0]
      if (firstAvailable) mission.activeStageId = firstAvailable.id
      return succeed('Mission structure discovered.')
    }

    case 'propose_stage': {
      const stage = createStage(state, command.stage, now)
      if (state.stages[stage.id]) return failure('INVALID_INPUT', `Stage already exists: ${stage.id}`)
      state.stages[stage.id] = stage
      addEvent(state, 'stage_discovered', `${stage.title} discovered`, stage.description, now, stage.id)
      return succeed('Stage proposed.', stage.id)
    }

    case 'propose_path': {
      const endpointError = ensurePathEndpoints(state, command.path)
      if (endpointError) return endpointError
      const path = createPath(state, command.path, now)
      if (state.paths[path.id]) return failure('INVALID_INPUT', `Path already exists: ${path.id}`)
      state.paths[path.id] = path
      addEvent(state, 'path_discovered', `${path.title} discovered`, path.description, now, path.id)
      return succeed('Path proposed.', path.id)
    }

    case 'begin_stage': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      if (!['available', 'discovered'].includes(stage.status)) {
        return failure('INVALID_TRANSITION', `Stage is ${stage.status}, not available to begin.`)
      }
      const missingDependency = stage.dependencies.find((id) => state.stages[id]?.status !== 'completed')
      if (missingDependency) return failure('DEPENDENCY_INCOMPLETE', 'A stage dependency is incomplete.')
      const blocker = Object.values(state.obstacles).find(
        (obstacle) => obstacle.status !== 'resolved' && obstacle.blocks.includes(stage.id) && ['blocking', 'critical'].includes(obstacle.severity),
      )
      if (blocker) return failure('BLOCKED', `Stage is blocked by ${blocker.title}.`)
      Object.values(state.stages).forEach((item) => {
        if (item.status === 'active') item.status = 'available'
      })
      stage.status = 'active'
      stage.startedAt = now
      mission.activeStageId = stage.id
      mission.status = 'active'
      addEvent(state, 'stage_started', `${stage.title} started`, stage.description, now, stage.id)
      return succeed('Stage started.', stage.id)
    }

    case 'record_progress': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      if (stage.status !== 'active') return failure('INVALID_TRANSITION', 'Progress requires an active stage.')
      mission.progressEstimate = clamp(command.progressEstimate)
      addEvent(state, 'progress_recorded', `Progress at ${stage.title}`, command.description, now, stage.id, {
        estimate: mission.progressEstimate,
      })
      return succeed('Progress recorded.', stage.id)
    }

    case 'complete_stage': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      if (stage.status !== 'active') return failure('INVALID_TRANSITION', 'Only an active stage can be completed.')
      const blocker = Object.values(state.obstacles).find(
        (obstacle) => obstacle.status !== 'resolved' && obstacle.blocks.includes(stage.id) && ['blocking', 'critical'].includes(obstacle.severity),
      )
      if (blocker) return failure('BLOCKED', `Stage is blocked by ${blocker.title}.`)
      if (stage.successCriteria.length > 0 && stage.evidenceIds.length === 0 && stage.kind !== 'origin') {
        return failure('EVIDENCE_REQUIRED', 'Attach evidence before completing this stage.')
      }
      stage.status = 'completed'
      stage.completedAt = now
      Object.values(state.paths).forEach((path) => {
        if (path.destinationStageId !== stage.id) return
        if (path.selected) path.status = 'completed'
        else if (!['completed', 'abandoned', 'invalidated'].includes(path.status)) path.status = 'abandoned'
      })
      addEvent(state, 'stage_completed', `${stage.title} completed`, 'Evidence-backed work established a verified outcome.', now, stage.id)
      const next = Object.values(state.paths)
        .filter((path) => path.originStageId === stage.id && ['available', 'selected'].includes(path.status))
        .map((path) => state.stages[path.destinationStageId])
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)[0]
      if (next) {
        mission.activeStageId = next.id
        if (['hidden', 'discovered'].includes(next.status)) next.status = 'available'
      }
      return succeed('Stage completed.', stage.id)
    }

    case 'report_obstacle': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      const invalidBlock = command.blocks.find((id) => !state.stages[id] && !state.paths[id])
      if (invalidBlock) return failure('NOT_FOUND', `Blocked entity not found: ${invalidBlock}`)
      const obstacleId = nextId(state, 'obstacle')
      state.obstacles[obstacleId] = {
        id: obstacleId,
        missionId: mission.id,
        stageId: stage.id,
        title: command.title,
        description: command.description,
        category: command.category,
        severity: command.severity,
        source: command.source,
        evidenceIds: [],
        blocks: command.blocks,
        proposedPathIds: [],
        confidence: clamp(command.confidence),
        status: 'open',
        discoveredAt: now,
      }
      if (['blocking', 'critical'].includes(command.severity)) {
        mission.status = 'blocked'
        stage.status = 'blocked'
        command.blocks.forEach((id) => {
          if (state.paths[id]) state.paths[id].status = 'blocked'
          if (state.stages[id] && state.stages[id].status !== 'completed') state.stages[id].status = 'blocked'
        })
      }
      addEvent(state, 'obstacle_discovered', `Obstacle discovered: ${command.title}`, command.description, now, obstacleId)
      if (['blocking', 'critical'].includes(command.severity)) {
        addEvent(state, 'path_blocked', 'Current path blocked', `${command.title} prevents progress.`, now, obstacleId)
      }
      return succeed('Obstacle recorded.', obstacleId)
    }

    case 'resolve_obstacle': {
      const obstacle = state.obstacles[command.obstacleId]
      if (!obstacle) return failure('NOT_FOUND', 'Obstacle not found.')
      if (obstacle.status === 'resolved') return failure('INVALID_TRANSITION', 'Obstacle is already resolved.')
      obstacle.status = 'resolved'
      obstacle.resolvedAt = now
      obstacle.blocks.forEach((id) => {
        if (state.paths[id]?.status === 'blocked') state.paths[id].status = state.paths[id].selected ? 'selected' : 'available'
        if (state.stages[id]?.status === 'blocked') state.stages[id].status = 'available'
      })
      const stage = state.stages[obstacle.stageId]
      if (stage?.status === 'blocked') stage.status = 'available'
      mission.status = Object.values(state.decisions).some((decision) => !decision.resolvedAt) ? 'awaiting_human' : 'active'
      addEvent(state, 'obstacle_resolved', `Obstacle resolved: ${obstacle.title}`, command.resolution, now, obstacle.id)
      addEvent(state, 'path_reopened', 'Path reopened', 'The verified resolution allows work to continue.', now, obstacle.id)
      return succeed('Obstacle resolved.', obstacle.id)
    }

    case 'request_human_decision': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      if (command.options.length < 2) return failure('INVALID_INPUT', 'A decision requires at least two options.')
      if (new Set(command.options.map((option) => option.id)).size !== command.options.length) {
        return failure('INVALID_INPUT', 'Decision option ids must be unique.')
      }
      const decisionId = nextId(state, 'decision')
      state.decisions[decisionId] = {
        id: decisionId,
        missionId: mission.id,
        stageId: stage.id,
        question: command.question,
        context: command.context,
        options: command.options,
        recommendedOptionId: command.recommendedOptionId,
        requestedBy: command.requestedBy,
        requestedAt: now,
      }
      stage.status = 'awaiting_human'
      mission.status = 'awaiting_human'
      addEvent(state, 'human_decision_requested', 'Human decision required', command.question, now, decisionId)
      return succeed('Human decision requested.', decisionId)
    }

    case 'resolve_human_decision': {
      const decision = state.decisions[command.decisionId]
      if (!decision) return failure('NOT_FOUND', 'Decision not found.')
      if (decision.resolvedAt) return failure('INVALID_TRANSITION', 'Decision is already resolved.')
      const option = decision.options.find((item) => item.id === command.optionId)
      if (!option) return failure('INVALID_INPUT', 'Selected option is not available.')
      decision.selectedOptionId = option.id
      decision.resolvedAt = now
      const stage = state.stages[decision.stageId]
      const hasActiveBlocker = Object.values(state.obstacles).some(
        (obstacle) => obstacle.status !== 'resolved' && ['blocking', 'critical'].includes(obstacle.severity),
      )
      if (stage.status === 'awaiting_human') stage.status = hasActiveBlocker ? 'blocked' : 'available'
      mission.status = hasActiveBlocker ? 'blocked' : 'active'
      if (option.pathId) {
        const path = state.paths[option.pathId]
        if (!path || !['available', 'discovered', 'blocked'].includes(path.status)) {
          return failure('INVALID_TRANSITION', 'The path linked to this option is unavailable.')
        }
        Object.values(state.paths).forEach((candidate) => {
          if (candidate.originStageId === path.originStageId && candidate.id !== path.id) {
            candidate.selected = false
            if (candidate.status !== 'blocked') candidate.status = 'abandoned'
          }
        })
        path.selected = true
        if (path.status !== 'blocked') path.status = 'selected'
        mission.activePathId = path.id
        addEvent(state, 'path_selected', `${path.title} selected`, option.description, now, path.id)
      }
      addEvent(state, 'human_decision_resolved', 'Human decision recorded', option.label, now, decision.id)
      return succeed('Human decision recorded.', decision.id)
    }

    case 'attach_evidence': {
      if (command.stageId && !state.stages[command.stageId]) return failure('NOT_FOUND', 'Stage not found.')
      const criterion = command.criterionId
        ? mission.successCriteria.find((item) => item.id === command.criterionId)
        : undefined
      if (command.criterionId && !criterion) return failure('NOT_FOUND', 'Success criterion not found.')
      const evidenceId = nextId(state, 'evidence')
      state.evidence[evidenceId] = {
        ...command.evidence,
        id: evidenceId,
        missionId: mission.id,
        stageId: command.stageId,
        criterionId: command.criterionId,
        createdAt: now,
      }
      if (command.stageId) state.stages[command.stageId].evidenceIds.push(evidenceId)
      if (criterion) {
        criterion.evidenceIds.push(evidenceId)
        criterion.verified = true
      }
      addEvent(state, 'evidence_attached', `Evidence attached: ${command.evidence.title}`, command.evidence.description, now, evidenceId)
      return succeed('Evidence attached.', evidenceId)
    }

    case 'select_path': {
      const path = state.paths[command.pathId]
      if (!path) return failure('NOT_FOUND', 'Path not found.')
      if (!['available', 'discovered'].includes(path.status)) return failure('INVALID_TRANSITION', `Path is ${path.status}.`)
      Object.values(state.paths).forEach((candidate) => {
        if (candidate.originStageId === path.originStageId && candidate.id !== path.id && candidate.status !== 'completed') {
          candidate.selected = false
          candidate.status = candidate.status === 'blocked' ? 'blocked' : 'abandoned'
        }
      })
      path.selected = true
      path.status = 'selected'
      mission.activePathId = path.id
      addEvent(state, 'path_selected', `${path.title} selected`, path.rationale || path.description, now, path.id)
      return succeed('Path selected.', path.id)
    }

    case 'expand_scope': {
      if (state.stages[command.stage.id ?? '']) return failure('INVALID_INPUT', 'Expanded stage already exists.')
      const dependenciesReady = (command.stage.dependencies ?? []).every(
        (dependencyId) => state.stages[dependencyId]?.status === 'completed',
      )
      const inferredStatus = dependenciesReady ? 'available' : 'discovered'
      const stage = createStage(state, { ...command.stage, status: command.stage.status ?? inferredStatus }, now)
      state.stages[stage.id] = stage
      const draft = { ...command.path, destinationStageId: stage.id }
      const endpointError = ensurePathEndpoints(state, draft)
      if (endpointError) return endpointError
      const path = createPath(state, draft, now)
      state.paths[path.id] = path
      Object.values(state.paths).forEach((candidate) => {
        if (candidate.id === path.id || candidate.originStageId !== path.originStageId) return
        const destination = state.stages[candidate.destinationStageId]
        if (!destination || destination.order <= stage.order || ['completed', 'invalidated'].includes(candidate.status)) return
        candidate.selected = false
        candidate.status = 'abandoned'
      })
      mission.discoveryPercent = Math.max(5, mission.discoveryPercent - 12)
      mission.overallConfidence = clamp(mission.overallConfidence - 0.08)
      mission.progressEstimate = completionRatio(state)
      addEvent(state, 'scope_expanded', 'Required scope expanded', command.reason, now, stage.id)
      return succeed('Required scope expanded.', stage.id)
    }

    case 'invalidate_stage': {
      const stage = state.stages[command.stageId]
      if (!stage) return failure('NOT_FOUND', 'Stage not found.')
      if (stage.kind === 'origin') return failure('INVALID_TRANSITION', 'The mission origin cannot be invalidated.')
      stage.status = 'invalidated'
      stage.completedAt = undefined
      stage.evidenceIds = []
      Object.values(state.paths).forEach((path) => {
        if (path.originStageId === stage.id || path.destinationStageId === stage.id) path.status = 'invalidated'
      })
      mission.status = 'blocked'
      mission.progressEstimate = completionRatio(state)
      addEvent(state, 'stage_invalidated', `${stage.title} is no longer valid`, command.reason, now, stage.id)
      return succeed('Stage invalidated.', stage.id)
    }

    case 'verify_completion': {
      const unmet = mission.successCriteria.filter((criterion) => criterion.required && !criterion.verified)
      const completion = Object.values(state.stages).find((stage) => stage.kind === 'completion')
      const activeBlockers = Object.values(state.obstacles).filter(
        (obstacle) => obstacle.status !== 'resolved' && ['blocking', 'critical'].includes(obstacle.severity),
      )
      if (unmet.length > 0) return failure('EVIDENCE_REQUIRED', `${unmet.length} required success criterion remains unverified.`)
      if (activeBlockers.length > 0) return failure('BLOCKED', 'Blocking obstacles remain unresolved.')
      if (!completion) return failure('NOT_FOUND', 'No completion stage exists.')
      const dependenciesReady = completion.dependencies.every((id) => state.stages[id]?.status === 'completed')
      if (!dependenciesReady) return failure('DEPENDENCY_INCOMPLETE', 'Completion dependencies are not satisfied.')
      const viableCompletionPaths = Object.values(state.paths).filter((path) => (
        path.destinationStageId === completion.id
        && state.stages[path.originStageId]?.status === 'completed'
        && !['abandoned', 'invalidated'].includes(path.status)
      ))
      const completionPath = viableCompletionPaths.find((path) => path.selected)
        ?? (viableCompletionPaths.length === 1 ? viableCompletionPaths[0] : undefined)
      if (viableCompletionPaths.length > 0 && !completionPath) {
        return failure('INVALID_TRANSITION', 'Select one verified completion path before completing the mission.')
      }
      if (completionPath) {
        completionPath.selected = true
        completionPath.status = 'selected'
        mission.activePathId = completionPath.id
      }
      mission.status = 'completion_ready'
      mission.completionVerifiedAt = now
      completion.status = 'available'
      addEvent(state, 'completion_verified', 'Completion verified', 'All required success criteria have evidence and dependencies are satisfied.', now, completion.id)
      return succeed('Completion verified.', completion.id)
    }

    case 'complete_mission': {
      if (mission.status !== 'completion_ready' || !mission.completionVerifiedAt) {
        return failure('INVALID_TRANSITION', 'Verify completion before completing the mission.')
      }
      const completion = Object.values(state.stages).find((stage) => stage.kind === 'completion')
      if (!completion) return failure('NOT_FOUND', 'No completion stage exists.')
      completion.status = 'completed'
      completion.completedAt = now
      Object.values(state.paths).forEach((path) => {
        if (path.destinationStageId !== completion.id) return
        if (path.selected) path.status = 'completed'
        else if (!['completed', 'abandoned', 'invalidated'].includes(path.status)) path.status = 'abandoned'
      })
      mission.activeStageId = completion.id
      mission.progressEstimate = 1
      mission.status = 'completed'
      addEvent(state, 'mission_completed', 'Mission completed', mission.objective, now, completion.id)
      return succeed('Mission completed.', completion.id)
    }
  }
}
