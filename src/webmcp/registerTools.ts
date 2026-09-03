import { z } from 'zod'
import type { MissionCommand, MissionState } from '../domain/types'
import type { MissionStore } from '../state/missionStore'

const closedObject = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})
const stringField = (description: string) => ({ type: 'string', description })
const numberField = (description: string, minimum = 0, maximum = 1) => ({ type: 'number', minimum, maximum, description })
const idField = stringField('Existing mission entity id.')

const stageKind = z.enum([
  'origin',
  'planning',
  'research',
  'implementation',
  'validation',
  'approval',
  'deployment',
  'finalization',
  'completion',
])
const obstacleCategory = z.enum([
  'dependency',
  'test_failure',
  'missing_information',
  'missing_credentials',
  'external_service',
  'regression',
  'policy',
  'deadline',
  'budget',
  'technical',
  'approval',
  'unknown',
])
const obstacleSeverity = z.enum(['informational', 'risk', 'degrading', 'blocking', 'critical'])

const handoffSchema = z.object({
  handoffId: z.string().min(1).max(120).optional(),
  projectId: z.string().min(1).max(120),
  projectName: z.string().min(1).max(120),
  objective: z.string().min(1).max(1000),
  summary: z.string().min(1).max(2000),
  phase: z.string().min(1).max(120),
  activeWork: z.array(z.string().min(1).max(300)).max(12).default([]),
  constraints: z.array(z.string().min(1).max(300)).max(12).default([]),
  risks: z.array(z.string().min(1).max(300)).max(12).default([]),
  evidence: z.array(z.string().min(1).max(500)).max(12).default([]),
})

const stageDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  stageKind,
  order: z.number().min(0),
  effortWeight: z.number().positive().default(1),
  dependencyIds: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  risk: z.number().min(0).max(1).default(0.3),
})
const pathDraftSchema = z.object({
  id: z.string().optional(),
  originStageId: z.string(),
  destinationStageId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().default(''),
  effort: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.4),
  confidence: z.number().min(0).max(1).default(0.7),
})

function summarize(state: MissionState) {
  const active = state.stages[state.mission.activeStageId ?? '']
  return {
    revision: state.revision,
    mission: {
      id: state.mission.id,
      objective: state.mission.objective,
      status: state.mission.status,
      confidence: state.mission.overallConfidence,
      discoveryPercent: state.mission.discoveryPercent,
      progressEstimate: state.mission.progressEstimate,
    },
    activeStage: active ? { id: active.id, title: active.title, kind: active.kind, status: active.status } : null,
    stages: Object.values(state.stages).map(({ id, title, kind, status, dependencies, evidenceIds }) => ({
      id,
      title,
      kind,
      status,
      dependencies,
      evidenceCount: evidenceIds.length,
    })),
    paths: Object.values(state.paths).map(({ id, title, originStageId, destinationStageId, status, selected }) => ({
      id,
      title,
      from: originStageId,
      to: destinationStageId,
      status,
      selected,
    })),
    obstacles: Object.values(state.obstacles)
      .filter((obstacle) => obstacle.status !== 'resolved')
      .map(({ id, title, severity, blocks }) => ({ id, title, severity, blocks })),
    pendingDecisions: Object.values(state.decisions)
      .filter((decision) => !decision.resolvedAt)
      .map(({ id, question }) => ({ id, question })),
    successCriteria: state.mission.successCriteria.map(({ id, description, verified }) => ({ id, description, verified })),
    recentEvents: state.events.slice(-5).map(({ type, title }) => ({ type, title })),
    completionReady: state.mission.status === 'completion_ready' || state.mission.status === 'completed',
  }
}

function compact(value: unknown): string {
  const serialized = JSON.stringify(value)
  return serialized.length <= 1500
    ? serialized
    : JSON.stringify({ ok: true, truncated: true, summary: serialized.slice(0, 1350) })
}

