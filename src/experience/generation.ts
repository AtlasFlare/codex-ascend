import type { MissionState } from '../domain/types'

export type ProjectHandoffSource = 'webmcp' | 'remote_mcp' | 'manual'

/** Presentation-neutral context delivered by an agent at a project handoff. */
export interface ProjectHandoff {
  schemaVersion: 1
  id: string
  projectId: string
  projectName: string
  objective: string
  summary: string
  phase: string
  activeWork: string[]
  constraints: string[]
  risks: string[]
  evidence: string[]
  source: ProjectHandoffSource
  receivedAt: string
}

export type GenerationAssetRole =
  | 'environment_base'
  | 'depth_layer'
  | 'scene_element'
  | 'atmosphere'
  | 'card_art'

export interface GenerationSpatialCrop {
  x: number
  y: number
  width: number
  height: number
}

/** Presentation-neutral identity reference for a derived generated asset. */
export interface GenerationSourceReference {
  generationId: string
  assetUrl: string
  width: number
  height: number
  focalEntityId?: string
  crop?: GenerationSpatialCrop
}

export interface GenerationAssetRequest {
  id: string
  role: GenerationAssetRole
  aspectRatio: '16:9' | '1:1'
  transparent: boolean
  width: number
  height: number
  sourceReference?: GenerationSourceReference
}

export interface GenerationPlacementAnchor {
  entityId: string
  x: number
  y: number
  safeRadius: number
  emphasis: 'primary' | 'secondary' | 'latent'
}

/** Provider-neutral request prepared by an Experience Pack. */
export interface ExperienceGenerationRequest {
  schemaVersion: 1
  id: string
  experiencePackId: string
  experiencePackVersion: string
  missionId: string
  missionRevision: number
  sourceHandoffId: string
  sceneKey: string
  prompt: string
  negativePrompt: string
  sourceEntityCount: number
  placementAnchors: GenerationPlacementAnchor[]
  assets: GenerationAssetRequest[]
  createdAt: string
}

export interface GenerationRequestInput<TProjection, TSceneSelection> {
  handoff: ProjectHandoff
  mission: MissionState
  projection: TProjection
  sceneSelection: TSceneSelection
}

export interface GenerationPreparation {
  status: 'idle' | 'prepared'
  request?: ExperienceGenerationRequest
}

export type PersistedGenerationStatus = 'queued' | 'running' | 'ready' | 'accepted' | 'rejected' | 'failed'

export interface PersistedGenerationAsset {
  generationId: string
  expeditionId: string
  model: string
  promptVersion: string
  sceneType: string
  missionRevision: number
  waypointProjectionRevision: string
  canonicalMasterGenerationId?: string
  focalEntityId?: string
  composition?: {
    baseGenerationId: string
    mask: {
      kind: 'ellipse'
      x: number
      y: number
      radiusX: number
      radiusY: number
    }
  }
  status: PersistedGenerationStatus
  assetUrl?: string
  width: number
  height: number
  quality: string
  latencyMs?: number
  createdAt: string
  updatedAt: string
}

export interface PersistedGeneratedWorld {
  schemaVersion: 1
  expeditionId: string
  canonicalMasterGenerationId?: string
  scenes: Record<string, string | undefined>
  canonicalMaster?: PersistedGenerationAsset
  activeScene?: PersistedGenerationAsset
  scenarioCards?: Partial<Record<'camp' | 'blocker' | 'decision', PersistedGenerationAsset>>
  updatedAt: string
}

/**
 * Server-side providers implement this later. The browser intentionally owns
 * neither credentials nor a direct generation transport.
 */
export interface ExperienceGenerationProvider {
  readonly id: string
  generate(request: ExperienceGenerationRequest): Promise<{
    requestId: string
    files: Record<string, string>
  }>
}
