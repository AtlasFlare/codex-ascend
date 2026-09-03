import { afterEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_MODEL_SNAPSHOT, type GenerationJobParams } from './contracts'
import { generateImage, OpenAIImageProviderError } from './openaiImageProvider'

const env = {
  OPENAI_API_KEY: 'test-key-never-sent',
  OPENAI_IMAGE_MODEL: IMAGE_MODEL_SNAPSHOT,
  OPENAI_IMAGE_SIZE: '3840x2160',
  OPENAI_IMAGE_QUALITY: 'high',
}

const job: GenerationJobParams = {
  generationId: 'gen_test',
  sceneType: 'canonical_master',
  brief: {
    schemaVersion: 1,
    id: 'brief_test',
    experiencePackId: 'ascend',
    experiencePackVersion: '4.0.0',
    missionId: 'mission_test',
    missionRevision: 1,
    sourceHandoffId: 'handoff_test',
    sceneKey: 'canonical',
    prompt: 'A deterministic premium editorial mountain scene with calm readable geography and generous sky for mission overlays.'.repeat(2),
    negativePrompt: 'text, interface, labels',
    sourceEntityCount: 2,
    placementAnchors: [
      { entityId: 'basecamp', x: 0.2, y: 0.8, safeRadius: 0.08, emphasis: 'primary' },
      { entityId: 'summit', x: 0.55, y: 0.2, safeRadius: 0.08, emphasis: 'primary' },
    ],
    createdAt: '2026-08-30T00:00:00.000Z',
  },
  waypointProjectionRevision: 'projection_v1',
  expeditionVisualSeed: 42,
  outputSize: '3840x2160',
}

afterEach(() => vi.unstubAllGlobals())

describe('OpenAI image provider', () => {
  it('uses the pinned model and captures provider request evidence', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body).toMatchObject({ model: IMAGE_MODEL_SNAPSHOT, size: '3840x2160', quality: 'high', n: 1 })
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-key-never-sent' })
      return new Response(JSON.stringify({ data: [{ b64_json: btoa('PNG') }], usage: { total_tokens: 12 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_ascend_test' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateImage(env, job)

    expect(Array.from(result.bytes)).toEqual([80, 78, 71])
    expect(result.providerRequestId).toBe('req_ascend_test')
    expect(result.usage).toEqual({ total_tokens: 12 })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    [400, 'invalid_request', false],
    [429, 'rate_limit_exceeded', true],
    [503, 'service_unavailable', true],
  ])('classifies HTTP %i failures for explicit retry handling', async (status, code, retryable) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code, message: 'Provider rejected the test request.' } }), {
      status,
      headers: { 'Content-Type': 'application/json', 'x-request-id': `req_${status}` },
    })))

    const error = await generateImage(env, job).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(OpenAIImageProviderError)
    expect(error).toMatchObject({ status, code, retryable, providerRequestId: `req_${status}` })
  })
})
