import type { ExperienceGenerationRequest, GenerationRequestInput } from '../generation'
import type { AscendProjection } from './AscendExperiencePack'
import type { ExpeditionSceneSelection } from './sceneSelection'
import { createAscendWaypointPlan } from './waypointProjection'

const concise = (values: string[], fallback: string) => values.slice(0, 5).join('; ') || fallback

export function createAscendGenerationRequest(
  input: GenerationRequestInput<AscendProjection, ExpeditionSceneSelection>,
): ExperienceGenerationRequest {
  const { handoff, mission, sceneSelection } = input
  const waypointPlan = createAscendWaypointPlan(mission, input.projection.topology)
  const createdAt = new Date().toISOString()
  const waypointPositions = waypointPlan.anchors
    .map((anchor, index) => `${index + 1}:(${anchor.x.toFixed(3)},${anchor.y.toFixed(3)})`)
    .join(', ')
  const prompt = [
    'Premium editorial illustrated alpine environment for Codex Ascend: one broad iconic pyramidal massif, simplified large snow and rock planes, blue-white atmosphere, restrained rust-orange sunlit rock and one tiny signal-orange camp detail.',
    `The expedition represents the project “${handoff.projectName}”. Its objective is: ${handoff.objective}`,
    `Current phase: ${handoff.phase}. Current work: ${concise(handoff.activeWork, handoff.summary)}.`,
    `Known constraints: ${concise(handoff.constraints, 'none supplied')}. Known risks: ${concise(handoff.risks, 'none supplied')}.`,
    `This project has ${waypointPlan.sourceStageCount} semantic stages represented by ${waypointPlan.anchors.length} visual waypoints. Reserve physically plausible, uncluttered snow ledges or rock shelves at these normalized coordinates: ${waypointPositions}. Keep each anchor area clear enough for a 5% viewport UI label and marker, but do not draw the marker, label, or connecting line into the artwork.`,
    `Render semantic scene “${sceneSelection.kind}” for mission revision ${mission.revision}. Keep one coherent mountain with a calm readable silhouette, a soft cloud cutoff around the lower and side edges, physical camps, terrain-led travel, layered depth, and quiet space for a transparent live HUD.`,
    'No people are required. No interface is baked into the artwork.',
  ].join(' ')

  return {
    schemaVersion: 1,
    id: `generation:${handoff.id}:${mission.mission.id}:${mission.revision}:${sceneSelection.kind}`,
    experiencePackId: 'ascend',
    experiencePackVersion: '1.1.0',
    missionId: mission.mission.id,
    missionRevision: mission.revision,
    sourceHandoffId: handoff.id,
    sceneKey: sceneSelection.kind,
    prompt,
    negativePrompt: 'jagged sawtooth skyline, many spires, dense granular crags, busy background range, text, labels, logos, interface, HUD, graph, flowchart, route line, map pins, infographic, tourism booking UI, crowds, watermark',
    sourceEntityCount: waypointPlan.sourceStageCount,
    placementAnchors: waypointPlan.anchors.map((anchor) => ({
      entityId: anchor.entityId,
      x: anchor.x,
      y: anchor.y,
      safeRadius: 0.05,
      emphasis: anchor.state === 'current' ? 'primary' : anchor.state === 'future' ? 'latent' : 'secondary',
    })),
    assets: [
      {
        id: 'environment.hero_master_4k',
        role: 'environment_base',
        aspectRatio: '16:9',
        transparent: false,
        width: 3840,
        height: 2160,
      },
    ],
    createdAt,
  }
}
