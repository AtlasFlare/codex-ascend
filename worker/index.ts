export { AscendGenerationWorkflow } from './generationWorkflow'

import {
  IMAGE_MODEL_SNAPSHOT,
  PROMPT_VERSION,
  type CreateGenerationInput,
  type GenerationBrief,
  type GenerationJobParams,
  type GenerationMetadata,
  type GenerationSceneType,
  type ScenarioCardSceneType,
  type WorldManifestResponse,
} from './contracts'
import {
  generationAssetKey,
  readGeneration,
  readGenerationRequest,
  readWorld,
  writeGeneration,
  writeGenerationRequest,
  writeWorld,
} from './storage'

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const ID_PATTERN = /^[a-zA-Z0-9._:-]{1,160}$/

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers: { ...JSON_HEADERS, ...headers } })
}

function errorResponse(status: number, code: string, message: string) {
  return json({ ok: false, code, message }, status)
}

async function sha256(value: string) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
}

function hex(digest: ArrayBuffer) {
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function equalDigests(left: ArrayBuffer, right: ArrayBuffer) {
  const leftBytes = new Uint8Array(left)
  const rightBytes = new Uint8Array(right)
  if (leftBytes.length !== rightBytes.length) return false
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index]
  }
  return difference === 0
}

async function authorized(request: Request, env: Env) {
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!supplied || !env.ASCEND_GENERATION_ADMIN_TOKEN) return false
  const [actualHash, suppliedHash] = await Promise.all([
    sha256(env.ASCEND_GENERATION_ADMIN_TOKEN),
    sha256(supplied),
  ])
  return equalDigests(actualHash, suppliedHash)
}

function validAnchor(value: unknown): value is GenerationBrief['placementAnchors'][number] {
  if (!value || typeof value !== 'object') return false
  const anchor = value as Record<string, unknown>
  return typeof anchor.entityId === 'string'
    && ID_PATTERN.test(anchor.entityId)
    && typeof anchor.x === 'number' && anchor.x >= 0 && anchor.x <= 1
    && typeof anchor.y === 'number' && anchor.y >= 0 && anchor.y <= 1
    && typeof anchor.safeRadius === 'number' && anchor.safeRadius >= 0.01 && anchor.safeRadius <= 0.2
    && ['primary', 'secondary', 'latent'].includes(String(anchor.emphasis))
}

function validBrief(value: unknown): value is GenerationBrief {
  if (!value || typeof value !== 'object') return false
  const brief = value as Record<string, unknown>
  return brief.schemaVersion === 1
    && brief.experiencePackId === 'ascend'
    && typeof brief.experiencePackVersion === 'string' && brief.experiencePackVersion.length <= 40
    && typeof brief.id === 'string' && brief.id.length <= 300
    && typeof brief.missionId === 'string' && ID_PATTERN.test(brief.missionId)
    && typeof brief.missionRevision === 'number' && Number.isInteger(brief.missionRevision) && brief.missionRevision >= 0
    && typeof brief.sourceHandoffId === 'string' && ID_PATTERN.test(brief.sourceHandoffId)
    && typeof brief.sceneKey === 'string' && brief.sceneKey.length <= 80
    && typeof brief.prompt === 'string' && brief.prompt.length >= 80 && brief.prompt.length <= 12_000
    && typeof brief.negativePrompt === 'string' && brief.negativePrompt.length <= 3_000
    && typeof brief.sourceEntityCount === 'number' && brief.sourceEntityCount >= 1 && brief.sourceEntityCount <= 200
    && Array.isArray(brief.placementAnchors) && brief.placementAnchors.length >= 2 && brief.placementAnchors.length <= 10
    && brief.placementAnchors.every(validAnchor)
}

function parseCreateInput(value: unknown): CreateGenerationInput | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>
  if (!validBrief(input.brief)) return undefined
  if (typeof input.waypointProjectionRevision !== 'string' || !ID_PATTERN.test(input.waypointProjectionRevision)) return undefined
  if (typeof input.expeditionVisualSeed !== 'number' || !Number.isInteger(input.expeditionVisualSeed)) return undefined
  return {
    brief: input.brief,
    waypointProjectionRevision: input.waypointProjectionRevision,
    expeditionVisualSeed: input.expeditionVisualSeed,
  }
}

