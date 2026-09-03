export const IMAGE_MODEL_SNAPSHOT = 'gpt-image-2-2026-04-21' as const
export const PROMPT_VERSION = 'ascend-world-v4' as const

export type ScenarioCardSceneType = 'scenario_card_camp_iii' | 'scenario_card_persistence_blocker' | 'scenario_card_route_decision'
export type GenerationSceneType = 'canonical_master' | 'camp_ii_active' | ScenarioCardSceneType
export type GenerationStatus = 'queued' | 'running' | 'ready' | 'accepted' | 'rejected' | 'failed'

export interface PlacementAnchor {
  entityId: string
  x: number
  y: number
  safeRadius: number
  emphasis: 'primary' | 'secondary' | 'latent'
}

export interface GenerationBrief {
  schemaVersion: 1
  id: string
  experiencePackId: 'ascend'
  experiencePackVersion: string
  missionId: string
  missionRevision: number
  sourceHandoffId: string
  sceneKey: string
  prompt: string
  negativePrompt: string
  sourceEntityCount: number
  placementAnchors: PlacementAnchor[]
  createdAt: string
}

export interface CreateGenerationInput {
  brief: GenerationBrief
  waypointProjectionRevision: string
  expeditionVisualSeed: number
  scenarioCard?: {
    sceneType: ScenarioCardSceneType
    focalEntityId: string
    kind: 'camp' | 'blocker' | 'decision'
    prompt: string
    negativePrompt: string
    crop: { x: number; y: number; width: number; height: number }
  }
}

export interface GenerationJobParams {
  generationId: string
  sceneType: GenerationSceneType
  brief: GenerationBrief
  waypointProjectionRevision: string
  expeditionVisualSeed: number
  canonicalMasterGenerationId?: string
  outputSize: string
  scenarioCard?: CreateGenerationInput['scenarioCard']
  retryOf?: string
}

export interface GenerationMetadata {
  schemaVersion: 1
  generationId: string
  expeditionId: string
  idempotencyKey: string
  model: string
  promptVersion: string
  sceneType: GenerationSceneType
  missionRevision: number
  waypointProjectionRevision: string
  canonicalMasterGenerationId?: string
  focalEntityId?: string
  retryOf?: string
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
  status: GenerationStatus
  assetKey?: string
  assetUrl?: string
  mimeType?: string
  width: number
  height: number
  quality: string
  latencyMs?: number
  usage?: Record<string, unknown>
  providerRequestId?: string
  errorCode?: string
  retryable?: boolean
  error?: string
  createdAt: string
  updatedAt: string
}

export interface WorldManifest {
  schemaVersion: 1
  expeditionId: string
  canonicalMasterGenerationId?: string
  scenes: Partial<Record<GenerationSceneType, string>>
  updatedAt: string
}

export interface WorldManifestResponse extends WorldManifest {
  canonicalMaster?: GenerationMetadata
  activeScene?: GenerationMetadata
  scenarioCards?: Partial<Record<'camp' | 'blocker' | 'decision', GenerationMetadata>>
}
