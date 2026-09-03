import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const outputDirectory = resolve(process.argv[2] ?? 'artifacts/generation/scenario-cards')
const masterGenerationId = process.argv[3] ?? 'accepted-canonical-master'
const masterAssetUrl = process.argv[4] ?? '/accepted-master.png'
const checkpoints = [
  { cursor: 8, sceneType: 'scenario_card_camp_iii', kind: 'camp', file: 'camp-iii-normal.json' },
  { cursor: 9, sceneType: 'scenario_card_persistence_blocker', kind: 'blocker', file: 'persistence-blocker.json' },
  { cursor: 11, sceneType: 'scenario_card_route_decision', kind: 'decision', file: 'route-decision.json' },
]
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

const handoff = {
  schemaVersion: 1,
  id: 'handoff:codex-ascend-generated-world-v1',
  projectId: 'codex-ascend-mcp',
  projectName: 'Codex Ascend',
  objective: 'Deliver the WebMCP contest experience with a persistent generated mountain world and deterministic semantic mission overlays.',
  summary: 'Generate three Camp III card derivatives without changing mission topology or the accepted world.',
  phase: 'Camp III scenario-card beta',
  activeWork: ['Normal validation', 'Persistence blocker', 'Human route decision'],
  constraints: ['Frozen mission topology', 'Canonical mountain identity', 'No baked UI or route graphics'],
  risks: ['Local ridge drift', 'Crowded copy area'],
  evidence: ['Scenario-card semantic model', 'Deterministic waypoint projection'],
  source: 'manual',
  receivedAt: new Date().toISOString(),
}

try {
  const { createDemoExpedition, advanceDemo } = await server.ssrLoadModule('/src/demo/demoExpedition.ts')
  const { activeExperiencePack } = await server.ssrLoadModule('/src/experience/registry.ts')
  const { createAscendScenarioCard } = await server.ssrLoadModule('/src/experience/ascend/scenarioCards.ts')
  const { createAscendWaypointPlan } = await server.ssrLoadModule('/src/experience/ascend/waypointProjection.ts')
  await mkdir(outputDirectory, { recursive: true })
  for (const checkpoint of checkpoints) {
    let mission = createDemoExpedition()
    let cursor = 0
    while (cursor < checkpoint.cursor) {
      const advanced = advanceDemo(mission, cursor)
      mission = advanced.state
      cursor = advanced.cursor
    }
    const experienceState = activeExperiencePack.validateState(undefined, mission.mission.seed)
    const projection = activeExperiencePack.project(mission, experienceState)
    const sceneSelection = activeExperiencePack.resolveScene(mission, projection)
    const brief = activeExperiencePack.createGenerationRequest({ handoff, mission, projection, sceneSelection })
    const anchor = createAscendWaypointPlan(mission, projection.topology).anchors.find((item) => item.entityId === mission.mission.activeStageId)
    const node = projection.topology.nodes.find((item) => item.id === mission.mission.activeStageId)
    if (!anchor || !node) throw new Error(`Active Camp III waypoint is missing at cursor ${checkpoint.cursor}.`)
    const card = createAscendScenarioCard({
      state: mission,
      node,
      anchor,
      master: { generationId: masterGenerationId, assetUrl: masterAssetUrl, width: 3840, height: 2160 },
    })
    if (card.kind !== checkpoint.kind) throw new Error(`Expected ${checkpoint.kind}, received ${card.kind}.`)
    const payload = {
      brief,
      waypointProjectionRevision: `ascend-wp-v1-r${mission.revision}`,
      expeditionVisualSeed: mission.mission.seed,
      scenarioCard: {
        sceneType: checkpoint.sceneType,
        focalEntityId: node.id,
        kind: checkpoint.kind,
        prompt: card.artPrompt,
        negativePrompt: card.negativePrompt,
        crop: card.sourceReference.crop,
      },
    }
    await writeFile(resolve(outputDirectory, checkpoint.file), `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o644 })
  }
  process.stdout.write(`Prepared three review-gated scenario-card requests in ${outputDirectory}\n`)
} finally {
  await server.close()
}
