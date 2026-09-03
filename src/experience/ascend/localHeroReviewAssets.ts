import type { ExpeditionSceneKind } from './sceneSelection'

export interface BundledHeroSceneAsset {
  generationId: string
  assetUrl: string
  width: number
  height: number
}

const landscape = (generationId: string, assetUrl: string): BundledHeroSceneAsset => ({
  generationId,
  assetUrl,
  width: 1672,
  height: 941,
})

export const BUNDLED_HERO_SCENE_ASSETS = {
  mobileClear: {
    generationId: 'codex-subscription:mobile-clear:v1',
    assetUrl: '/art/ascend/hero-variants/mobile-clear-subscription-v1.jpg',
    width: 941,
    height: 1672,
  },
  surveyFog: landscape('codex-subscription:survey-fog:v1', '/art/ascend/hero-variants/survey-fog-subscription-v1.jpg'),
  blockerStorm: landscape('codex-subscription:blocker-storm:v1', '/art/ascend/hero-variants/blocker-storm-subscription-v1.jpg'),
  decisionBreak: landscape('codex-subscription:decision-break:v1', '/art/ascend/hero-variants/decision-break-subscription-v1.jpg'),
  summitReveal: landscape('codex-subscription:summit-reveal:v1', '/art/ascend/hero-variants/summit-reveal-subscription-v1.jpg'),
} as const

export function resolveBundledHeroSceneAsset(kind: ExpeditionSceneKind): BundledHeroSceneAsset | undefined {
  if (kind === 'fog') return BUNDLED_HERO_SCENE_ASSETS.surveyFog
  if (kind === 'crevasse_blocker') return BUNDLED_HERO_SCENE_ASSETS.blockerStorm
  if (kind === 'route_fork') return BUNDLED_HERO_SCENE_ASSETS.decisionBreak
  if (kind === 'summit') return BUNDLED_HERO_SCENE_ASSETS.summitReveal
  return undefined
}
