import type { PersistedGeneratedWorld } from './generation'

interface WorldResponse {
  ok: boolean
  world?: PersistedGeneratedWorld
}

export async function loadGeneratedWorld(missionId: string, signal?: AbortSignal): Promise<PersistedGeneratedWorld | undefined> {
  const response = await fetch(`/api/generation/world?missionId=${encodeURIComponent(missionId)}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`Generated world lookup failed with HTTP ${response.status}.`)
  const payload = await response.json() as WorldResponse
  return payload.world
}