const CARD_SCENES = new Set<ScenarioCardSceneType>([
  'scenario_card_camp_iii',
  'scenario_card_persistence_blocker',
  'scenario_card_route_decision',
])

function parseScenarioCardInput(value: unknown): CreateGenerationInput | undefined {
  const input = parseCreateInput(value)
  if (!input || !value || typeof value !== 'object') return undefined
  const rawCard = (value as Record<string, unknown>).scenarioCard
  if (!rawCard || typeof rawCard !== 'object') return undefined
  const card = rawCard as Record<string, unknown>
  if (!CARD_SCENES.has(card.sceneType as ScenarioCardSceneType)) return undefined
  if (typeof card.focalEntityId !== 'string' || !ID_PATTERN.test(card.focalEntityId)) return undefined
  if (!['camp', 'blocker', 'decision'].includes(String(card.kind))) return undefined
  if (typeof card.prompt !== 'string' || card.prompt.length < 80 || card.prompt.length > 8_000) return undefined
  if (typeof card.negativePrompt !== 'string' || card.negativePrompt.length > 2_000) return undefined
  const crop = card.crop as Record<string, unknown> | undefined
  if (!crop || [crop.x, crop.y, crop.width, crop.height].some((part) => typeof part !== 'number')) return undefined
  const x = crop.x as number
  const y = crop.y as number
  const width = crop.width as number
  const height = crop.height as number
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) return undefined
  return {
    ...input,
    scenarioCard: {
      sceneType: card.sceneType as ScenarioCardSceneType,
      focalEntityId: card.focalEntityId,
      kind: card.kind as 'camp' | 'blocker' | 'decision',
      prompt: card.prompt,
      negativePrompt: card.negativePrompt,
      crop: { x, y, width, height },
    },
  }
}

async function requestJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('Content-Length') ?? 0)
  if (length > 64_000) throw new Error('Request body is too large.')
  return request.json()
}

function outputSize(env: Env, sceneType: GenerationSceneType) {
  return sceneType.startsWith('scenario_card_') ? '1600x960' : env.OPENAI_IMAGE_SIZE
}

function dimensions(size: string) {
  const match = /^(\d+)x(\d+)$/.exec(size)
  return { width: Number(match?.[1] ?? 3840), height: Number(match?.[2] ?? 2160) }
}

function publicGeneration(metadata: GenerationMetadata | undefined) {
  return metadata ? {
    ...metadata,
    assetUrl: metadata.assetKey
      ? `/api/generation/assets/${encodeURIComponent(metadata.expeditionId)}/${encodeURIComponent(metadata.generationId)}/image.png`
      : undefined,
  } : undefined
}

