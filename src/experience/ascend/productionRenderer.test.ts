import { describe, expect, it } from 'vitest'
import { ASCEND_PRODUCTION_MASTER, assessSceneResolution } from './productionRenderer'

describe('Ascend production renderer resolution gate', () => {
  it('keeps the existing 2K master in review status', () => {
    expect(assessSceneResolution({ width: 2048, height: 1152 })).toMatchObject({
      tier: 'review',
      label: '2K review master',
    })
  })

  it('accepts the native 4K generation target as production', () => {
    expect(assessSceneResolution(ASCEND_PRODUCTION_MASTER)).toMatchObject({
      tier: 'production',
      label: '4K master',
    })
  })
})
