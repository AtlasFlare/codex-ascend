export type AscendAssetCategory =
  | 'hero_environment'
  | 'foreground'
  | 'midground'
  | 'background'
  | 'climber'
  | 'basecamp'
  | 'camp'
  | 'normal_route'
  | 'fog'
  | 'crevasse_blocker'
  | 'route_fork'
  | 'secured_crossing'
  | 'new_ridge'
  | 'final_approach'
  | 'summit'
  | 'weather_overlay'
  | 'scenario_card'

export type AscendAssetFormat = 'png' | 'webp' | 'spritesheet'
export type AscendBlendMode = 'normal' | 'screen' | 'multiply' | 'add'

export interface AscendAssetSlot {
  id: string
  category: AscendAssetCategory
  sourceSize: { width: number; height: number }
  format: AscendAssetFormat
  transparent: boolean
  anchor: { x: number; y: number }
  depthBand: 'far' | 'background' | 'midground' | 'subject' | 'foreground' | 'atmosphere' | 'hud'
  parallax: number
  blendMode: AscendBlendMode
  variants: readonly string[]
  availability: 'awaiting_art'
}

export interface AscendProductionAssetManifest {
  id: 'ascend-alpine-production'
  version: string
  colorSpace: 'srgb'
  alphaMode: 'straight'
  referenceViewport: { width: 3840; height: 2160 }
  slots: readonly AscendAssetSlot[]
  files: Readonly<Record<string, string>>
}

export function ascendAssetFileKey(slotId: string, variant: string): string {
  return `${slotId}.${variant}`
}

const slot = (
  id: string,
  category: AscendAssetCategory,
  width: number,
  height: number,
  format: AscendAssetFormat,
  transparent: boolean,
  anchor: { x: number; y: number },
  depthBand: AscendAssetSlot['depthBand'],
  parallax: number,
  variants: readonly string[],
  blendMode: AscendBlendMode = 'normal',
): AscendAssetSlot => ({
  id,
  category,
  sourceSize: { width, height },
  format,
  transparent,
  anchor,
  depthBand,
  parallax,
  blendMode,
  variants,
  availability: 'awaiting_art',
})

/**
 * Production slots only. No filenames are populated until reviewed artwork is supplied.
 * The existing geometric renderer is a separate diagnostic Mission Map and does not
 * satisfy any slot in this manifest.
 */
export const ASCEND_PRODUCTION_ASSET_SLOTS = [
  slot('environment.sky', 'hero_environment', 4096, 2304, 'webp', false, { x: 0.5, y: 0.5 }, 'far', 0.02, ['clear', 'overcast', 'storm']),
  slot('environment.far_ridges', 'background', 4096, 2304, 'webp', true, { x: 0.5, y: 1 }, 'background', 0.08, ['lower', 'mid', 'upper', 'summit']),
  slot('environment.hero_slope', 'hero_environment', 4096, 2304, 'webp', true, { x: 0.5, y: 1 }, 'midground', 0.22, ['lower', 'mid', 'upper', 'final', 'summit']),
  slot('environment.foreground_mask', 'foreground', 4096, 1536, 'webp', true, { x: 0.5, y: 1 }, 'foreground', 0.52, ['rock', 'snow', 'ice']),
  slot('environment.midground_terrain', 'midground', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'midground', 0.3, ['ledge', 'slope', 'ice_wall', 'ridge']),
  slot('climber.actions', 'climber', 4096, 4096, 'spritesheet', true, { x: 0.5, y: 0.88 }, 'subject', 0.38, ['idle', 'hike', 'climb', 'inspect', 'wait', 'rest', 'celebrate']),
  slot('scene.basecamp', 'basecamp', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.32, ['arrival', 'active', 'night']),
  slot('scene.camp', 'camp', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.32, ['unsecured', 'secured', 'resting']),
  slot('scene.normal_route', 'normal_route', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.3, ['trail', 'snow_track', 'fixed_rope']),
  slot('effect.fog', 'fog', 2048, 2048, 'png', true, { x: 0.5, y: 0.5 }, 'atmosphere', 0.12, ['wisps', 'bank', 'whiteout', 'reveal'], 'screen'),
  slot('scene.crevasse', 'crevasse_blocker', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.34, ['approach', 'open', 'blocked']),
  slot('scene.route_fork', 'route_fork', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.34, ['left_safe', 'right_risky', 'decision']),
  slot('scene.secured_crossing', 'secured_crossing', 3072, 1728, 'webp', true, { x: 0.5, y: 1 }, 'subject', 0.34, ['rope', 'ladder', 'bridge']),
  slot('scene.new_ridge', 'new_ridge', 4096, 2304, 'webp', true, { x: 0.5, y: 1 }, 'background', 0.18, ['concealed', 'emerging', 'revealed']),
  slot('scene.final_approach', 'final_approach', 4096, 2304, 'webp', true, { x: 0.5, y: 1 }, 'midground', 0.24, ['clear', 'wind', 'whiteout']),
  slot('scene.summit', 'summit', 4096, 2304, 'webp', true, { x: 0.5, y: 1 }, 'midground', 0.24, ['dormant', 'verified', 'celebration']),
  slot('effect.weather', 'weather_overlay', 2048, 2048, 'png', true, { x: 0.5, y: 0.5 }, 'atmosphere', 0.62, ['snow_near', 'snow_far', 'wind', 'ice', 'sun_rays'], 'screen'),
  slot('ui.scenario_card_art', 'scenario_card', 1600, 960, 'webp', false, { x: 0.5, y: 0.5 }, 'hud', 0, ['camp', 'blocker', 'decision', 'discovery', 'summit']),
] as const satisfies readonly AscendAssetSlot[]

export function createEmptyProductionManifest(version = '1.0.0'): AscendProductionAssetManifest {
  return {
    id: 'ascend-alpine-production',
    version,
    colorSpace: 'srgb',
    alphaMode: 'straight',
    referenceViewport: { width: 3840, height: 2160 },
    slots: ASCEND_PRODUCTION_ASSET_SLOTS,
    files: {},
  }
}
