import type { NarratorInput, NarratorOutput } from '../domain/narrator'
import type { MissionState } from '../domain/types'
import type { ExperienceGenerationRequest, GenerationRequestInput } from './generation'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface ScenarioCardPromptInput {
  eventType: string
  title: string
  summary: string
  obstacleCategory?: string
  obstacleSeverity?: string
}

export interface ScenarioCardPrompt {
  subject: string
  prompt: string
  negativePrompt: string
  aspectRatio: '16:9' | '4:3' | '1:1'
}

export interface MigratedExperienceSession<TExperienceState> {
  mission: MissionState
  experienceState: TExperienceState
  demoCursor: number
  selectedEntityId?: string
}

export interface ExperiencePack<TExperienceState, TProjection, TSceneSelection> {
  readonly id: string
  readonly version: string
  readonly title: string
  readonly legacyStorageKeys: readonly string[]
  createState(seed: number): TExperienceState
  validateState(input: unknown, seed: number): TExperienceState
  project(state: MissionState, experienceState: TExperienceState): TProjection
  resolveScene(state: MissionState, projection: TProjection): TSceneSelection
  narrate(input: NarratorInput, projection: TProjection): NarratorOutput
  createScenarioCardPrompt(input: ScenarioCardPromptInput): ScenarioCardPrompt
  createGenerationRequest(input: GenerationRequestInput<TProjection, TSceneSelection>): ExperienceGenerationRequest
  migrateLegacySession?(input: unknown): MigratedExperienceSession<TExperienceState> | undefined
}
