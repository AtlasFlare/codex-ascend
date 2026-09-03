import type { GenerationJobParams, GenerationMetadata, WorldManifest } from './contracts'

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160)

export function generationPrefix(missionId: string, generationId: string) {
  return `missions/${safeId(missionId)}/generations/${safeId(generationId)}`
}

export function generationMetadataKey(missionId: string, generationId: string) {
  return `${generationPrefix(missionId, generationId)}/metadata.json`
}

export function generationAssetKey(missionId: string, generationId: string) {
  return `${generationPrefix(missionId, generationId)}/image.png`
}

export function generationRequestKey(missionId: string, generationId: string) {
  return `${generationPrefix(missionId, generationId)}/request.json`
}

export function worldManifestKey(missionId: string) {
  return `missions/${safeId(missionId)}/world.json`
}

export async function readJson<T>(bucket: R2Bucket, key: string): Promise<T | undefined> {
  const object = await bucket.get(key)
  if (!object?.body) return undefined
  return object.json<T>()
}

export async function writeJson(bucket: R2Bucket, key: string, value: unknown) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'no-store' },
  })
}

export function readGeneration(bucket: R2Bucket, missionId: string, generationId: string) {
  return readJson<GenerationMetadata>(bucket, generationMetadataKey(missionId, generationId))
}

export function writeGeneration(bucket: R2Bucket, metadata: GenerationMetadata) {
  return writeJson(bucket, generationMetadataKey(metadata.expeditionId, metadata.generationId), metadata)
}

export function readGenerationRequest(bucket: R2Bucket, missionId: string, generationId: string) {
  return readJson<GenerationJobParams>(bucket, generationRequestKey(missionId, generationId))
}

export function writeGenerationRequest(bucket: R2Bucket, job: GenerationJobParams) {
  return writeJson(bucket, generationRequestKey(job.brief.missionId, job.generationId), job)
}

export async function readWorld(bucket: R2Bucket, missionId: string): Promise<WorldManifest> {
  return (await readJson<WorldManifest>(bucket, worldManifestKey(missionId))) ?? {
    schemaVersion: 1,
    expeditionId: missionId,
    scenes: {},
    updatedAt: new Date(0).toISOString(),
  }
}

export function writeWorld(bucket: R2Bucket, world: WorldManifest) {
  return writeJson(bucket, worldManifestKey(world.expeditionId), world)
}
