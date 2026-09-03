import { advanceDemo, createDemoExpedition } from '../demo/demoExpedition'
import { applyCommand, createMission, type CreateMissionInput } from '../domain/engine'
import type { CommandResult, MissionCommand, MissionState } from '../domain/types'
import type { GenerationPreparation, ProjectHandoff } from '../experience/generation'
import { activeExperiencePack, getExperiencePack } from '../experience/registry'

const STORAGE_KEY = 'codex-mission:session:v3'
const LEGACY_STORAGE_KEY = 'codex-mission:session:v2'

export interface ExperienceSnapshot {
  packId: string
  packVersion: string
  state: unknown
}

interface PersistedSession {
  schemaVersion: 3
  mission: MissionState
  experience: ExperienceSnapshot
  demoCursor: number
  selectedEntityId?: string
  handoff?: ProjectHandoff
  generation: GenerationPreparation
}

export interface MissionSnapshot extends PersistedSession {
  lastMessage: string
  webMcpStatus: 'checking' | 'native' | 'unsupported' | 'error'
  toolLog: Array<{ name: string; at: string; ok: boolean; summary: string }>
}

function createExperience(mission: MissionState): ExperienceSnapshot {
  return {
    packId: activeExperiencePack.id,
    packVersion: activeExperiencePack.version,
    state: activeExperiencePack.createState(mission.mission.seed),
  }
}

export function normalizeRestoredMission(mission: MissionState): MissionState {
  if (
    mission.mission.status !== 'completed'
    || (mission.mission.discoveryPercent === 100 && mission.mission.progressEstimate === 1)
  ) return mission

  return {
    ...mission,
    mission: {
      ...mission.mission,
      discoveryPercent: 100,
      progressEstimate: 1,
    },
  }
}

function loadSession(): PersistedSession | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<PersistedSession> & { schemaVersion?: number }
    if (![2, 3].includes(parsed.schemaVersion ?? 0) || parsed.mission?.schemaVersion !== 2 || !parsed.experience) return undefined
    const pack = getExperiencePack(parsed.experience.packId)
    if (!pack) return undefined
    return {
      schemaVersion: 3,
      mission: normalizeRestoredMission(parsed.mission),
      experience: {
        packId: pack.id,
        packVersion: pack.version,
        state: pack.validateState(parsed.experience.state, parsed.mission.mission.seed),
      },
      demoCursor: parsed.demoCursor ?? 0,
      selectedEntityId: parsed.selectedEntityId,
      handoff: parsed.handoff,
      generation: parsed.generation ?? { status: 'idle' },
    }
  } catch {
    return undefined
  }
}

export class MissionStore {
  private snapshot: MissionSnapshot
  private listeners = new Set<() => void>()

