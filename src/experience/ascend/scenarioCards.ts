import type { MissionState } from '../../domain/types'
import type { GenerationSourceReference, GenerationSpatialCrop } from '../generation'
import type { TopologyNode } from './topology'
import type { AscendWaypointAnchor } from './waypointProjection'

export type AscendScenarioCardKind = 'basecamp' | 'camp' | 'route' | 'blocker' | 'decision' | 'discovery' | 'summit'

export interface AscendScenarioCardModel {
  id: string
  kind: AscendScenarioCardKind
  eyebrow: string
  title: string
  summary: string
  status: string
  altitude: number
  sourceReference: GenerationSourceReference
  artPrompt: string
  negativePrompt: string
  concealed: boolean
  evidenceCount: number
  decision?: {
    id: string
    recommendedOptionId?: string
    options: Array<{
      id: string
      label: string
      description: string
      effort: number
      risk: number
    }>
  }
}

interface ScenarioCardInput {
  state: MissionState
  node: TopologyNode
  anchor: AscendWaypointAnchor
  master: GenerationSourceReference
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function createWaypointCrop(anchor: AscendWaypointAnchor): GenerationSpatialCrop {
  const width = 0.34
  const height = 0.34
  return {
    x: clamp(anchor.x - width / 2, 0, 1 - width),
    y: clamp(anchor.y - height / 2, 0, 1 - height),
    width,
    height,
  }
}

function terrainContext(anchor: AscendWaypointAnchor) {
  if (anchor.y < 0.3) return 'upper summit shoulder, wind-loaded snow ribs, and exposed rock crown'
  if (anchor.y < 0.48) return 'upper face, narrow snow shelf, and steep rock buttress'
  if (anchor.y < 0.66) return 'sheltered mid-mountain ledge, adjacent snow face, and descending ridge'
  return 'lower glacier approach, broad snow apron, and cloud-softened mountain base'
}

function resolveKind(state: MissionState, node: TopologyNode): AscendScenarioCardKind {
  if (Object.values(state.decisions).some((decision) => decision.stageId === node.id && !decision.resolvedAt)) return 'decision'
  if (Object.values(state.obstacles).some((obstacle) => obstacle.stageId === node.id && obstacle.status !== 'resolved')) return 'blocker'
  if (node.stage.kind === 'completion') return 'summit'
  if (node.stage.kind === 'origin') return 'basecamp'
  if (node.stage.status === 'hidden' || node.stage.status === 'discovered') return 'discovery'
  if (node.stage.status === 'active' || node.stage.status === 'completed') return 'camp'
  return 'route'
}

const kindLabel: Record<AscendScenarioCardKind, string> = {
  basecamp: 'Expedition origin',
  camp: 'Camp scenario',
  route: 'Approach scenario',
  blocker: 'Blocker scenario',
  decision: 'Route decision',
  discovery: 'Terrain discovery',
  summit: 'Summit scenario',
}

export function createAscendScenarioCard({ state, node, anchor, master }: ScenarioCardInput): AscendScenarioCardModel {
  const concealed = node.hidden || node.stage.status === 'hidden'
  const kind = concealed ? 'discovery' : resolveKind(state, node)
  const obstacle = Object.values(state.obstacles).find((candidate) => candidate.stageId === node.id && candidate.status !== 'resolved')
  const decision = Object.values(state.decisions).find((candidate) => candidate.stageId === node.id && !candidate.resolvedAt)
  const summary = concealed
    ? 'This section remains beyond the surveyed route. Advance the mission to reveal its conditions.'
    : decision?.context ?? obstacle?.description ?? node.stage.description
  const crop = createWaypointCrop(anchor)
  const geography = terrainContext(anchor)
  const sourceReference: GenerationSourceReference = {
    ...master,
    focalEntityId: node.id,
    crop,
  }
  const evidenceIds = new Set(node.stage.evidenceIds)
  if (node.stage.kind === 'completion') {
    state.mission.successCriteria.forEach((criterion) => criterion.evidenceIds.forEach((id) => evidenceIds.add(id)))
  }

  return {
    id: `scenario-card:${node.id}`,
    kind,
    eyebrow: concealed ? 'Unsurveyed terrain' : kindLabel[kind],
    title: concealed ? 'Route not yet revealed' : decision?.question ?? obstacle?.title ?? node.stage.title,
    summary,
    status: concealed ? 'locked' : node.stage.status.replaceAll('_', ' '),
    altitude: node.altitude,
    sourceReference,
    artPrompt: [
      `Create an Ascend ${kind} scenario-card illustration derived from canonical master ${master.generationId}.`,
      `Use the exact local geography around waypoint ${node.id} at normalized position ${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}: ${geography}.`,
      `Reference crop x=${crop.x.toFixed(3)}, y=${crop.y.toFixed(3)}, width=${crop.width.toFixed(3)}, height=${crop.height.toFixed(3)}.`,
      'Preserve mountain identity, ridge direction, rock and snow shapes, lighting, palette, scale, and weather from the master. Reframe this location as a close contextual vignette with quiet left-side space for live transparent UI.',
      kind === 'camp'
        ? 'Show a physically plausible tiny expedition camp fitted to the existing ledge; do not invent a different mountain shelf.'
        : `Express the ${kind} through physical terrain and atmosphere at this exact location.`,
      concealed ? 'Keep this terrain atmospheric and unresolved; do not reveal future mission details.' : `Mission context: ${summary}`,
    ].join(' '),
    negativePrompt: 'different mountain, changed ridge geometry, unrelated landscape, generic alpine stock image, baked text, UI chrome, graph, route line, map pin, logo, crowd, oversized tents',
    concealed,
    evidenceCount: concealed ? 0 : evidenceIds.size,
    decision: !concealed && decision ? {
      id: decision.id,
      recommendedOptionId: decision.recommendedOptionId,
      options: decision.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        effort: option.effort,
        risk: option.risk,
      })),
    } : undefined,
  }
}