async function startGeneration(
  env: Env,
  sceneType: GenerationSceneType,
  input: CreateGenerationInput,
  retry?: { retryOf: string; nonce: string },
) {
  if (env.GENERATION_ENABLED !== 'true') return errorResponse(503, 'GENERATION_DISABLED', 'Image generation is disabled.')
  if (env.OPENAI_IMAGE_MODEL !== IMAGE_MODEL_SNAPSHOT) {
    return errorResponse(503, 'MODEL_MISMATCH', `Deployment must use ${IMAGE_MODEL_SNAPSHOT}.`)
  }

  const world = await readWorld(env.GENERATED_ART, input.brief.missionId)
  const needsCanonical = sceneType !== 'canonical_master'
  const canonicalMasterGenerationId = needsCanonical ? world.canonicalMasterGenerationId : undefined
  if (needsCanonical && !canonicalMasterGenerationId) {
    return errorResponse(409, 'MASTER_REQUIRED', 'Accept a canonical master mountain before generating a derivative.')
  }
  const requestedSize = outputSize(env, sceneType)

  const idempotencyDigest = await sha256(JSON.stringify({
    missionId: input.brief.missionId,
    missionRevision: input.brief.missionRevision,
    sceneType,
    promptVersion: PROMPT_VERSION,
    waypointProjectionRevision: input.waypointProjectionRevision,
    canonicalMasterGenerationId,
    imageModel: env.OPENAI_IMAGE_MODEL,
    imageSize: requestedSize,
    imageQuality: env.OPENAI_IMAGE_QUALITY,
    retry,
  }))
  const idempotencyKey = hex(idempotencyDigest)
  const generationId = `gen_${idempotencyKey.slice(0, 32)}`
  const existing = await readGeneration(env.GENERATED_ART, input.brief.missionId, generationId)
  if (existing) return json({ ok: true, deduplicated: true, generation: existing })

  const now = new Date().toISOString()
  const size = dimensions(requestedSize)
  const metadata: GenerationMetadata = {
    schemaVersion: 1,
    generationId,
    expeditionId: input.brief.missionId,
    idempotencyKey,
    model: env.OPENAI_IMAGE_MODEL,
    promptVersion: PROMPT_VERSION,
    sceneType,
    missionRevision: input.brief.missionRevision,
    waypointProjectionRevision: input.waypointProjectionRevision,
    canonicalMasterGenerationId,
    focalEntityId: input.scenarioCard?.focalEntityId,
    retryOf: retry?.retryOf,
    status: 'queued',
    width: size.width,
    height: size.height,
    quality: env.OPENAI_IMAGE_QUALITY,
    createdAt: now,
    updatedAt: now,
  }
  const job: GenerationJobParams = {
    generationId,
    sceneType,
    brief: input.brief,
    waypointProjectionRevision: input.waypointProjectionRevision,
    expeditionVisualSeed: input.expeditionVisualSeed,
    canonicalMasterGenerationId,
    outputSize: requestedSize,
    scenarioCard: input.scenarioCard,
    retryOf: retry?.retryOf,
  }
  await Promise.all([
    writeGeneration(env.GENERATED_ART, metadata),
    writeGenerationRequest(env.GENERATED_ART, job),
  ])
  try {
    await env.GENERATION_WORKFLOW.create({
      id: generationId,
      params: job,
      retention: { successRetention: '7 days', errorRetention: '7 days' },
    })
  } catch (error) {
    const current = await readGeneration(env.GENERATED_ART, input.brief.missionId, generationId)
    const duplicate = error instanceof Error && /already exists|conflict/i.test(error.message)
    if (current && (current.status !== 'queued' || duplicate)) {
      return json({ ok: true, deduplicated: true, generation: current })
    }
    if (current) {
      const failed: GenerationMetadata = {
        ...current,
        status: 'failed',
        errorCode: 'WORKFLOW_DISPATCH_FAILED',
        retryable: true,
        error: 'Cloudflare could not start the generation workflow. Retry with an explicit nonce.',
        updatedAt: new Date().toISOString(),
      }
      await writeGeneration(env.GENERATED_ART, failed)
    }
    console.error(JSON.stringify({
      event: 'workflow_dispatch_failed',
      generationId,
      message: error instanceof Error ? error.message.slice(0, 300) : 'Unknown workflow dispatch failure.',
    }))
    return errorResponse(503, 'WORKFLOW_DISPATCH_FAILED', 'Generation could not start. The request is safe to retry.')
  }
  return json({ ok: true, deduplicated: false, generation: metadata }, 202)
}

async function worldResponse(env: Env, missionId: string) {
  const world = await readWorld(env.GENERATED_ART, missionId)
  const canonicalMaster = world.canonicalMasterGenerationId
    ? await readGeneration(env.GENERATED_ART, missionId, world.canonicalMasterGenerationId)
    : undefined
  const activeId = world.scenes.camp_ii_active ?? world.canonicalMasterGenerationId
  const activeScene = activeId ? await readGeneration(env.GENERATED_ART, missionId, activeId) : undefined
  const scenarioCardEntries = await Promise.all(([
    ['camp', world.scenes.scenario_card_camp_iii],
    ['blocker', world.scenes.scenario_card_persistence_blocker],
    ['decision', world.scenes.scenario_card_route_decision],
  ] as const).map(async ([kind, generationId]) => [
    kind,
    generationId ? publicGeneration(await readGeneration(env.GENERATED_ART, missionId, generationId)) : undefined,
  ] as const))
  const response: WorldManifestResponse = {
    ...world,
    canonicalMaster: publicGeneration(canonicalMaster),
    activeScene: publicGeneration(activeScene),
    scenarioCards: Object.fromEntries(scenarioCardEntries.filter((entry) => entry[1] !== undefined)),
  }
  return json({ ok: true, world: response })
}

