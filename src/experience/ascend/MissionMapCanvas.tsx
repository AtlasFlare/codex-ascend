import { useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { HumanDecision, MissionState } from '../../domain/types'
import type { MissionMapSceneInstruction } from './missionMapSceneGrammar'
import type { MountainTopology, TopologyPoint } from './topology'
import { ClimberController, type ClimberState } from './ClimberController'

interface MissionMapCanvasProps {
  state: MissionState
  topology: MountainTopology
  instructions: MissionMapSceneInstruction[]
  selectedEntityId?: string
  onSelectEntity: (entityId: string) => void
  onChoosePath: (decisionId: string, optionId: string) => void
}

interface CameraState {
  scale: number
  x: number
  y: number
}

const WIDTH = 1200
const HEIGHT = 720
const rendererDestroyOptions = { removeView: true, releaseGlobalResources: false } as const
const sceneDestroyOptions = { children: true, texture: false, textureSource: false } as const
const xy = (point: TopologyPoint) => ({ x: point.x * WIDTH, y: point.y * HEIGHT })

function makeText(text: string, size: number, color = '#eaf8ff', weight: '400' | '600' = '600') {
  return new Text({
    text,
    style: {
      fontFamily: 'Inter, ui-sans-serif, system-ui',
      fontSize: size,
      fill: color,
      fontWeight: weight,
      dropShadow: { color: '#031422', alpha: 0.72, blur: 4, distance: 1 },
    },
  })
}

function drawTent(parent: Container, point: TopologyPoint, completed: boolean, active: boolean) {
  const { x, y } = xy(point)
  const tent = new Graphics()
    .moveTo(x - 14, y + 7)
    .lineTo(x, y - 12)
    .lineTo(x + 16, y + 7)
    .closePath()
    .fill({ color: completed ? 0xff6a3d : 0xdcebf1, alpha: active ? 1 : 0.88 })
    .moveTo(x, y - 12)
    .lineTo(x + 2, y + 7)
    .stroke({ color: 0x15354b, width: 1.5, alpha: 0.55 })
  if (completed) {
    tent.moveTo(x + 3, y - 12).lineTo(x + 3, y - 32).stroke({ color: 0xf4fbff, width: 1.5 })
    tent.moveTo(x + 4, y - 31).lineTo(x + 17, y - 26).lineTo(x + 4, y - 22).closePath().fill({ color: 0xff4b25 })
  }
  parent.addChild(tent)
}

function drawInstruction(parent: Container, instruction: MissionMapSceneInstruction, selected: boolean) {
  const { x, y } = xy(instruction.position)
  const graphic = new Graphics()
  switch (instruction.archetype) {
    case 'BASECAMP':
      drawTent(parent, instruction.position, true, false)
      break
    case 'CAMP':
    case 'ANCHOR':
    case 'FINAL_APPROACH':
      break
    case 'FOG':
      for (let index = 0; index < 6; index += 1) {
        graphic.circle(x - 35 + index * 14, y + ((index % 2) * 8 - 4), 26 + (index % 3) * 7).fill({ color: 0xd9edf4, alpha: 0.14 })
      }
      break
    case 'CREVASSE':
      graphic
        .moveTo(x - 45, y - 12)
        .lineTo(x - 23, y + 4)
        .lineTo(x - 8, y - 1)
        .lineTo(x + 8, y + 17)
        .lineTo(x + 25, y + 4)
        .lineTo(x + 46, y + 13)
        .stroke({ color: 0x06101c, width: 14, alpha: 0.92 })
        .stroke({ color: 0x63bfd9, width: 2, alpha: 0.76 })
      break
    case 'CLIFF':
      graphic.rect(x - 22, y - 28, 44, 56).fill({ color: 0x6b8090, alpha: 0.8 })
      break
    case 'PASS':
      graphic.arc(x, y, 32, Math.PI, Math.PI * 2).stroke({ color: 0xffa45f, width: 4, alpha: 0.9 })
      break
    case 'STORM':
      graphic.circle(x, y, 44).fill({ color: 0x182a4a, alpha: 0.5 })
      graphic.moveTo(x - 8, y - 12).lineTo(x + 5, y - 12).lineTo(x - 4, y + 3).lineTo(x + 8, y + 3).lineTo(x - 9, y + 25).stroke({ color: 0xffd56a, width: 4 })
      break
    case 'ROUTE_FORK':
      graphic
        .circle(x, y, selected ? 29 : 23)
        .fill({ color: 0xff542b, alpha: 0.18 })
        .circle(x, y, 7)
        .fill({ color: 0xff6a3d })
        .moveTo(x, y)
        .lineTo(x - 25, y - 33)
        .moveTo(x, y)
        .lineTo(x + 31, y - 30)
        .stroke({ color: 0xffa27d, width: 4 })
      break
    case 'NEW_RIDGE':
      graphic.moveTo(x - 52, y + 24).lineTo(x, y - 35).lineTo(x + 62, y + 19).stroke({ color: 0xffc08e, width: 5, alpha: 0.72 })
      break
    case 'INVALID_ROUTE':
      graphic.moveTo(x - 18, y - 18).lineTo(x + 18, y + 18).moveTo(x + 18, y - 18).lineTo(x - 18, y + 18).stroke({ color: 0xff4b42, width: 5 })
      break
    case 'SUMMIT':
      graphic
        .moveTo(x, y + 16)
        .lineTo(x, y - 35)
        .stroke({ color: 0xf7fcff, width: 2.5 })
        .moveTo(x + 2, y - 34)
        .lineTo(x + 31, y - 24)
        .lineTo(x + 2, y - 12)
        .closePath()
        .fill({ color: 0xff512c })
      break
    case 'ASCENT':
      break
  }
  if (selected) graphic.circle(x, y, 34).stroke({ color: 0xffe2d4, width: 2, alpha: 0.85 })
  if (graphic.context.instructions.length > 0) parent.addChild(graphic)
}

function findPendingDecision(state: MissionState): HumanDecision | undefined {
  return Object.values(state.decisions).find((decision) => !decision.resolvedAt)
}

function climberState(state: MissionState): ClimberState {
  if (state.mission.status === 'completed') return 'celebrating'
  if (state.mission.status === 'awaiting_human') return 'waiting'
  if (state.mission.status === 'blocked') return 'inspecting'
  const active = state.stages[state.mission.activeStageId ?? '']
  if (active?.status === 'completed') return 'resting'
  return active?.status === 'active' ? 'climbing' : 'idle'
}

/** Optional zoomed-out diagnostic view; never the production expedition renderer. */
export function MissionMapCanvas({
  state,
  topology,
  instructions,
  selectedEntityId,
  onSelectEntity,
  onChoosePath,
}: MissionMapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [rendererReady, setRendererReady] = useState(0)
  const appRef = useRef<Application | null>(null)
  const worldRef = useRef<Container | null>(null)
  const climberRef = useRef<ClimberController | null>(null)
  const climberContainerRef = useRef<Container | null>(null)
  const cameraRef = useRef<CameraState>({ scale: 1, x: 0, y: 0 })
  const callbackRef = useRef({ onSelectEntity, onChoosePath })

  useEffect(() => {
    callbackRef.current = { onSelectEntity, onChoosePath }
  }, [onChoosePath, onSelectEntity])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const app = new Application()
    let disposed = false
    let initialized = false
    const setup = async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        preference: 'webgl',
        resizeTo: host,
        resolution: Math.min(2, window.devicePixelRatio),
      })
      initialized = true
      if (disposed) {
        app.destroy(rendererDestroyOptions, sceneDestroyOptions)
        return
      }
      host.appendChild(app.canvas)
      app.canvas.setAttribute('aria-label', 'Interactive mission mountain. Semantic controls are mirrored below the canvas.')
      const world = new Container()
      app.stage.addChild(world)
      appRef.current = app
      worldRef.current = world
      setRendererReady((value) => value + 1)

      let dragging = false
      let previousX = 0
      let previousY = 0
      app.canvas.addEventListener('pointerdown', (event) => {
        dragging = true
        previousX = event.clientX
        previousY = event.clientY
        app.canvas.setPointerCapture(event.pointerId)
      })
      app.canvas.addEventListener('pointermove', (event) => {
        if (!dragging) return
        cameraRef.current.x += event.clientX - previousX
        cameraRef.current.y += event.clientY - previousY
        previousX = event.clientX
        previousY = event.clientY
      })
      app.canvas.addEventListener('pointerup', () => {
        dragging = false
      })
      app.canvas.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault()
          cameraRef.current.scale = Math.min(1.7, Math.max(0.88, cameraRef.current.scale - event.deltaY * 0.0008))
        },
        { passive: false },
      )
      app.ticker.add((ticker) => {
        const camera = cameraRef.current
        world.scale.set((app.screen.width / WIDTH) * camera.scale, (app.screen.height / HEIGHT) * camera.scale)
        world.position.set(camera.x, camera.y)
        if (climberRef.current && climberContainerRef.current) {
          climberRef.current.update(ticker.deltaMS / 1000, climberContainerRef.current, WIDTH, HEIGHT, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          window.__ASCEND_RENDER_STATS__ = {
            children: world.children.length,
            width: app.screen.width,
            height: app.screen.height,
            climberX: climberContainerRef.current.position.x,
            climberY: climberContainerRef.current.position.y,
          }
        }
      })
      app.start()
    }
    void setup()
    return () => {
      disposed = true
      appRef.current = null
      worldRef.current = null
      if (initialized) app.destroy(rendererDestroyOptions, sceneDestroyOptions)
    }
  }, [])

  useEffect(() => {
    const world = worldRef.current
    const app = appRef.current
    window.__ASCEND_RENDER_STATS__ = { children: world?.children.length ?? -1, width: app?.screen.width ?? -1, height: app?.screen.height ?? -1 }
    if (!world || !app) return
    world.removeChildren().forEach((child) => child.destroy({ children: true }))

    const skyHalo = new Graphics().circle(WIDTH * 0.72, HEIGHT * 0.12, 220).fill({ color: 0xe4faff, alpha: 0.08 })
    world.addChild(skyHalo)

    const distant = new Graphics()
      .moveTo(0, HEIGHT * 0.76)
      .lineTo(WIDTH * 0.18, HEIGHT * 0.39)
      .lineTo(WIDTH * 0.32, HEIGHT * 0.72)
      .lineTo(WIDTH * 0.49, HEIGHT * 0.31)
      .lineTo(WIDTH * 0.66, HEIGHT * 0.74)
      .lineTo(WIDTH * 0.84, HEIGHT * 0.42)
      .lineTo(WIDTH, HEIGHT * 0.72)
      .lineTo(WIDTH, HEIGHT)
      .lineTo(0, HEIGHT)
      .closePath()
      .fill({ color: 0x2a5872, alpha: 0.34 })
    world.addChild(distant)

    const mountain = new Graphics()
      .moveTo(WIDTH * 0.02, HEIGHT * 0.91)
      .lineTo(WIDTH * 0.18, HEIGHT * 0.76)
      .lineTo(WIDTH * 0.31, HEIGHT * 0.58)
      .lineTo(WIDTH * 0.46, HEIGHT * 0.51)
      .lineTo(WIDTH * 0.62, HEIGHT * 0.27)
      .lineTo(WIDTH * 0.77, HEIGHT * 0.11)
      .lineTo(WIDTH * 0.94, HEIGHT * 0.82)
      .lineTo(WIDTH, HEIGHT)
      .lineTo(0, HEIGHT)
      .closePath()
      .fill({ color: 0x29495b, alpha: 0.98 })
      .moveTo(WIDTH * 0.77, HEIGHT * 0.11)
      .lineTo(WIDTH * 0.62, HEIGHT * 0.27)
      .lineTo(WIDTH * 0.68, HEIGHT * 0.34)
      .lineTo(WIDTH * 0.75, HEIGHT * 0.29)
      .lineTo(WIDTH * 0.81, HEIGHT * 0.39)
      .lineTo(WIDTH * 0.88, HEIGHT * 0.33)
      .closePath()
      .fill({ color: 0xeef8f8, alpha: 0.9 })
      .moveTo(WIDTH * 0.46, HEIGHT * 0.51)
      .lineTo(WIDTH * 0.62, HEIGHT * 0.27)
      .lineTo(WIDTH * 0.58, HEIGHT * 0.54)
      .lineTo(WIDTH * 0.52, HEIGHT * 0.61)
      .closePath()
      .fill({ color: 0x527487, alpha: 0.8 })
    world.addChild(mountain)

    const pendingDecision = findPendingDecision(state)
    topology.routes.forEach((route) => {
      if (route.hidden) return
      const points = route.points.map(xy)
      const chosenOption = pendingDecision?.options.find((option) => option.pathId === route.id)
      const routeGraphic = new Graphics()
        .moveTo(points[0].x, points[0].y)
        .quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y)
        .stroke({
          color: route.blocked ? 0xff655a : route.path.selected ? 0xff855c : 0xc9e2e9,
          width: chosenOption ? 8 : route.path.selected ? 5 : 3,
          alpha: route.path.status === 'abandoned' ? 0.24 : 0.9,
        })
      routeGraphic.eventMode = 'static'
      routeGraphic.cursor = chosenOption ? 'pointer' : 'default'
      routeGraphic.on('pointertap', () => {
        if (pendingDecision && chosenOption) callbackRef.current.onChoosePath(pendingDecision.id, chosenOption.id)
        else callbackRef.current.onSelectEntity(route.id)
      })
      world.addChild(routeGraphic)
    })

    topology.nodes.forEach((node) => {
      const point = xy(node)
      const hotspot = new Graphics().circle(point.x, point.y, 30).fill({ color: 0xffffff, alpha: 0.001 })
      hotspot.eventMode = 'static'
      hotspot.cursor = 'pointer'
      hotspot.on('pointertap', () => callbackRef.current.onSelectEntity(node.id))
      world.addChild(hotspot)
      if (!node.hidden && node.stage.kind !== 'origin' && node.stage.kind !== 'completion') {
        drawTent(world, node, node.stage.status === 'completed', node.stage.status === 'active')
      }
      if (!node.hidden) {
        const label = makeText(node.stage.title.replace(/ · /g, '\n'), 14, node.stage.status === 'active' ? '#fff0e8' : '#eaf8ff')
        label.anchor.set(0.5, 1)
        label.position.set(point.x, point.y - 34)
        world.addChild(label)
      }
    })

    instructions.forEach((instruction) => drawInstruction(world, instruction, selectedEntityId === instruction.entityId))

    const activeNode = topology.nodes.find((node) => node.id === state.mission.activeStageId) ?? topology.nodes[0]
    if (activeNode) {
      const climber = new Container()
      const body = new Graphics().circle(0, -12, 5).fill({ color: 0xffaa74 }).roundRect(-5, -7, 10, 18, 4).fill({ color: 0xff512c })
      body.moveTo(-3, 10).lineTo(-8, 20).moveTo(3, 10).lineTo(9, 19).stroke({ color: 0x142536, width: 3 })
      climber.addChild(body)
      world.addChild(climber)
      if (!climberRef.current) climberRef.current = new ClimberController({ x: activeNode.x, y: activeNode.y })
      climberRef.current.setTarget(activeNode, climberState(state))
      climberContainerRef.current = climber
    }

    for (let index = 0; index < 34; index += 1) {
      const x = ((index * 191 + topology.seed) % WIDTH + WIDTH) % WIDTH
      const y = ((index * 83 + topology.seed) % HEIGHT + HEIGHT) % HEIGHT
      const snow = new Graphics().circle(x, y, index % 3 === 0 ? 2 : 1).fill({ color: 0xffffff, alpha: 0.34 })
      world.addChild(snow)
    }

    window.__ASCEND_RENDER_STATS__ = { children: world.children.length, width: app.screen.width, height: app.screen.height }

    if (import.meta.env.DEV) {
      window.setTimeout(() => {
        const captureCanvas = app.renderer.extract.canvas(world)
        if (typeof captureCanvas.toDataURL === 'function') window.__ASCEND_SCENE_CAPTURE__ = captureCanvas.toDataURL('image/png')
      }, 1400)
    }
  }, [instructions, rendererReady, selectedEntityId, state, topology])

  return <div className="mountain-canvas" data-renderer-ready={rendererReady} ref={hostRef} />
}
