import { ascendAssetFileKey, type AscendProductionAssetManifest } from './assets'
import type { ExpeditionSceneSelection } from './sceneSelection'

export interface ExpeditionRendererFrame {
  selection: ExpeditionSceneSelection
  viewport: { width: number; height: number; pixelRatio: number }
  reducedMotion: boolean
}

export interface GeneratedSceneLayerSource {
  id: string
  url: string
  depthBand: 'far' | 'background' | 'midground' | 'subject' | 'foreground'
  parallax: number
  mask?: {
    kind: 'ellipse'
    x: number
    y: number
    radiusX: number
    radiusY: number
  }
}

export interface GeneratedSceneSource {
  generationId?: string
  flattened: boolean
  width: number
  height: number
  quality?: string
  layers: GeneratedSceneLayerSource[]
}

export const ASCEND_PRODUCTION_MASTER = {
  width: 3840,
  height: 2160,
  aspectRatio: '16:9',
} as const

export type SceneResolutionTier = 'production' | 'review'

export interface SceneResolutionAssessment {
  tier: SceneResolutionTier
  label: string
  sourcePixels: number
  requiredPixels: number
}

/**
 * Keeps review renders honest. Display density can make a canvas crisp, but it
 * cannot replace detail missing from the accepted source image.
 */
export function assessSceneResolution(source: Pick<GeneratedSceneSource, 'width' | 'height'>): SceneResolutionAssessment {
  const sourcePixels = source.width * source.height
  const requiredPixels = ASCEND_PRODUCTION_MASTER.width * ASCEND_PRODUCTION_MASTER.height
  const production = source.width >= ASCEND_PRODUCTION_MASTER.width
    && source.height >= ASCEND_PRODUCTION_MASTER.height
  return {
    tier: production ? 'production' : 'review',
    label: production ? '4K master' : `${Math.round(source.width / 1024)}K review master`,
    sourcePixels,
    requiredPixels,
  }
}

export interface ExpeditionRendererAdapter {
  readonly kind: 'ascend-mountain-overview-2.5d'
  mount(host: HTMLElement, assets: AscendProductionAssetManifest): Promise<void>
  render(frame: ExpeditionRendererFrame): void
  resize(width: number, height: number, pixelRatio: number): void
  destroy(): void
}

export function assertProductionAssetsReady(manifest: AscendProductionAssetManifest): void {
  const missing = manifest.slots.flatMap((slot) => slot.variants
    .map((variant) => ascendAssetFileKey(slot.id, variant))
    .filter((key) => !manifest.files[key]))
  if (missing.length > 0) {
    throw new Error(`Ascend production artwork is incomplete: ${missing.join(', ')}`)
  }
}
