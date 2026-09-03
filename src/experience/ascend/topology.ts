import { seededUnit } from '../../domain/seed'
import type { MissionState, Path, Stage } from '../../domain/types'

export interface TopologyPoint {
  x: number
  y: number
}

export interface TopologyNode extends TopologyPoint {
  id: string
  stage: Stage
  altitude: number
  hidden: boolean
}

export interface TopologyRoute {
  id: string
  path: Path
  points: [TopologyPoint, TopologyPoint, TopologyPoint]
  hidden: boolean
  blocked: boolean
}

export interface MountainTopology {
  seed: number
  nodes: TopologyNode[]
  routes: TopologyRoute[]
  summit: TopologyPoint
  fogLine: number
  securedAltitude: number
  summitAltitude: number
  fingerprint: string
}

export interface AscendTopologyProfile {
  baseAltitude: number
  summitAltitude: number
}

function branchIndex(state: MissionState, stage: Stage): { index: number; count: number } {
  const inbound = Object.values(state.paths).filter((path) => path.destinationStageId === stage.id)
  if (inbound.length === 0) return { index: 0, count: 1 }
  const siblings = Object.values(state.paths)
    .filter((path) => path.originStageId === inbound[0].originStageId)
    .sort((a, b) => a.id.localeCompare(b.id))
  return { index: Math.max(0, siblings.findIndex((path) => path.id === inbound[0].id)), count: siblings.length }
}

export function buildMountainTopology(state: MissionState, profile: AscendTopologyProfile): MountainTopology {
  const stages = Object.values(state.stages).sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  )
  const minimum = Math.min(...stages.map((stage) => stage.order))
  const maximum = Math.max(...stages.map((stage) => stage.order))
  const range = Math.max(1, maximum - minimum)
  const nodeMap = new Map<string, TopologyNode>()

  stages.forEach((stage, ordinal) => {
    const progress = (stage.order - minimum) / range
    const branch = branchIndex(state, stage)
    const branchOffset = branch.count > 1 ? (branch.index - (branch.count - 1) / 2) * 0.16 : 0
    const drift = (seededUnit(state.mission.seed, ordinal) - 0.5) * 0.055
    const node: TopologyNode = {
      id: stage.id,
      stage,
      altitude: Math.round(profile.baseAltitude + progress * (profile.summitAltitude - profile.baseAltitude)),
      x: Math.min(0.88, Math.max(0.1, 0.16 + progress * 0.62 + branchOffset + drift)),
      y: 0.86 - progress * 0.67,
      hidden: stage.status === 'hidden',
    }
    nodeMap.set(node.id, node)
  })

  const routes = Object.values(state.paths)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((path, ordinal): TopologyRoute[] => {
      const origin = nodeMap.get(path.originStageId)
      const destination = nodeMap.get(path.destinationStageId)
      if (!origin || !destination) return []
      const bend = (seededUnit(state.mission.seed ^ 0x5f3759df, ordinal) - 0.5) * 0.09
      return [
        {
          id: path.id,
          path,
          points: [
            { x: origin.x, y: origin.y },
            { x: (origin.x + destination.x) / 2 + bend, y: (origin.y + destination.y) / 2 + 0.015 },
            { x: destination.x, y: destination.y },
          ],
          hidden: origin.hidden || destination.hidden || path.status === 'unknown',
          blocked: path.status === 'blocked',
        },
      ]
    })

  const nodes = [...nodeMap.values()]
  const summitNode = nodes.find((node) => node.stage.kind === 'completion')
  const securedAltitude = Math.max(
    profile.baseAltitude,
    ...nodes.filter((node) => node.stage.status === 'completed').map((node) => node.altitude),
  )
  const fingerprint = JSON.stringify({
    seed: state.mission.seed,
    nodes: nodes.map(({ id, x, y, hidden }) => [id, x.toFixed(4), y.toFixed(4), hidden]),
    routes: routes.map(({ id, hidden, blocked }) => [id, hidden, blocked]),
  })

  return {
    seed: state.mission.seed,
    nodes,
    routes,
    summit: summitNode ? { x: summitNode.x, y: summitNode.y } : { x: 0.78, y: 0.16 },
    fogLine: 0.82 - (state.mission.discoveryPercent / 100) * 0.57,
    securedAltitude,
    summitAltitude: profile.summitAltitude,
    fingerprint,
  }
}