  constructor() {
    const loaded = typeof localStorage === 'undefined' ? undefined : loadSession()
    const mission = loaded?.mission ?? createDemoExpedition()
    this.snapshot = {
      schemaVersion: 3,
      mission,
      experience: loaded?.experience ?? createExperience(mission),
      demoCursor: loaded?.demoCursor ?? 0,
      selectedEntityId: loaded?.selectedEntityId,
      handoff: loaded?.handoff,
      generation: loaded?.generation ?? { status: 'idle' },
      lastMessage: loaded ? 'Mission restored from this browser.' : 'Basecamp established. Survey when ready.',
      webMcpStatus: 'checking',
      toolLog: [],
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  private synchronizeGeneration(next: MissionSnapshot): MissionSnapshot {
    if (!next.handoff) return next
    const currentRequest = next.generation.request
    if (
      currentRequest?.missionRevision === next.mission.revision
      && currentRequest.sourceHandoffId === next.handoff.id
      && currentRequest.experiencePackVersion === next.experience.packVersion
    ) return next
    const experienceState = activeExperiencePack.validateState(next.experience.state, next.mission.mission.seed)
    const projection = activeExperiencePack.project(next.mission, experienceState)
    const sceneSelection = activeExperiencePack.resolveScene(next.mission, projection)
    return {
      ...next,
      generation: {
        status: 'prepared',
        request: activeExperiencePack.createGenerationRequest({
          handoff: next.handoff,
          mission: next.mission,
          projection,
          sceneSelection,
        }),
      },
    }
  }

  private publish(next: MissionSnapshot) {
    const synchronized = this.synchronizeGeneration(next)
    this.snapshot = synchronized
    if (typeof localStorage !== 'undefined') {
      const persisted: PersistedSession = {
        schemaVersion: 3,
        mission: synchronized.mission,
        experience: synchronized.experience,
        demoCursor: synchronized.demoCursor,
        selectedEntityId: synchronized.selectedEntityId,
        handoff: synchronized.handoff,
        generation: synchronized.generation,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    }
    this.listeners.forEach((listener) => listener())
  }

  execute(command: MissionCommand, message?: string): CommandResult {
    const result = applyCommand(this.snapshot.mission, command)
    if (result.ok) {
      this.publish({ ...this.snapshot, mission: result.state, lastMessage: message ?? result.message })
    } else {
      this.publish({ ...this.snapshot, lastMessage: result.message })
    }
    return result
  }

  advanceDemo() {
    try {
      const advanced = advanceDemo(this.snapshot.mission, this.snapshot.demoCursor)
      this.publish({ ...this.snapshot, mission: advanced.state, demoCursor: advanced.cursor, lastMessage: advanced.message })
      return advanced
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo transition failed.'
      this.publish({ ...this.snapshot, lastMessage: message })
      return undefined
    }
  }

  previousDemo() {
    this.seekDemo(Math.max(0, this.snapshot.demoCursor - 1), false, 'Rewound')
  }

  seekDemo(targetCursor: number, selectActive = false, verb = 'Loaded') {
    const target = Math.max(0, Math.min(24, Math.floor(targetCursor)))
    let mission = createDemoExpedition()
    let cursor = 0
    let guard = 0
    while (cursor < target && guard < 40) {
      guard += 1
      const advanced = advanceDemo(mission, cursor)
      mission = advanced.state
      cursor = advanced.cursor
      if (advanced.awaitingHuman && cursor < target) {
        const decision = Object.values(mission.decisions).find((item) => !item.resolvedAt)
        const optionId = decision?.recommendedOptionId ?? decision?.options[0]?.id
        if (decision && optionId) {
          const result = applyCommand(mission, { type: 'resolve_human_decision', decisionId: decision.id, optionId })
          if (result.ok) mission = result.state
        }
      }
    }
    this.publish({
      ...this.snapshot,
      mission,
      demoCursor: cursor,
      selectedEntityId: selectActive ? mission.mission.activeStageId : undefined,
      lastMessage: `${verb} mission event ${cursor}.`,
    })
  }

  resetDemo() {
    const mission = createDemoExpedition()
    this.publish({
      schemaVersion: 3,
      mission,
      experience: createExperience(mission),
      demoCursor: 0,
      selectedEntityId: undefined,
      handoff: undefined,
      generation: { status: 'idle' },
      lastMessage: 'Basecamp re-established. The mountain has reconstructed from its seed.',
      webMcpStatus: this.snapshot.webMcpStatus,
      toolLog: this.snapshot.toolLog,
    })
  }

  createMission(input: CreateMissionInput) {
    const mission = createMission(input)
    this.publish({
      schemaVersion: 3,
      mission,
      experience: createExperience(mission),
      demoCursor: 0,
      selectedEntityId: undefined,
      handoff: undefined,
      generation: { status: 'idle' },
      lastMessage: 'Mission created. Ask an agent to discover its stages and paths.',
      webMcpStatus: this.snapshot.webMcpStatus,
      toolLog: this.snapshot.toolLog,
    })
  }

  selectEntity(entityId?: string) {
    this.publish({ ...this.snapshot, selectedEntityId: entityId })
  }

  selectDecision(decisionId: string, optionId: string) {
    return this.execute(
      { type: 'resolve_human_decision', decisionId, optionId },
      'Your route choice is now structured mission state. The agent can inspect it through WebMCP.',
    )
  }

  acceptProjectHandoff(handoff: ProjectHandoff) {
    const experienceState = activeExperiencePack.validateState(this.snapshot.experience.state, this.snapshot.mission.mission.seed)
    const projection = activeExperiencePack.project(this.snapshot.mission, experienceState)
    const sceneSelection = activeExperiencePack.resolveScene(this.snapshot.mission, projection)
    const request = activeExperiencePack.createGenerationRequest({
      handoff,
      mission: this.snapshot.mission,
      projection,
      sceneSelection,
    })
    this.publish({
      ...this.snapshot,
      handoff,
      generation: { status: 'prepared', request },
      lastMessage: `Project handoff received from ${handoff.projectName}. Mountain generation brief prepared.`,
    })
    return request
  }

  setWebMcpStatus(status: MissionSnapshot['webMcpStatus']) {
    this.publish({ ...this.snapshot, webMcpStatus: status })
  }

  recordToolCall(name: string, ok: boolean, summary: string) {
    this.publish({
      ...this.snapshot,
      toolLog: [...this.snapshot.toolLog, { name, at: new Date().toISOString(), ok, summary }].slice(-30),
    })
  }
}

export const missionStore = new MissionStore()
