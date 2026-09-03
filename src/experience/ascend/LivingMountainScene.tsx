import { useEffect, useRef, type CSSProperties } from 'react'
import { Application, Assets, Container, Graphics, Sprite, type Ticker } from 'pixi.js'
import type { GeneratedSceneSource } from './productionRenderer'
import { resolveAscendSceneOverscan } from './sceneProjection'
import type { ExpeditionCameraPreset } from './sceneSelection'

interface LivingMountainSceneProps {
  source: GeneratedSceneSource
  mobileBackdropUrl: string
  reducedMotion: boolean
  label: string
  focus?: { x: number; y: number }
  camera: ExpeditionCameraPreset
}

interface LayerRuntime {
  container: Container
  parallax: number
}

interface MaskRuntime {
  sprite: Sprite
  graphics: Graphics
  source: NonNullable<GeneratedSceneSource['layers'][number]['mask']>
}

interface SceneBackdropStyle extends CSSProperties {
  '--scene-backdrop-image': string
  '--scene-mobile-backdrop-image': string
}

const fitContainedStage = (sprite: Sprite, width: number, height: number) => {
  const textureWidth = Math.max(1, sprite.texture.width)
  const textureHeight = Math.max(1, sprite.texture.height)
  const overscan = resolveAscendSceneOverscan(
    { width: textureWidth, height: textureHeight },
    { width, height },
  )
  const scale = Math.min(width / textureWidth, height / textureHeight) * overscan
  sprite.scale.set(scale)
  sprite.position.set(width / 2, height / 2)
  sprite.anchor.set(0.5)
}

const cameraProfiles: Record<ExpeditionCameraPreset, { zoom: number; focus: number; lift: number }> = {
  overview_establishing: { zoom: 1.025, focus: 0.055, lift: 0 },
  overview_active: { zoom: 1.065, focus: 0.082, lift: -0.006 },
  overview_hazard: { zoom: 1.09, focus: 0.11, lift: -0.008 },
  overview_decision: { zoom: 1.075, focus: 0.095, lift: -0.004 },
  overview_reveal: { zoom: 1.045, focus: 0.07, lift: -0.012 },
  overview_summit: { zoom: 1.07, focus: 0.085, lift: 0.018 },
}

const rendererDestroyOptions = { removeView: true, releaseGlobalResources: false } as const
const sceneDestroyOptions = { children: true, texture: false, textureSource: false } as const

