import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const outputPath = resolve(process.argv[2] ?? 'artifacts/generation/initial-camp-ii-request.json')
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { createDemoExpedition, advanceDemo } = await server.ssrLoadModule('/src/demo/demoExpedition.ts')
  const { activeExperiencePack } = await server.ssrLoadModule('/src/experience/registry.ts')
  let mission = createDemoExpedition()
  let cursor = 0
  while (cursor < 5) {
    const advanced = advanceDemo(mission, cursor)
    mission = advanced.state
    cursor = advanced.cursor
  }

  const handoff = {
    schemaVersion: 1,
    id: 'handoff:codex-ascend-generated-world-v1',
    projectId: 'codex-ascend-mcp',
    projectName: 'Codex Ascend',
    objective: 'Deliver the WebMCP contest experience with a persistent generated mountain world and deterministic semantic mission overlays.',
    summary: 'The neutral Mission Engine and 18 WebMCP tools are established. This pass proves the canonical mountain and Camp II continuity pipeline on Cloudflare.',
    phase: 'Camp II / Active Ascent',
    activeWork: [
      'Cloudflare Worker image provider',
      'R2 generation persistence',
      'Camp II reference-image continuity',
      'PixiJS living-scene treatment',
    ],
    constraints: [
      'Frozen mission topology remains authoritative',
      'Only Ascend is implemented',
      'Waypoints remain deterministic overlays',
      'No baked UI, route line, labels, or graph imagery',
    ],
    risks: [
      'Generated ridge geometry may drift between master and derivative',
      'Waypoint safe areas may be visually cluttered',
      'Image generation can be slow or rate limited',
    ],
    evidence: [
      'Existing mission engine tests',
      'Existing 18 WebMCP tool registrations',
      'Camp II production art brief and reference studies',
    ],
    source: 'manual',
    receivedAt: new Date().toISOString(),
  }
  const experienceState = activeExperiencePack.validateState(undefined, mission.mission.seed)
  const projection = activeExperiencePack.project(mission, experienceState)
  const sceneSelection = activeExperiencePack.resolveScene(mission, projection)
  const brief = activeExperiencePack.createGenerationRequest({ handoff, mission, projection, sceneSelection })
  const payload = {
    brief,
    waypointProjectionRevision: `ascend-wp-v1-r${mission.revision}`,
    expeditionVisualSeed: mission.mission.seed,
  }
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o644 })
  process.stdout.write(`Prepared ${outputPath}\nMission ${mission.mission.id} at ${mission.stages[mission.mission.activeStageId]?.title ?? 'unknown stage'}\n`)
} finally {
  await server.close()
}