async function acceptGeneration(env: Env, missionId: string, generationId: string) {
  const metadata = await readGeneration(env.GENERATED_ART, missionId, generationId)
  if (!metadata) return errorResponse(404, 'NOT_FOUND', 'Generation was not found.')
  if (metadata.status !== 'ready') return errorResponse(409, 'NOT_REVIEWABLE', `Generation is ${metadata.status}.`)
  const world = await readWorld(env.GENERATED_ART, missionId)
  if (metadata.sceneType !== 'canonical_master' && metadata.canonicalMasterGenerationId !== world.canonicalMasterGenerationId) {
    return errorResponse(409, 'STALE_REFERENCE', 'This derivative was not created from the currently accepted master.')
  }
  const now = new Date().toISOString()
  const accepted = {
    ...metadata,
    status: 'accepted' as const,
    updatedAt: now,
    composition: metadata.sceneType === 'camp_ii_active' && metadata.canonicalMasterGenerationId
      ? {
          baseGenerationId: metadata.canonicalMasterGenerationId,
          mask: { kind: 'ellipse' as const, x: 0.617, y: 0.554, radiusX: 0.121, radiusY: 0.123 },
        }
      : undefined,
  }
  const nextWorld = metadata.sceneType === 'canonical_master'
    ? { ...world, canonicalMasterGenerationId: generationId, scenes: { canonical_master: generationId }, updatedAt: now }
    : { ...world, scenes: { ...world.scenes, [metadata.sceneType]: generationId }, updatedAt: now }
  await Promise.all([writeGeneration(env.GENERATED_ART, accepted), writeWorld(env.GENERATED_ART, nextWorld)])
  return json({ ok: true, generation: accepted, world: nextWorld })
}

async function rejectGeneration(env: Env, missionId: string, generationId: string) {
  const metadata = await readGeneration(env.GENERATED_ART, missionId, generationId)
  if (!metadata) return errorResponse(404, 'NOT_FOUND', 'Generation was not found.')
  if (metadata.status !== 'ready') return errorResponse(409, 'NOT_REVIEWABLE', `Generation is ${metadata.status}.`)
  const rejected = { ...metadata, status: 'rejected' as const, updatedAt: new Date().toISOString() }
  await writeGeneration(env.GENERATED_ART, rejected)
  return json({ ok: true, generation: rejected })
}

async function retryGeneration(env: Env, missionId: string, generationId: string, nonce: string) {
  if (!ID_PATTERN.test(nonce)) return errorResponse(400, 'INVALID_RETRY_NONCE', 'A stable retry nonce is required.')
  const [metadata, job] = await Promise.all([
    readGeneration(env.GENERATED_ART, missionId, generationId),
    readGenerationRequest(env.GENERATED_ART, missionId, generationId),
  ])
  if (!metadata || !job) return errorResponse(404, 'NOT_FOUND', 'Generation request was not found.')
  if (metadata.status === 'accepted' || metadata.status === 'queued' || metadata.status === 'running') {
    return errorResponse(409, 'NOT_RETRYABLE', `Generation is ${metadata.status}.`)
  }
  return startGeneration(env, metadata.sceneType, {
    brief: job.brief,
    waypointProjectionRevision: job.waypointProjectionRevision,
    expeditionVisualSeed: job.expeditionVisualSeed,
    scenarioCard: job.scenarioCard,
  }, { retryOf: generationId, nonce })
}

