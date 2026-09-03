import type { NarratorInput, NarratorOutput } from '../../domain/narrator'
import type { MissionState } from '../../domain/types'
import { selectExpeditionScene, type ExpeditionSceneSelection } from './sceneSelection'
import { buildMountainTopology, type MountainTopology } from './topology'
import type { ExperiencePack, ScenarioCardPrompt, ScenarioCardPromptInput } from '../ExperiencePack'
import { createAscendGenerationRequest } from './generation'

export type AscendVisualProfile = 'alpine' | 'glacier' | 'granite'

export interface AscendExperienceState {
  visualProfile: AscendVisualProfile
  baseAltitude: number
  summitAltitude: number
}

export interface AscendProjection {
  topology: MountainTopology
  securedAltitude: number
  summitAltitude: number
}

const defaultState = (): AscendExperienceState => ({
  visualProfile: 'alpine',
  baseAltitude: 1120,
  summitAltitude: 6430,
})

function isProfile(value: unknown): value is AscendVisualProfile {
  return value === 'alpine' || value === 'glacier' || value === 'granite'
}

function narrate(input: NarratorInput, projection: AscendProjection): NarratorOutput {
  const obstacle = input.openObstacles[0]
  const decision = input.pendingDecisions[0]
  const completed = input.mission.status === 'completed'
  const headline = completed
    ? 'Summit reached'
    : decision
      ? 'Route decision required'
      : obstacle
        ? `${obstacle.title} blocks the ascent`
        : input.activeStage?.title ?? 'Basecamp'
  const tone = completed ? 'success' : decision ? 'decision' : obstacle ? 'blocked' : 'progress'
  const latest = input.recentEvents.at(-1)
  return {
    headline,
    summary: latest?.description ?? input.mission.objective,
    stateLabel: input.mission.status === 'completion_ready' ? 'summit ready' : input.mission.status.replaceAll('_', ' '),
    announcements: latest
      ? [{ text: latest.title, tone, priority: obstacle || decision ? 'assertive' : 'polite', entityId: latest.entityId }]
      : [],
    metrics: [
      { id: 'secured-altitude', label: 'Secure altitude', value: `${projection.securedAltitude.toLocaleString()}m` },
      { id: 'summit-confidence', label: 'Summit confidence', value: `${Math.round(input.mission.overallConfidence * 100)}%` },
      { id: 'surveyed', label: 'Terrain surveyed', value: `${input.mission.discoveryPercent}%` },
    ],
  }
}

function createScenarioCardPrompt(input: ScenarioCardPromptInput): ScenarioCardPrompt {
  const hazard = input.obstacleCategory
    ? `Show the ${input.obstacleCategory.replaceAll('_', ' ')} as a credible alpine hazard${input.obstacleSeverity ? ` with ${input.obstacleSeverity} severity` : ''}.`
    : 'Show a clear, traversable ascent with one focal landmark.'
  return {
    subject: input.title,
    prompt: [
      'Editorial alpine expedition card for Codex Ascend, painterly realism, cold blue atmosphere with restrained signal-orange accents.',
      hazard,
      `Mission event: ${input.eventType}. ${input.summary}`,
      'No UI chrome. Strong silhouette, readable at card size, subtle paper grain, cinematic but operational rather than fantastical.',
    ].join(' '),
    negativePrompt: 'text, logos, sci-fi spacecraft, ocean, desert, tropical vegetation, crowds, glossy stock-photo look',
    aspectRatio: '16:9',
  }
}

export const ascendExperiencePack: ExperiencePack<AscendExperienceState, AscendProjection, ExpeditionSceneSelection> = {
  id: 'ascend',
  version: '1.1.0',
  title: 'Ascend',
  legacyStorageKeys: ['codex-ascend:expedition:v1'],
  createState: () => defaultState(),
  validateState(input) {
    if (!input || typeof input !== 'object') return defaultState()
    const candidate = input as Partial<AscendExperienceState>
    return {
      visualProfile: isProfile(candidate.visualProfile) ? candidate.visualProfile : 'alpine',
      baseAltitude: typeof candidate.baseAltitude === 'number' ? candidate.baseAltitude : 1120,
      summitAltitude: typeof candidate.summitAltitude === 'number' ? candidate.summitAltitude : 6430,
    }
  },
  project(state: MissionState, experienceState: AscendExperienceState) {
    const topology = buildMountainTopology(state, experienceState)
    return {
      topology,
      securedAltitude: topology.securedAltitude,
      summitAltitude: topology.summitAltitude,
    }
  },
  resolveScene(state) {
    return selectExpeditionScene(state)
  },
  narrate,
  createScenarioCardPrompt,
  createGenerationRequest: createAscendGenerationRequest,
}
