import { describe, expect, it } from 'vitest'
import { ASCEND_PRODUCTION_ASSET_SLOTS, ascendAssetFileKey, createEmptyProductionManifest } from './assets'
import { assertProductionAssetsReady } from './productionRenderer'

describe('Ascend production asset gate', () => {
  it('contains every required production category without placeholder formats', () => {
    const categories = new Set(ASCEND_PRODUCTION_ASSET_SLOTS.map((slot) => slot.category))
    expect(categories).toEqual(new Set([
      'hero_environment', 'foreground', 'midground', 'background', 'climber', 'basecamp', 'camp',
      'normal_route', 'fog', 'crevasse_blocker', 'route_fork', 'secured_crossing', 'new_ridge',
      'final_approach', 'summit', 'weather_overlay', 'scenario_card',
    ]))
    expect(ASCEND_PRODUCTION_ASSET_SLOTS.every((slot) => slot.availability === 'awaiting_art')).toBe(true)
    expect(JSON.stringify(ASCEND_PRODUCTION_ASSET_SLOTS)).not.toMatch(/placeholder|vector/i)
  })

  it('refuses to mount production without reviewed files for every slot', () => {
    expect(() => assertProductionAssetsReady(createEmptyProductionManifest())).toThrow(
      /Ascend production artwork is incomplete/,
    )
  })

  it('requires every variant rather than one representative file per slot', () => {
    const empty = createEmptyProductionManifest()
    const allButOne = Object.fromEntries(empty.slots.flatMap((slot) => slot.variants.map((variant) => [
      ascendAssetFileKey(slot.id, variant),
      `/assets/ascend/production/${slot.id}/${variant}.webp`,
    ])))
    delete allButOne[ascendAssetFileKey('scene.summit', 'celebration')]
    expect(() => assertProductionAssetsReady({ ...empty, files: allButOne })).toThrow(/scene\.summit\.celebration/)
  })
})
