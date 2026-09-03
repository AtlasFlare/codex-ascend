import { describe, expect, it } from 'vitest'
import { BUNDLED_HERO_SCENE_ASSETS, resolveBundledHeroSceneAsset } from './localHeroReviewAssets'

describe('bundled hero scene assets', () => {
  it('binds semantic weather states without changing normal-route rendering', () => {
    expect(resolveBundledHeroSceneAsset('fog')).toBe(BUNDLED_HERO_SCENE_ASSETS.surveyFog)
    expect(resolveBundledHeroSceneAsset('crevasse_blocker')).toBe(BUNDLED_HERO_SCENE_ASSETS.blockerStorm)
    expect(resolveBundledHeroSceneAsset('route_fork')).toBe(BUNDLED_HERO_SCENE_ASSETS.decisionBreak)
    expect(resolveBundledHeroSceneAsset('summit')).toBe(BUNDLED_HERO_SCENE_ASSETS.summitReveal)
    expect(resolveBundledHeroSceneAsset('normal_route')).toBeUndefined()
  })

  it('keeps the portrait derivative presentation-only', () => {
    expect(BUNDLED_HERO_SCENE_ASSETS.mobileClear.width).toBeLessThan(BUNDLED_HERO_SCENE_ASSETS.mobileClear.height)
    expect(BUNDLED_HERO_SCENE_ASSETS.mobileClear.assetUrl).toContain('mobile-clear')
  })
})