export function LivingMountainScene({ source, mobileBackdropUrl, reducedMotion, label, focus, camera }: LivingMountainSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef(focus)
  const cameraRef = useRef(camera)

  useEffect(() => {
    focusRef.current = focus
    cameraRef.current = camera
  }, [camera, focus])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.replaceChildren()
    let cancelled = false
    let resizeObserver: ResizeObserver | undefined
    let cleanup = () => undefined

    void (async () => {
      const app = new Application()
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2.5),
        preference: 'webgl',
      })
      if (cancelled) {
        app.canvas.remove()
        app.destroy(rendererDestroyOptions)
        return
      }
      app.canvas.className = 'living-mountain-canvas'
      host.appendChild(app.canvas)

      const layers: LayerRuntime[] = []
      const sprites: Sprite[] = []
      const masks: MaskRuntime[] = []
      for (const layer of source.layers) {
        const texture = await Assets.load(layer.url)
        if (cancelled) break
        const container = new Container()
        const sprite = new Sprite(texture)
        fitContainedStage(sprite, app.screen.width, app.screen.height)
        container.addChild(sprite)
        if (layer.mask?.kind === 'ellipse') {
          const graphics = new Graphics()
          container.addChild(graphics)
          sprite.mask = graphics
          masks.push({ sprite, graphics, source: layer.mask })
        }
        app.stage.addChild(container)
        layers.push({ container, parallax: layer.parallax })
        sprites.push(sprite)
      }
      if (cancelled) {
        app.canvas.remove()
        app.destroy(rendererDestroyOptions, sceneDestroyOptions)
        return
      }

      const weatherLayer = new Container()
      const particles = Array.from({ length: 34 }, (_, index) => {
        const particle = new Graphics().circle(0, 0, index % 4 === 0 ? 1.6 : 0.9).fill({ color: 0xffffff, alpha: 0.28 + (index % 5) * 0.06 })
        particle.position.set((index * 137) % Math.max(1, app.screen.width), (index * 73) % Math.max(1, app.screen.height))
        weatherLayer.addChild(particle)
        return particle
      })
      app.stage.addChild(weatherLayer)

      const pointer = { x: 0, y: 0 }
      const target = { x: 0, y: 0 }
      const onPointerMove = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect()
        target.x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2
        target.y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2
      }
      const onPointerLeave = () => { target.x = 0; target.y = 0 }
      host.addEventListener('pointermove', onPointerMove, { passive: true })
      host.addEventListener('pointerleave', onPointerLeave, { passive: true })

      let elapsed = 0
      const cameraState = { x: 0, y: 0, zoom: 1, rotation: 0 }
      const tick = (ticker: Ticker) => {
        const deltaSeconds = ticker.deltaMS / 1000
        elapsed += deltaSeconds
        const idleX = reducedMotion ? 0 : Math.sin(elapsed * 0.12) * 0.12
        const idleY = reducedMotion ? 0 : Math.cos(elapsed * 0.09) * 0.08
        const response = Math.min(1, deltaSeconds * 4)
        pointer.x += ((reducedMotion ? 0 : target.x + idleX) - pointer.x) * response
        pointer.y += ((reducedMotion ? 0 : target.y + idleY) - pointer.y) * response

        const profile = cameraProfiles[cameraRef.current]
        const focal = focusRef.current ?? { x: 0.55, y: 0.52 }
        // Structural terrain stays registered to the DOM waypoint plane. Keep
        // only a sub-pixel cinematic drift here; the DOM cloud field and this
        // light weather layer provide movement without detaching the route.
        const targetCameraX = (0.5 - focal.x) * profile.focus * 12
        const targetCameraY = ((0.5 - focal.y) * profile.focus + profile.lift) * 10
        const targetCameraZoom = 1 + (profile.zoom - 1) * 0.035
        const cameraResponse = Math.min(1, deltaSeconds * (reducedMotion ? 12 : 1.35))
        cameraState.x += (targetCameraX - cameraState.x) * cameraResponse
        cameraState.y += (targetCameraY - cameraState.y) * cameraResponse
        cameraState.zoom += (targetCameraZoom - cameraState.zoom) * cameraResponse
        cameraState.rotation += ((reducedMotion ? 0 : pointer.x * 0.00015) - cameraState.rotation) * cameraResponse
        for (const layer of layers) {
          layer.container.pivot.set(app.screen.width / 2, app.screen.height / 2)
          layer.container.position.set(
            app.screen.width / 2 + cameraState.x + pointer.x * layer.parallax * 2,
            app.screen.height / 2 + cameraState.y + pointer.y * layer.parallax * 1.5,
          )
          layer.container.scale.set(cameraState.zoom)
          layer.container.rotation = cameraState.rotation * (0.65 + layer.parallax)
        }
        particles.forEach((particle, index) => {
          if (reducedMotion) return
          particle.x -= deltaSeconds * (5 + (index % 4) * 2)
          particle.y += deltaSeconds * (4 + (index % 3))
          if (particle.y > app.screen.height + 4) particle.y = -4
          if (particle.x < -4) particle.x = app.screen.width + 4
        })
      }
      app.ticker.add(tick)

      const redrawMasks = () => {
        masks.forEach(({ sprite, graphics, source: mask }) => {
          const scale = sprite.scale.x
          const imageWidth = sprite.texture.width * scale
          const imageHeight = sprite.texture.height * scale
          graphics.clear()
          graphics
            .ellipse(
              sprite.x + (mask.x - 0.5) * imageWidth,
              sprite.y + (mask.y - 0.5) * imageHeight,
              mask.radiusX * imageWidth,
              mask.radiusY * imageHeight,
            )
            .fill({ color: 0xffffff })
        })
      }
      redrawMasks()

      resizeObserver = new ResizeObserver(() => {
        sprites.forEach((sprite) => fitContainedStage(sprite, app.screen.width, app.screen.height))
        redrawMasks()
      })
      resizeObserver.observe(host)
      cleanup = () => {
        host.removeEventListener('pointermove', onPointerMove)
        host.removeEventListener('pointerleave', onPointerLeave)
        resizeObserver?.disconnect()
        app.ticker.remove(tick)
        masks.forEach(({ sprite, graphics }) => {
          sprite.mask = null
          graphics.filters = []
        })
        app.canvas.remove()
        app.destroy(rendererDestroyOptions, sceneDestroyOptions)
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [reducedMotion, source])

  return (
    <div
      ref={hostRef}
      className="living-mountain-scene"
      role="img"
      aria-label={label}
      style={{
        '--scene-backdrop-image': `url("${source.layers[0]?.url ?? ''}")`,
        '--scene-mobile-backdrop-image': `url("${mobileBackdropUrl}")`,
      } as SceneBackdropStyle}
    />
  )
}