function compactInspection(state: MissionState): string {
  const full = { ok: true, ...summarize(state) }
  const serialized = JSON.stringify(full)
  if (serialized.length <= 1500) return serialized
  const compactState = {
    ok: true,
    revision: full.revision,
    mission: full.mission,
    activeStage: full.activeStage,
    stages: full.stages.map(({ id, status }) => [id, status]),
    paths: full.paths.map(({ id, status, selected }) => [id, status, selected ? 1 : 0]),
    obstacles: full.obstacles,
    pendingDecisions: full.pendingDecisions,
    successCriteria: full.successCriteria.map(({ id, verified }) => [id, verified ? 1 : 0]),
    recentEvents: full.recentEvents.map(({ type }) => type),
    completionReady: full.completionReady,
  }
  const compactSerialized = JSON.stringify(compactState)
  if (compactSerialized.length <= 1500) return compactSerialized
  return JSON.stringify({
    ok: true,
    revision: full.revision,
    mission: full.mission,
    activeStage: full.activeStage,
    obstacles: full.obstacles,
    pendingDecisions: full.pendingDecisions,
    successCriteria: compactState.successCriteria,
    recentEvents: compactState.recentEvents,
    completionReady: full.completionReady,
    totals: { stages: full.stages.length, paths: full.paths.length },
  })
}

export interface WebMcpToolRegistration {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  readOnly?: boolean
  execute: (input: unknown) => string
}

function parseOrError<T>(schema: z.ZodType<T>, input: unknown): { data: T } | { error: string } {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') }
  return { data: parsed.data }
}

function commandResponse(store: MissionStore, name: string, command: MissionCommand): string {
  const result = store.execute(command)
  store.recordToolCall(name, result.ok, result.message)
  if (!result.ok) return compact(result)
  return compact({
    ok: true,
    message: result.message,
    entityId: result.entityId,
    revision: result.state.revision,
    status: result.state.mission.status,
  })
}

function commandTool<T>(
  store: MissionStore,
  definition: Omit<WebMcpToolRegistration, 'execute'>,
  schema: z.ZodType<T>,
  toCommand: (input: T) => MissionCommand,
): WebMcpToolRegistration {
  return {
    ...definition,
    execute(input) {
      const parsed = parseOrError(schema, input)
      if ('error' in parsed) {
        store.recordToolCall(definition.name, false, parsed.error)
        return compact({ ok: false, code: 'INVALID_INPUT', message: parsed.error })
      }
      return commandResponse(store, definition.name, toCommand(parsed.data))
    },
  }
}

