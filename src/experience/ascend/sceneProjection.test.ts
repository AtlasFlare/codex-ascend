import { describe, expect, it } from 'vitest'
import { keepScenePointReachable, projectScenePoint, resolveAscendSceneOverscan } from './sceneProjection'

describe('Ascend scene projection', () => {
  it('keeps the artwork center fixed through a centered contained stage', () => {
    expect(projectScenePoint({ x: 0.5, y: 0.5 }, { width: 1672, height: 941 }, { width: 898, height: 734 }))
      .toEqual({ x: 0.5, y: 0.5 })
  })

  it('keeps authored ledges registered while compact views use a controlled crop', () => {
    const landscape = projectScenePoint({ x: 0.68, y: 0.79 }, { width: 1672, height: 941 }, { width: 1440, height: 900 })
    const portrait = projectScenePoint({ x: 0.68, y: 0.79 }, { width: 1672, height: 941 }, { width: 521, height: 696 })
    expect(portrait.x).toBeGreaterThan(landscape.x)
    expect(portrait.y).toBeLessThan(landscape.y)
    expect(portrait.x).toBeGreaterThan(0)
    expect(portrait.x).toBeLessThan(1)
    expect(portrait.y).toBeGreaterThan(0)
    expect(portrait.y).toBeLessThan(1)
  })

  it('only overscans side-panel and portrait viewports', () => {
    const source = { width: 1672, height: 941 }
    expect(resolveAscendSceneOverscan(source, { width: 1440, height: 900 })).toBe(1)
    expect(resolveAscendSceneOverscan(source, { width: 665, height: 711 })).toBeGreaterThan(1.25)
    expect(resolveAscendSceneOverscan(source, { width: 390, height: 844 })).toBe(1.32)
  })

  it('keeps controls reachable at narrow edges', () => {
    expect(keepScenePointReachable({ x: 1.2, y: -0.2 })).toEqual({ x: 0.955, y: 0.05 })
  })
})
