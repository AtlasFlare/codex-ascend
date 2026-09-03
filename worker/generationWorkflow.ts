import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { NonRetryableError } from 'cloudflare:workflows'
import type { GenerationJobParams, GenerationMetadata } from './contracts'
import { generateImage, OpenAIImageProviderError } from './openaiImageProvider'
import { generationAssetKey, readGeneration, writeGeneration } from './storage'

export class AscendGenerationWorkflow extends WorkflowEntrypoint<Env, GenerationJobParams> {
  async run(event: WorkflowEvent<GenerationJobParams>, step: WorkflowStep) {
    const job = event.payload
    try {
      await step.do('mark generation running', async () => {
        const metadata = await readGeneration(this.env.GENERATED_ART, job.brief.missionId, job.generationId)
        if (!metadata) throw new NonRetryableError('Generation metadata is missing.')
        await writeGeneration(this.env.GENERATED_ART, { ...metadata, status: 'running', updatedAt: new Date().toISOString() })
        return { status: 'running' }
      })

      const result = await step.do<{ assetKey: string; latencyMs: number; usageJson: string | null; providerRequestId?: string }>(
        'generate and persist image',
        { retries: { limit: 0, delay: '1 second', backoff: 'constant' }, timeout: '5 minutes' },
        async () => {
          const canonical = job.canonicalMasterGenerationId
            ? await this.env.GENERATED_ART.get(generationAssetKey(job.brief.missionId, job.canonicalMasterGenerationId))
            : undefined
          const editMask = job.sceneType === 'camp_ii_active'
            ? await this.env.ASSETS.fetch(new Request('https://assets.local/internal/camp-ii-edit-mask-v1.png'))
            : undefined
          if (editMask && !editMask.ok) throw new NonRetryableError('Camp II continuity mask is unavailable.')
          const generated = await generateImage(
            this.env,
            job,
            canonical ?? undefined,
            editMask ? await editMask.arrayBuffer() : undefined,
          )
          const assetKey = generationAssetKey(job.brief.missionId, job.generationId)
          await this.env.GENERATED_ART.put(assetKey, generated.bytes, {
            httpMetadata: { contentType: generated.mimeType, cacheControl: 'public, max-age=31536000, immutable' },
            customMetadata: {
              expeditionId: job.brief.missionId,
              generationId: job.generationId,
              sceneType: job.sceneType,
              model: this.env.OPENAI_IMAGE_MODEL,
            },
          })
          return {
            assetKey,
            latencyMs: generated.latencyMs,
            usageJson: generated.usage ? JSON.stringify(generated.usage) : null,
            providerRequestId: generated.providerRequestId,
          }
        },
      )

      return step.do('mark generation ready for review', async () => {
        const metadata = await readGeneration(this.env.GENERATED_ART, job.brief.missionId, job.generationId)
        if (!metadata) throw new NonRetryableError('Generation metadata disappeared before completion.')
        const ready: GenerationMetadata = {
          ...metadata,
          status: 'ready',
          assetKey: result.assetKey,
          assetUrl: `/api/generation/assets/${encodeURIComponent(job.brief.missionId)}/${encodeURIComponent(job.generationId)}/image.png`,
          mimeType: 'image/png',
          latencyMs: result.latencyMs,
          usage: result.usageJson ? JSON.parse(result.usageJson) as Record<string, unknown> : undefined,
          providerRequestId: result.providerRequestId,
          updatedAt: new Date().toISOString(),
        }
        await writeGeneration(this.env.GENERATED_ART, ready)
        return { generationId: ready.generationId, status: ready.status, latencyMs: ready.latencyMs }
      })
    } catch (error) {
      const existing = await readGeneration(this.env.GENERATED_ART, job.brief.missionId, job.generationId)
      if (existing) {
        const providerError = error instanceof OpenAIImageProviderError ? error : undefined
        await writeGeneration(this.env.GENERATED_ART, {
          ...existing,
          status: 'failed',
          providerRequestId: providerError?.providerRequestId,
          errorCode: providerError?.code ?? (providerError ? `HTTP_${providerError.status}` : 'GENERATION_FAILED'),
          retryable: providerError?.retryable ?? false,
          error: error instanceof Error ? error.message.slice(0, 500) : 'Generation failed.',
          updatedAt: new Date().toISOString(),
        })
      }
      throw error
    }
  }
}