export function createWebMcpToolDefinitions(store: MissionStore): WebMcpToolRegistration[] {
  const emptySchema = z.object({}).strict()
  const stageFields = {
    id: stringField('Optional stable stage id.'),
    title: stringField('Meaningful stage title.'),
    description: stringField('Outcome delivered by this stage.'),
    stageKind: { type: 'string', enum: stageKind.options },
    order: numberField('Relative position in the mission sequence.', 0, 100000),
    effortWeight: numberField('Relative contribution to mission progress.', 0.01, 1000),
    dependencyIds: { type: 'array', items: { type: 'string' } },
    successCriteria: { type: 'array', items: { type: 'string' } },
    confidence: numberField('Confidence in this stage.'),
    risk: numberField('Estimated stage risk.'),
  }
  const pathFields = {
    id: stringField('Optional stable path id.'),
    originStageId: idField,
    destinationStageId: idField,
    title: stringField('Human-readable strategy name.'),
    description: stringField('What this path accomplishes.'),
    rationale: stringField('Why the path is useful.'),
    effort: numberField('Relative effort.'),
    risk: numberField('Relative risk.'),
    confidence: numberField('Confidence this path works.'),
  }
  const toStage = (input: z.infer<typeof stageDraftSchema>) => ({
    id: input.id,
    title: input.title,
    description: input.description,
    kind: input.stageKind,
    order: input.order,
    effortWeight: input.effortWeight,
    dependencies: input.dependencyIds,
    successCriteria: input.successCriteria,
    confidence: input.confidence,
    risk: input.risk,
  })
  const toPath = (input: z.infer<typeof pathDraftSchema>) => ({
    id: input.id,
    originStageId: input.originStageId,
    destinationStageId: input.destinationStageId,
    title: input.title,
    description: input.description,
    rationale: input.rationale,
    estimatedEffort: input.effort,
    estimatedRisk: input.risk,
    confidence: input.confidence,
  })

  const inspect: WebMcpToolRegistration = {
    name: 'inspect_mission',
    title: 'Inspect mission',
    description: 'Read the current mission graph, blockers, decisions, evidence readiness, and recent events.',
    inputSchema: closedObject({}),
    readOnly: true,
    execute(input) {
      const parsed = parseOrError(emptySchema, input)
      if ('error' in parsed) return compact({ ok: false, code: 'INVALID_INPUT', message: parsed.error })
      store.recordToolCall('inspect_mission', true, 'Mission state inspected.')
      return compactInspection(store.getSnapshot().mission)
    },
  }

  const discoverSchema = z.object({
    stages: z.array(stageDraftSchema).min(1),
    paths: z.array(pathDraftSchema),
    confidence: z.number().min(0).max(1),
    discoveryPercent: z.number().min(0).max(100),
  })
  const discover = commandTool(
    store,
    {
      name: 'discover_mission',
      title: 'Discover mission structure',
      description: 'Propose the initial mission stages and connecting paths after analyzing the objective.',
      inputSchema: closedObject(
        {
          stages: { type: 'array', items: closedObject(stageFields, ['title', 'description', 'stageKind', 'order']) },
          paths: { type: 'array', items: closedObject(pathFields, ['originStageId', 'destinationStageId', 'title', 'description']) },
          confidence: numberField('Overall mission confidence.'),
          discoveryPercent: numberField('Percent of required work currently understood.', 0, 100),
        },
        ['stages', 'paths', 'confidence', 'discoveryPercent'],
      ),
    },
    discoverSchema,
    (input) => ({
      type: 'discover_mission',
      stages: input.stages.map((stage) => ({ ...toStage(stage), status: 'discovered' })),
      paths: input.paths.map((path) => ({ ...toPath(path), status: 'available' })),
      confidence: input.confidence,
      discoveryPercent: input.discoveryPercent,
    }),
  )

  const proposeStage = commandTool(
    store,
    {
      name: 'propose_stage',
      title: 'Propose stage',
      description: 'Add a meaningful mission stage without changing presentation state directly.',
      inputSchema: closedObject(stageFields, ['title', 'description', 'stageKind', 'order']),
    },
    stageDraftSchema,
    (input) => ({ type: 'propose_stage', stage: toStage(input) }),
  )
  const proposePath = commandTool(
    store,
    {
      name: 'propose_path',
      title: 'Propose path',
      description: 'Add a logical path between existing stages, including an alternate strategy.',
      inputSchema: closedObject(pathFields, ['originStageId', 'destinationStageId', 'title', 'description']),
    },
    pathDraftSchema,
    (input) => ({ type: 'propose_path', path: toPath(input) }),
  )

  const stageIdSchema = z.object({ stageId: z.string() })
  const beginStage = commandTool(
    store,
    {
      name: 'begin_stage',
      title: 'Begin stage',
      description: 'Start work at an available stage after dependencies and blockers are checked.',
      inputSchema: closedObject({ stageId: idField }, ['stageId']),
    },
    stageIdSchema,
    (input) => ({ type: 'begin_stage', stageId: input.stageId }),
  )
  const completeStage = commandTool(
    store,
    {
      name: 'complete_stage',
      title: 'Complete stage',
      description: 'Complete an active stage only when blockers are clear and required evidence exists.',
      inputSchema: closedObject({ stageId: idField }, ['stageId']),
    },
    stageIdSchema,
    (input) => ({ type: 'complete_stage', stageId: input.stageId }),
  )

  const progressSchema = z.object({ stageId: z.string(), description: z.string().min(1), progressEstimate: z.number().min(0).max(1) })
  const recordProgress = commandTool(
    store,
    {
      name: 'record_progress',
      title: 'Record progress',
      description: 'Record meaningful active work without falsely completing the stage.',
      inputSchema: closedObject(
        { stageId: idField, description: stringField('Meaningful progress made.'), progressEstimate: numberField('Cautious completion estimate.') },
        ['stageId', 'description', 'progressEstimate'],
      ),
    },
    progressSchema,
    (input) => ({ type: 'record_progress', ...input }),
  )

  const obstacleSchema = z.object({
    stageId: z.string(),
    title: z.string().min(1),
    description: z.string().min(1),
    category: obstacleCategory,
    severity: obstacleSeverity,
    source: z.string().min(1),
    blocks: z.array(z.string()).min(1),
    confidence: z.number().min(0).max(1),
  })
  const reportObstacle = commandTool(
    store,
    {
      name: 'report_obstacle',
      title: 'Report obstacle',
      description: 'Record an execution problem and the mission entities it blocks.',
      inputSchema: closedObject(
        {
          stageId: idField,
          title: stringField('Concise obstacle title.'),
          description: stringField('Observed problem and impact.'),
          category: { type: 'string', enum: obstacleCategory.options },
          severity: { type: 'string', enum: obstacleSeverity.options },
          source: stringField('Evidence source or discovery method.'),
          blocks: { type: 'array', items: { type: 'string' }, minItems: 1 },
          confidence: numberField('Confidence the diagnosis is correct.'),
        },
        ['stageId', 'title', 'description', 'category', 'severity', 'source', 'blocks', 'confidence'],
      ),
    },
    obstacleSchema,
    (input) => ({ type: 'report_obstacle', ...input }),
  )

  const resolveObstacleSchema = z.object({ obstacleId: z.string(), resolution: z.string().min(1) })
  const resolveObstacle = commandTool(
    store,
    {
      name: 'resolve_obstacle',
      title: 'Resolve obstacle',
      description: 'Resolve an existing obstacle with a concrete explanation of what changed.',
      inputSchema: closedObject({ obstacleId: idField, resolution: stringField('Verified resolution.') }, ['obstacleId', 'resolution']),
    },
    resolveObstacleSchema,
    (input) => ({ type: 'resolve_obstacle', ...input }),
  )

  const decisionSchema = z.object({
    stageId: z.string(),
    question: z.string().min(1),
    context: z.string().min(1),
    requestedBy: z.string().min(1),
    recommendedOptionId: z.string().optional(),
    options: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      pathId: z.string().optional(),
      effort: z.number().min(0).max(1),
      risk: z.number().min(0).max(1),
    })).min(2),
  })
  const requestDecision = commandTool(
    store,
    {
      name: 'request_human_decision',
      title: 'Request human decision',
      description: 'Pause the mission and ask the human to choose between meaningful strategies.',
      inputSchema: closedObject(
        {
          stageId: idField,
          question: stringField('Decision the human must make.'),
          context: stringField('Why this decision is necessary.'),
          requestedBy: stringField('Agent or actor requesting the decision.'),
          recommendedOptionId: stringField('Optional recommended option id.'),
          options: {
            type: 'array',
            minItems: 2,
            items: closedObject(
              {
                id: stringField('Stable option id.'),
                label: stringField('Short human label.'),
                description: stringField('Strategy outcome.'),
                pathId: stringField('Optional linked path id.'),
                effort: numberField('Relative effort.'),
                risk: numberField('Relative risk.'),
              },
              ['id', 'label', 'description', 'effort', 'risk'],
            ),
          },
        },
        ['stageId', 'question', 'context', 'requestedBy', 'options'],
      ),
    },
    decisionSchema,
    (input) => ({ type: 'request_human_decision', ...input }),
  )

  const inspectDecisionSchema = z.object({ decisionId: z.string() })
  const inspectDecision: WebMcpToolRegistration = {
    name: 'inspect_human_decision',
    title: 'Inspect human decision',
    description: 'Read whether the human selected a requested option and retrieve the structured response.',
    inputSchema: closedObject({ decisionId: idField }, ['decisionId']),
    readOnly: true,
    execute(input) {
      const parsed = parseOrError(inspectDecisionSchema, input)
      if ('error' in parsed) return compact({ ok: false, code: 'INVALID_INPUT', message: parsed.error })
      const decision = store.getSnapshot().mission.decisions[parsed.data.decisionId]
      const ok = Boolean(decision)
      store.recordToolCall('inspect_human_decision', ok, ok ? 'Human decision inspected.' : 'Decision not found.')
      return compact(decision ? { ok: true, decision } : { ok: false, code: 'NOT_FOUND', message: 'Decision not found.' })
    },
  }

  const evidenceSchema = z.object({
    stageId: z.string().optional(),
    criterionId: z.string().optional(),
    evidenceType: z.enum(['test', 'commit', 'screenshot', 'artifact', 'approval', 'deployment', 'report', 'result']),
    title: z.string().min(1),
    description: z.string().min(1),
    source: z.string().min(1),
    reference: z.string().min(1),
  })
  const attachEvidence = commandTool(
    store,
    {
      name: 'attach_evidence',
      title: 'Attach evidence',
      description: 'Associate verifiable proof with a stage or required mission success criterion.',
      inputSchema: closedObject(
        {
          stageId: idField,
          criterionId: idField,
          evidenceType: { type: 'string', enum: ['test', 'commit', 'screenshot', 'artifact', 'approval', 'deployment', 'report', 'result'] },
          title: stringField('Evidence title.'),
          description: stringField('What this evidence proves.'),
          source: stringField('Evidence producer.'),
          reference: stringField('Artifact, URL, commit, or result reference.'),
        },
        ['evidenceType', 'title', 'description', 'source', 'reference'],
      ),
    },
    evidenceSchema,
    (input) => ({
      type: 'attach_evidence',
      stageId: input.stageId,
      criterionId: input.criterionId,
      evidence: {
        type: input.evidenceType,
        title: input.title,
        description: input.description,
        source: input.source,
        reference: input.reference,
      },
    }),
  )

  const pathIdSchema = z.object({ pathId: z.string() })
  const selectPath = commandTool(
    store,
    {
      name: 'select_path',
      title: 'Select path',
      description: 'Select a viable alternative path after mission conditions or strategy change.',
      inputSchema: closedObject({ pathId: idField }, ['pathId']),
    },
    pathIdSchema,
    (input) => ({ type: 'select_path', pathId: input.pathId }),
  )

  const expandScopeSchema = z.object({ stage: stageDraftSchema, path: pathDraftSchema, reason: z.string().min(1) })
  const expandScope = commandTool(
    store,
    {
      name: 'expand_scope',
      title: 'Expand required scope',
      description: 'Add newly discovered required work and its connecting path.',
      inputSchema: closedObject(
        {
          stage: closedObject(stageFields, ['title', 'description', 'stageKind', 'order']),
          path: closedObject(pathFields, ['originStageId', 'destinationStageId', 'title', 'description']),
          reason: stringField('Why this work is now required for success.'),
        },
        ['stage', 'path', 'reason'],
      ),
    },
    expandScopeSchema,
    (input) => ({ type: 'expand_scope', reason: input.reason, stage: toStage(input.stage), path: toPath(input.path) }),
  )

  const invalidateSchema = z.object({ stageId: z.string(), reason: z.string().min(1) })
  const invalidate = commandTool(
    store,
    {
      name: 'invalidate_stage',
      title: 'Invalidate stage',
      description: 'Mark previously completed work invalid when evidence or an assumption no longer holds.',
      inputSchema: closedObject({ stageId: idField, reason: stringField('Observed invalidation reason.') }, ['stageId', 'reason']),
    },
    invalidateSchema,
    (input) => ({ type: 'invalidate_stage', ...input }),
  )
  const verify = commandTool(
    store,
    {
      name: 'verify_completion',
      title: 'Verify completion',
      description: 'Check required evidence, final dependencies, and blocking obstacles before allowing completion.',
      inputSchema: closedObject({}),
    },
    emptySchema,
    () => ({ type: 'verify_completion' }),
  )
  const complete = commandTool(
    store,
    {
      name: 'complete_mission',
      title: 'Complete mission',
      description: 'Finish the mission only after deterministic completion verification succeeds.',
      inputSchema: closedObject({}),
    },
    emptySchema,
    () => ({ type: 'complete_mission' }),
  )

  const submitProjectHandoff: WebMcpToolRegistration = {
    name: 'submit_project_handoff',
    title: 'Submit project handoff',
    description: 'Provide bounded project context so the active experience can prepare a provider-neutral visual generation request.',
    inputSchema: closedObject(
      {
        handoffId: stringField('Optional stable handoff id for deduplication.'),
        projectId: stringField('Stable project identifier.'),
        projectName: stringField('Human-readable project name.'),
        objective: stringField('Current project objective.'),
        summary: stringField('Concise factual handoff summary.'),
        phase: stringField('Current project phase.'),
        activeWork: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 300 } },
        constraints: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 300 } },
        risks: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 300 } },
        evidence: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 500 } },
      },
      ['projectId', 'projectName', 'objective', 'summary', 'phase'],
    ),
    execute(input) {
      const parsed = parseOrError(handoffSchema, input)
      if ('error' in parsed) {
        store.recordToolCall('submit_project_handoff', false, parsed.error)
        return compact({ ok: false, code: 'INVALID_INPUT', message: parsed.error })
      }
      const receivedAt = new Date().toISOString()
      const request = store.acceptProjectHandoff({
        schemaVersion: 1,
        id: parsed.data.handoffId ?? `handoff:${parsed.data.projectId}:${Date.now()}`,
        projectId: parsed.data.projectId,
        projectName: parsed.data.projectName,
        objective: parsed.data.objective,
        summary: parsed.data.summary,
        phase: parsed.data.phase,
        activeWork: parsed.data.activeWork,
        constraints: parsed.data.constraints,
        risks: parsed.data.risks,
        evidence: parsed.data.evidence,
        source: 'webmcp',
        receivedAt,
      })
      store.recordToolCall('submit_project_handoff', true, 'Project handoff accepted; visual generation request prepared.')
      return compact({
        ok: true,
        handoffId: request.sourceHandoffId,
        generation: {
          status: 'prepared',
          requestId: request.id,
          experiencePackId: request.experiencePackId,
          sceneKey: request.sceneKey,
          assets: request.assets.map(({ id, role }) => ({ id, role })),
        },
      })
    },
  }

  return [
    inspect,
    discover,
    proposeStage,
    proposePath,
    beginStage,
    recordProgress,
    completeStage,
    reportObstacle,
    resolveObstacle,
    requestDecision,
    inspectDecision,
    attachEvidence,
    selectPath,
    expandScope,
    invalidate,
    verify,
    complete,
    submitProjectHandoff,
  ]
}

export async function registerWebMcpTools(store: MissionStore): Promise<() => void> {
  if (!document.modelContext) {
    store.setWebMcpStatus('unsupported')
    return () => undefined
  }
  const controller = new AbortController()
  try {
    await Promise.all(
      createWebMcpToolDefinitions(store).map((tool) =>
        document.modelContext?.registerTool(
          {
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: { readOnlyHint: tool.readOnly ?? false, untrustedContentHint: false },
            execute: async (input) => tool.execute(input),
          },
          { signal: controller.signal },
        ),
      ),
    )
    if (!controller.signal.aborted) store.setWebMcpStatus('native')
  } catch (error) {
    if (controller.signal.aborted) return () => undefined
    store.setWebMcpStatus('error')
    store.recordToolCall('register_tools', false, error instanceof Error ? error.message : 'Native registration failed.')
  }
  return () => controller.abort()
}