async function serveAsset(env: Env, missionId: string, generationId: string, request: Request) {
  const metadata = await readGeneration(env.GENERATED_ART, missionId, generationId)
  if (!metadata || !['ready', 'accepted'].includes(metadata.status)) return errorResponse(404, 'NOT_FOUND', 'Artwork is unavailable.')
  const object = await env.GENERATED_ART.get(generationAssetKey(missionId, generationId), { onlyIf: request.headers })
  if (!object) return errorResponse(404, 'NOT_FOUND', 'Artwork is unavailable.')
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return new Response('body' in object ? object.body : null, { status: 'body' in object ? 200 : 304, headers })
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)

  if (request.method === 'GET' && url.pathname === '/api/generation/health') {
    return json({
      ok: true,
      generationEnabled: env.GENERATION_ENABLED === 'true',
      model: env.OPENAI_IMAGE_MODEL,
      pinnedModelValid: env.OPENAI_IMAGE_MODEL === IMAGE_MODEL_SNAPSHOT,
      storage: 'r2',
      workflow: 'cloudflare-workflows',
      retries: 'explicit-only',
    })
  }

  if (request.method === 'GET' && url.pathname === '/api/generation/world') {
    const missionId = url.searchParams.get('missionId') ?? ''
    if (!ID_PATTERN.test(missionId)) return errorResponse(400, 'INVALID_MISSION_ID', 'A valid missionId is required.')
    return worldResponse(env, missionId)
  }

  if (request.method === 'GET' && parts[2] === 'status' && parts.length === 5) {
    const missionId = decodeURIComponent(parts[3])
    const generationId = decodeURIComponent(parts[4])
    if (!ID_PATTERN.test(missionId) || !ID_PATTERN.test(generationId)) return errorResponse(400, 'INVALID_ID', 'Invalid generation identifier.')
    const generation = await readGeneration(env.GENERATED_ART, missionId, generationId)
    return generation ? json({ ok: true, generation }) : errorResponse(404, 'NOT_FOUND', 'Generation was not found.')
  }

  if (request.method === 'GET' && parts[2] === 'assets' && (parts.length === 5 || (parts.length === 6 && parts[5] === 'image.png'))) {
    const missionId = decodeURIComponent(parts[3])
    const generationId = decodeURIComponent(parts[4])
    if (!ID_PATTERN.test(missionId) || !ID_PATTERN.test(generationId)) return errorResponse(400, 'INVALID_ID', 'Invalid generation identifier.')
    return serveAsset(env, missionId, generationId, request)
  }

  if (!(await authorized(request, env))) return errorResponse(401, 'UNAUTHORIZED', 'Generation administration requires authorization.')

  if (request.method === 'GET' && url.pathname === '/api/generation/provider-check') {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // Prompt is intentionally omitted: OpenAI must authenticate and validate
      // the pinned image request, but cannot create or bill for an image.
      body: JSON.stringify({ model: env.OPENAI_IMAGE_MODEL }),
      signal: AbortSignal.timeout(15_000),
    })
    const credentialAccepted = response.status === 400
    return json({
      ok: credentialAccepted,
      reachable: true,
      model: env.OPENAI_IMAGE_MODEL,
      credentialAccepted,
      billableGenerationStarted: false,
      providerStatus: response.status,
    }, credentialAccepted ? 200 : 502)
  }

  if (request.method === 'POST' && (url.pathname === '/api/generation/master' || url.pathname === '/api/generation/focus')) {
    const input = parseCreateInput(await requestJson(request))
    if (!input) return errorResponse(400, 'INVALID_INPUT', 'Generation input failed the closed Ascend schema.')
    return startGeneration(env, url.pathname.endsWith('/master') ? 'canonical_master' : 'camp_ii_active', input)
  }

  if (request.method === 'POST' && url.pathname === '/api/generation/card') {
    const input = parseScenarioCardInput(await requestJson(request))
    if (!input?.scenarioCard) return errorResponse(400, 'INVALID_INPUT', 'Scenario-card input failed the closed Ascend schema.')
    return startGeneration(env, input.scenarioCard.sceneType, input)
  }

  if (request.method === 'POST' && parts[2] === 'review' && parts.length === 6) {
    const missionId = decodeURIComponent(parts[3])
    const generationId = decodeURIComponent(parts[4])
    const action = parts[5]
    if (!ID_PATTERN.test(missionId) || !ID_PATTERN.test(generationId)) return errorResponse(400, 'INVALID_ID', 'Invalid generation identifier.')
    if (action === 'accept') return acceptGeneration(env, missionId, generationId)
    if (action === 'reject') return rejectGeneration(env, missionId, generationId)
    if (action === 'retry') {
      const body = await requestJson(request) as { retryNonce?: unknown }
      return retryGeneration(env, missionId, generationId, typeof body.retryNonce === 'string' ? body.retryNonce : '')
    }
  }

  return errorResponse(404, 'NOT_FOUND', 'API route not found.')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error.'
        console.error(JSON.stringify({ event: 'api_error', path: url.pathname, message }))
        return errorResponse(500, 'INTERNAL_ERROR', 'The request could not be completed.')
      }
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
