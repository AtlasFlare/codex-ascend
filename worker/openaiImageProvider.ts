import { IMAGE_MODEL_SNAPSHOT, type GenerationJobParams } from './contracts'

interface ProviderEnv {
  OPENAI_API_KEY: string
  OPENAI_IMAGE_MODEL: string
  OPENAI_IMAGE_SIZE: string
  OPENAI_IMAGE_QUALITY: string
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>
  usage?: Record<string, unknown>
  error?: { message?: string; code?: string }
}

export interface GeneratedImage {
  bytes: Uint8Array
  mimeType: 'image/png'
  latencyMs: number
  usage?: Record<string, unknown>
  providerRequestId?: string
}

export class OpenAIImageProviderError extends Error {
  readonly status: number
  readonly code?: string
  readonly providerRequestId?: string
  readonly retryable: boolean

  constructor(
    message: string,
    details: { status: number; code?: string; providerRequestId?: string; retryable: boolean },
  ) {
    super(message)
    this.name = 'OpenAIImageProviderError'
    this.status = details.status
    this.code = details.code
    this.providerRequestId = details.providerRequestId
    this.retryable = details.retryable
  }
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function promptFor(job: GenerationJobParams) {
  const anchorSummary = job.brief.placementAnchors
    .map((anchor) => `${anchor.entityId}@${anchor.x.toFixed(3)},${anchor.y.toFixed(3)} radius ${anchor.safeRadius.toFixed(3)}`)
    .join('; ')
  const shared = [
    job.brief.prompt,
    `Expedition visual seed: ${job.expeditionVisualSeed}.`,
    `Deterministic overlay anchors (reserve clear terrain; never paint markers): ${anchorSummary}.`,
    'The generated pixels are scenic context only. Do not paint UI, coordinates, text, route lines, dots, pins, labels, or diagrams.',
    `Avoid: ${job.brief.negativePrompt}.`,
  ]

  if (job.sceneType === 'canonical_master') {
    return [
      'CANONICAL MASTER MOUNTAIN. Establish one memorable persistent mountain identity for all later scenes.',
      'This is a deliberately stylized premium editorial matte illustration, not a photograph. Use simplified hand-painted snow and rock planes, gently faceted brush shapes, selective texture, softened edges, and restrained detail inspired by a high-end illustrated travel atlas.',
      'Wide entire-mountain cutout overview: one iconic calm pyramidal silhouette with one supporting shoulder, broad readable faces instead of a sawtooth skyline, and a lower outline dissolving completely into a soft milky cloud bank.',
      'The mountain occupies roughly 58 percent of the canvas width and 66 percent of its height, centered slightly left and sitting low enough that the summit is in the upper third rather than touching the frame. Show the entire silhouette and base cloud cutoff.',
      'Preserve generous pale blue-white sky around the mountain, especially left and upper-left, with physically plausible ledges for waypoint overlays and quiet transparent HUD composition zones.',
      'Avoid photorealism, photographic microtexture, telephoto framing, edge-to-edge mountain crop, hyper-detailed crags, multiple competing peaks, and cinematic stock-photo treatment.',
      ...shared,
    ].join(' ')
  }

  if (job.sceneType === 'camp_ii_active') return [
    'CAMP II / ACTIVE ASCENT DERIVATIVE. EDIT IN PLACE. The supplied canonical master is immutable visual identity and immutable composition.',
    'Keep every mountain, sky, cloud, color, light, shadow, summit silhouette, ridge, landmark, and canvas edge pixel unchanged outside the transparent edit-mask opening.',
    'Do not reframe, crop, zoom, move, relight, repaint, extend, or reinterpret the mountain. Do not add, remove, split, widen, sharpen, or soften any peak or ridge.',
    'Inside only the small Camp II edit-mask opening, add a physically believable high-altitude camp on the existing sheltered ledge: two or three tiny warm orange tents and minimal expedition equipment. Match the original illustration finish and scale. No signage and no people required.',
    'The accepted master must remain instantly identifiable under a pixel-level overlay comparison; only the Camp II ledge may change.',
    ...shared,
  ].join(' ')

  if (!job.scenarioCard) throw new Error('Scenario-card generation context is missing.')
  return [
    'ASCEND SCENARIO-CARD DERIVATIVE. Use the supplied canonical master as the immutable mountain identity and high-fidelity geographic reference.',
    'Create a clean 5:3 editorial illustration for a transparent scenario card. Reframe the exact referenced waypoint geography more closely while preserving ridge direction, rock and snow planes, lighting, palette, weather, and scale cues from the master.',
    `Card semantic: ${job.scenarioCard.kind}. Focal mission entity: ${job.scenarioCard.focalEntityId}. Source crop: x=${job.scenarioCard.crop.x.toFixed(3)}, y=${job.scenarioCard.crop.y.toFixed(3)}, width=${job.scenarioCard.crop.width.toFixed(3)}, height=${job.scenarioCard.crop.height.toFixed(3)}.`,
    job.scenarioCard.prompt,
    'Leave the left 55 percent compositionally quiet enough for live translucent copy. Express mission state only through physical terrain, camp equipment, light, and atmosphere.',
    'Do not paint text, cards, frames, UI, route lines, dots, pins, badges, diagrams, or logos into the artwork.',
    `Avoid: ${job.scenarioCard.negativePrompt}.`,
    ...shared,
  ].join(' ')
}

async function parseImageResponse(response: Response, startedAt: number): Promise<GeneratedImage> {
  const providerRequestId = response.headers.get('x-request-id') ?? undefined
  const payload: OpenAIImageResponse = await response.json<OpenAIImageResponse>().catch(() => ({}))
  if (!response.ok) {
    const code = payload.error?.code ? ` (${payload.error.code})` : ''
    throw new OpenAIImageProviderError(
      `OpenAI image request failed${code}: ${payload.error?.message ?? `HTTP ${response.status}`}`,
      {
        status: response.status,
        code: payload.error?.code,
        providerRequestId,
        retryable: response.status === 429 || response.status >= 500,
      },
    )
  }
  const encoded = payload.data?.[0]?.b64_json
  if (!encoded) {
    throw new OpenAIImageProviderError('OpenAI image response did not include image bytes.', {
      status: response.status,
      providerRequestId,
      retryable: false,
    })
  }
  return {
    bytes: decodeBase64(encoded),
    mimeType: 'image/png',
    latencyMs: Math.round(performance.now() - startedAt),
    usage: payload.usage,
    providerRequestId,
  }
}

export async function generateImage(
  env: ProviderEnv,
  job: GenerationJobParams,
  canonical?: R2ObjectBody,
  editMask?: ArrayBuffer,
): Promise<GeneratedImage> {
  if (env.OPENAI_IMAGE_MODEL !== IMAGE_MODEL_SNAPSHOT) {
    throw new Error(`Pinned model mismatch. Expected ${IMAGE_MODEL_SNAPSHOT}.`)
  }
  const startedAt = performance.now()
  const headers = { Authorization: `Bearer ${env.OPENAI_API_KEY}` }
  const common = {
    model: env.OPENAI_IMAGE_MODEL,
    prompt: promptFor(job),
    size: job.outputSize,
    quality: env.OPENAI_IMAGE_QUALITY,
    n: '1',
  }

  if (job.sceneType === 'canonical_master') {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...common, n: 1 }),
      signal: AbortSignal.timeout(240_000),
    })
    return parseImageResponse(response, startedAt)
  }

  if (!canonical?.body) throw new Error('Accepted canonical master bytes are unavailable.')
  const form = new FormData()
  for (const [key, value] of Object.entries(common)) form.append(key, value)
  form.append('image[]', new Blob([await canonical.arrayBuffer()], { type: canonical.httpMetadata?.contentType ?? 'image/png' }), 'canonical-master.png')
  if (editMask) form.append('mask', new Blob([editMask], { type: 'image/png' }), 'camp-ii-edit-mask.png')
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(240_000),
  })
  return parseImageResponse(response, startedAt)
}
