import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { NarratorOutput } from '../../domain/narrator'
import type { MissionState } from '../../domain/types'
import type { GenerationPreparation, GenerationSourceReference, PersistedGeneratedWorld, ProjectHandoff } from '../generation'
import { AscendScenarioCard } from './AscendScenarioCard'
import { getSurveyedPercent } from './elevationProfileTelemetry'
import { BUNDLED_HERO_SCENE_ASSETS, resolveBundledHeroSceneAsset } from './localHeroReviewAssets'
import { resolveBundledScenarioCardAsset } from './localScenarioCardReviewAssets'
import type { MissionMapSceneInstruction } from './missionMapSceneGrammar'
import { assessSceneResolution, type GeneratedSceneSource } from './productionRenderer'
import { createAscendScenarioCard } from './scenarioCards'
import { createAscendRoutePath, reachedRoutePercent, unresolvedRouteCenter } from './routeTrace'
import { keepScenePointReachable, projectScenePoint } from './sceneProjection'
import type { ExpeditionSceneSelection } from './sceneSelection'
import type { MountainTopology } from './topology'
import { createAscendWaypointPlan, type AscendWaypointAnchor } from './waypointProjection'

const REVIEW_PLATE = '/art/ascend/camp-ii-mountain-review-plate-v4.png'
const LivingMountainScene = lazy(() => import('./LivingMountainScene').then((module) => ({ default: module.LivingMountainScene })))
const MissionMapCanvas = lazy(() => import('./MissionMapCanvas').then((module) => ({ default: module.MissionMapCanvas })))

interface TransparentMountainHeroProps {
  state: MissionState
  topology: MountainTopology
  selection: ExpeditionSceneSelection
  instructions: MissionMapSceneInstruction[]
  narration: NarratorOutput
  lastMessage: string
  webMcpStatus: 'checking' | 'native' | 'unsupported' | 'error'
  toolLog: ReadonlyArray<{ name: string; at: string; ok: boolean; summary: string }>
  handoff?: ProjectHandoff
  generation: GenerationPreparation
  generatedWorld?: PersistedGeneratedWorld
  scenarioReviewMode?: boolean
  selectedEntityId?: string
  onSelectEntity: (entityId?: string) => void
  onChoosePath: (decisionId: string, optionId: string) => void
  onNewMission: () => void
  onOpenWebMcpHelp: () => void
}

const pct = (value: number) => `${Math.round(value * 100)}%`

function beaconPosition(anchor: AscendWaypointAnchor) {
  return {
    left: `${anchor.x * 100}%`,
    top: `${anchor.y * 100}%`,
  }
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

const sceneVariantLabel = (kind: ExpeditionSceneSelection['kind']) => {
  if (kind === 'fog') return 'Survey fog'
  if (kind === 'crevasse_blocker') return 'Blocker storm'
  if (kind === 'route_fork') return 'Decision light'
  if (kind === 'summit') return 'Summit reveal'
  return 'Mountain scene'
}

interface FogPositionStyle extends CSSProperties {
  '--route-fog-x': string
  '--route-fog-y': string
}

interface CloudFieldStyle extends CSSProperties {
  '--cloud-field-opacity': string
}

export function TransparentMountainHero({
  state,
  topology,
  selection,
  instructions,
  narration,
  lastMessage,
  webMcpStatus,
  toolLog,
  handoff,
  generation,
  generatedWorld,
  scenarioReviewMode = false,
  selectedEntityId,
  onSelectEntity,
  onChoosePath,
  onNewMission,
  onOpenWebMcpHelp,
}: TransparentMountainHeroProps) {
  const [showMissionMap, setShowMissionMap] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [sceneViewport, setSceneViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const heroRef = useRef<HTMLElement>(null)
  const beaconRefs = useRef(new Map<string, HTMLButtonElement>())
  const autoOpenedDecisionIds = useRef(new Set<string>())
  const autoOpenedReviewStageIds = useRef(new Set<string>())
  const activeStage = state.stages[state.mission.activeStageId ?? '']
  const waypointPlan = useMemo(() => createAscendWaypointPlan(state, topology), [state, topology])
  const routeProgress = useMemo(() => reachedRoutePercent(waypointPlan.anchors), [waypointPlan.anchors])
  const nodeById = useMemo(() => new Map(topology.nodes.map((node) => [node.id, node])), [topology.nodes])
  const openObstacle = Object.values(state.obstacles).find((obstacle) => obstacle.status !== 'resolved')
  const currentNode = topology.nodes.find((node) => node.id === activeStage?.id)
  const altitude = currentNode?.altitude ?? topology.securedAltitude
  const surveyedPercent = getSurveyedPercent(topology, state.mission.discoveryPercent)
  const cloudFieldOpacity = Math.max(0.22, Math.min(0.5, 0.52 - surveyedPercent * 0.003))
  const recentToolCalls = toolLog.slice(-2).reverse()
  const latestToolCall = recentToolCalls[0]
  const activityCopy = webMcpStatus === 'native'
    ? 'Agent tool surface ready. The next real call will appear here.'
    : webMcpStatus === 'checking'
      ? 'Checking this browser for the native agent tool surface.'
      : webMcpStatus === 'unsupported'
        ? 'Open in a WebMCP-capable browser to expose mission tools.'
        : 'The agent tool surface needs attention before the next call.'
  const bundledSceneAsset = resolveBundledHeroSceneAsset(selection.kind)
  const focusRelevant = ['normal_route', 'camp'].includes(selection.kind)
  const generatedAsset = focusRelevant && generatedWorld?.activeScene?.sceneType === 'camp_ii_active'
    ? generatedWorld.activeScene
    : generatedWorld?.canonicalMaster
  const sceneSource = useMemo<GeneratedSceneSource>(() => {
    if (bundledSceneAsset) {
      return {
        generationId: bundledSceneAsset.generationId,
        flattened: true,
        width: bundledSceneAsset.width,
        height: bundledSceneAsset.height,
        quality: 'review',
        layers: [{ id: selection.kind, url: bundledSceneAsset.assetUrl, depthBand: 'midground', parallax: 0.12 }],
      }
    }
    const canonical = generatedWorld?.canonicalMaster
    const derivative = generatedAsset?.sceneType === 'camp_ii_active' ? generatedAsset : undefined
    const acceptedCanonical = canonical?.status === 'accepted' && canonical.assetUrl
    const acceptedDerivative = derivative?.status === 'accepted' && derivative.assetUrl && derivative.composition
    if (acceptedCanonical && acceptedDerivative) {
      return {
        generationId: derivative.generationId,
        flattened: false,
        width: canonical.width,
        height: canonical.height,
        quality: derivative.quality,
        layers: [
          { id: 'canonical-master', url: canonical.assetUrl!, depthBand: 'midground', parallax: 0.16 },
          {
            id: 'camp-ii-edit',
            url: derivative.assetUrl!,
            depthBand: 'subject',
            parallax: 0.16,
            mask: derivative.composition!.mask,
          },
        ],
      }
    }
    return {
      generationId: generatedAsset?.generationId,
      flattened: true,
      width: generatedAsset?.width ?? 1672,
      height: generatedAsset?.height ?? 941,
      quality: generatedAsset?.quality ?? 'review',
      layers: [{
        id: generatedAsset?.sceneType ?? 'review-plate',
        url: generatedAsset?.status === 'accepted' && generatedAsset.assetUrl ? generatedAsset.assetUrl : REVIEW_PLATE,
        depthBand: 'midground',
        parallax: generatedAsset ? 0.16 : 0.1,
      }],
    }
  }, [bundledSceneAsset, generatedAsset, generatedWorld?.canonicalMaster, selection.kind])
  const resolution = useMemo(() => assessSceneResolution(sceneSource), [sceneSource])
  const projectedAnchors = useMemo(() => waypointPlan.anchors.map((anchor) => ({
    ...anchor,
    ...keepScenePointReachable(projectScenePoint(anchor, {
      width: sceneSource.width,
      height: sceneSource.height,
    }, sceneViewport)),
  })), [sceneSource.height, sceneSource.width, sceneViewport, waypointPlan.anchors])
  const projectedRoutePath = useMemo(() => createAscendRoutePath(projectedAnchors), [projectedAnchors])
  const projectedUnresolvedCenter = useMemo(() => unresolvedRouteCenter(projectedAnchors), [projectedAnchors])
  const masterReference = useMemo<GenerationSourceReference>(() => {
    const canonical = generatedWorld?.canonicalMaster
    if (canonical?.status === 'accepted' && canonical.assetUrl) {
      return {
        generationId: canonical.generationId,
        assetUrl: canonical.assetUrl,
        width: canonical.width,
        height: canonical.height,
      }
    }
    return {
      generationId: sceneSource.generationId ?? 'review-plate',
      assetUrl: sceneSource.layers[0].url,
      width: sceneSource.width,
      height: sceneSource.height,
    }
  }, [generatedWorld?.canonicalMaster, sceneSource])
  const scenarioCards = useMemo(() => new Map(waypointPlan.anchors.flatMap((anchor) => {
    const node = nodeById.get(anchor.entityId)
    if (!node) return []
    const card = createAscendScenarioCard({ state, node, anchor, master: masterReference })
    const generatedCard = card.kind === 'camp' || card.kind === 'blocker' || card.kind === 'decision'
      ? generatedWorld?.scenarioCards?.[card.kind]
      : undefined
    if (generatedCard?.status === 'accepted' && generatedCard.assetUrl && generatedCard.focalEntityId === node.id) {
      card.sourceReference = {
        generationId: generatedCard.generationId,
        assetUrl: generatedCard.assetUrl,
        width: generatedCard.width,
        height: generatedCard.height,
        focalEntityId: node.id,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }
    } else {
      const localAsset = resolveBundledScenarioCardAsset(node.id, card.kind)
      if (!localAsset) return [[anchor.entityId, card] as const]
      card.sourceReference = {
        ...localAsset,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }
    }
    return [[anchor.entityId, card] as const]
  })), [generatedWorld?.scenarioCards, masterReference, nodeById, state, waypointPlan.anchors])
  const focusAnchor = waypointPlan.anchors.find((anchor) => anchor.entityId === selectedEntityId)
    ?? waypointPlan.anchors.find((anchor) => anchor.state === 'current')
  const pendingDecision = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
  const closeScenarioCard = useCallback(() => {
    const closingId = selectedEntityId
    onSelectEntity(undefined)
    if (closingId) window.requestAnimationFrame(() => beaconRefs.current.get(closingId)?.focus({ preventScroll: true }))
  }, [onSelectEntity, selectedEntityId])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useLayoutEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const update = () => {
      const bounds = hero.getBoundingClientRect()
      setSceneViewport((current) => current.width === bounds.width && current.height === bounds.height
        ? current
        : { width: bounds.width, height: bounds.height })
    }
    const observer = new ResizeObserver(update)
    observer.observe(hero)
    update()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!selectedEntityId) return
    const hero = heroRef.current
    if (!hero) return
    const pinCamera = () => {
      const heroDocumentTop = window.scrollY + hero.getBoundingClientRect().top
      if (Math.abs(window.scrollY - heroDocumentTop) > 1) {
        window.scrollTo({ top: heroDocumentTop, left: window.scrollX, behavior: 'instant' })
      }
    }
    pinCamera()
    let settleFrame = 0
    const frame = window.requestAnimationFrame(() => {
      pinCamera()
      settleFrame = window.requestAnimationFrame(pinCamera)
    })
    const settleTimer = window.setTimeout(pinCamera, 80)
    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(settleFrame)
      window.clearTimeout(settleTimer)
    }
  }, [selectedEntityId])

  useEffect(() => {
    if (!selectedEntityId) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeScenarioCard()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closeScenarioCard, selectedEntityId])

  useEffect(() => {
    if (!pendingDecision || autoOpenedDecisionIds.current.has(pendingDecision.id)) return
    autoOpenedDecisionIds.current.add(pendingDecision.id)
    onSelectEntity(pendingDecision.stageId)
  }, [onSelectEntity, pendingDecision])

  useEffect(() => {
    const stageId = activeStage?.id
    if (!scenarioReviewMode || !stageId || pendingDecision || autoOpenedReviewStageIds.current.has(stageId)) return
    autoOpenedReviewStageIds.current.add(stageId)
    onSelectEntity(stageId)
  }, [activeStage?.id, onSelectEntity, pendingDecision, scenarioReviewMode])

  return (
    <section
      id="mission-hero"
      ref={heroRef}
      className={`hero-world production-hero${selectedEntityId ? ' has-open-scenario' : ''}`}
      aria-labelledby="mission-world-title"
      data-renderer-role="ascend-review-plate"
      data-production-scene={selection.kind}
      data-generation-id={sceneSource.generationId ?? 'review-plate'}
      data-resolution-tier={resolution.tier}
    >
      <Suspense fallback={<div className="scene-loading" aria-label="Loading expedition scene" />}>
        <LivingMountainScene
          source={sceneSource}
          mobileBackdropUrl={bundledSceneAsset?.assetUrl ?? BUNDLED_HERO_SCENE_ASSETS.mobileClear.assetUrl}
          reducedMotion={reducedMotion}
          focus={focusAnchor}
          camera={selection.camera}
          label="Illustrated Codex Ascend expedition mountain with live mission waypoints"
        />
      </Suspense>
      <div
        className={`moving-cloud-field${reducedMotion ? ' is-static' : ''}`}
        style={{ '--cloud-field-opacity': cloudFieldOpacity.toFixed(3) } as CloudFieldStyle}
        data-cloud-motion={reducedMotion ? 'static' : 'drifting'}
        aria-hidden="true"
      >
        <i className="moving-cloud-bank cloud-bank-high" />
        <i className="moving-cloud-bank cloud-bank-mid" />
        <i className="moving-cloud-bank cloud-bank-low" />
        {projectedUnresolvedCenter && (
          <i
            className="route-cloud-focus"
            style={{
              '--route-fog-x': `${projectedUnresolvedCenter.x * 100}%`,
              '--route-fog-y': `${projectedUnresolvedCenter.y * 100}%`,
            } as FogPositionStyle}
          />
        )}
      </div>
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="hero-tilt-shift" aria-hidden="true" />
      <div className="hero-cartography" aria-hidden="true" />

      <svg className="mountain-route-trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="route-trace-future" d={projectedRoutePath} pathLength="100" />
        <path
          className="route-trace-reached"
          d={projectedRoutePath}
          pathLength="100"
          strokeDasharray={`${routeProgress} ${100 - routeProgress}`}
        />
      </svg>
      <div className="glass-cluster brand-cluster">
        <span className="brand-mark">△</span>
        <span className="brand-copy">CODEX <strong>ASCEND</strong></span>
        <button type="button" className="quiet-action" onClick={onNewMission}>New</button>
      </div>

      <div className="glass-cluster scene-chip" aria-live="polite">
        <i />
        <span>{activeStage?.title ?? 'Basecamp'}</span>
        <em>{statusLabel(activeStage?.status ?? state.mission.status)}</em>
      </div>

      <p className="glass-cluster waypoint-guide"><strong>Mission checkpoints</strong><span>Select a beacon to inspect its scenario. Route decisions resolve inside the card.</span></p>

      <dl className="glass-cluster hero-metrics">
        <div><dt>Altitude</dt><dd>{altitude.toLocaleString()} m</dd></div>
        <div><dt>Progress</dt><dd>{pct(state.mission.progressEstimate)}</dd></div>
        {state.mission.status === 'completed'
          ? <div><dt>Evidence</dt><dd>Verified</dd></div>
          : <div><dt>Confidence</dt><dd>{pct(state.mission.overallConfidence)}</dd></div>}
      </dl>

      <aside
        className={`webmcp-activity-rail activity-${latestToolCall ? latestToolCall.ok ? 'ok' : 'error' : webMcpStatus}`}
        aria-label="Live WebMCP activity"
        aria-live="polite"
        data-tool-state={latestToolCall ? latestToolCall.ok ? 'ok' : 'error' : webMcpStatus}
        data-latest-tool={latestToolCall?.name ?? 'none'}
      >
        <header>
          <span><i />WEBMCP LIVE</span>
          <b>MISSION R{state.revision}</b>
        </header>
        {recentToolCalls.length > 0 ? (
          <ol>
            {recentToolCalls.map((call, index) => (
              <li key={`${call.at}:${call.name}`} className={call.ok ? 'is-ok' : 'is-error'}>
                <span>{index === 0 ? 'Latest agent call' : 'Previous call'}</span>
                <strong>{call.name}</strong>
                <p>{call.summary}</p>
                <em>{call.ok ? 'State synchronized' : 'Call rejected safely'}</em>
              </li>
            ))}
          </ol>
        ) : (
          <div className="activity-empty">
            <span>Native agent interface</span>
            <strong>{webMcpStatus === 'native' ? 'Ready for a live call' : `WebMCP ${webMcpStatus}`}</strong>
            <p>{activityCopy}</p>
            {webMcpStatus !== 'native' && <button type="button" className="connection-guide-link" onClick={onOpenWebMcpHelp}>Connection guide →</button>}
          </div>
        )}
      </aside>

      <div className={`position-beacons${selectedEntityId ? ' has-open-card' : ''}`} aria-label="Mission positions">
        {projectedAnchors.map((anchor) => {
          const node = nodeById.get(anchor.entityId)
          if (!node) return null
          const active = anchor.state === 'current'
          const selected = anchor.entityId === selectedEntityId
          const secured = anchor.state === 'secured'
          const blocked = anchor.state === 'blocked'
          const card = scenarioCards.get(anchor.entityId)
          if (!card) return null
          const waypointTitle = node.hidden ? 'Unsurveyed terrain' : node.stage.title
          const waypointStatus = node.hidden ? 'locked' : statusLabel(node.stage.status)
          return (
            <div
              key={anchor.entityId}
              className={`waypoint-marker${active ? ' is-active' : ''}${secured ? ' is-secured' : ''}${blocked ? ' is-blocked' : ''}${selected ? ' is-selected' : ''}`}
              style={beaconPosition(anchor)}
            >
              <button
                ref={(element) => {
                  if (element) beaconRefs.current.set(anchor.entityId, element)
                  else beaconRefs.current.delete(anchor.entityId)
                }}
                type="button"
                className="position-beacon"
                onClick={() => onSelectEntity(selected ? undefined : anchor.entityId)}
                aria-label={node.hidden ? `${waypointTitle}, ${waypointStatus}` : `${waypointTitle}, ${waypointStatus}, ${node.altitude.toLocaleString()} metres`}
                aria-controls={card.id}
                aria-expanded={selected}
              >
                <span aria-hidden="true">{active ? '⌁' : secured ? '△' : blocked ? '!' : '·'}</span>
              </button>
              <span className={`waypoint-caption${anchor.x > 0.62 ? ' caption-left' : ''}`} aria-hidden="true"><b>{waypointTitle}</b><small>{node.hidden ? 'Survey pending' : `${node.altitude.toLocaleString()} m`}</small></span>
              <AscendScenarioCard
                card={card}
                side={anchor.x > 0.58 ? 'left' : 'right'}
                vertical={anchor.y < 0.34 ? 'below' : 'above'}
                open={selected}
                onClose={closeScenarioCard}
                onChoosePath={onChoosePath}
              />
            </div>
          )
        })}
      </div>

      <article className="glass-cluster situation-glass">
        <p className="eyebrow">{openObstacle ? 'Active obstacle' : narration.stateLabel}</p>
        <h1 id="mission-world-title">{narration.headline}</h1>
        <p>{lastMessage || narration.summary}</p>
        <div className="situation-meta">
          <span>{selection.kind.replaceAll('_', ' ')}</span>
          <span>{handoff
            ? `${handoff.projectName} context linked`
            : state.mission.status === 'completed'
              ? 'Mission evidence verified'
              : state.mission.status === 'draft'
                ? 'Ready for agent survey'
                : 'Mission context active'}</span>
        </div>
      </article>

      <div className="hero-actions">
        <span className={`generation-status status-${generation.status}`}>
          <i />{bundledSceneAsset
            ? `${sceneVariantLabel(selection.kind)} · Authored scene`
            : generatedAsset?.status === 'accepted'
            ? `${generatedAsset.sceneType === 'camp_ii_active' ? 'Camp II' : 'World'} · ${resolution.label}`
            : generation.status === 'prepared' ? 'Visual brief ready' : 'Standard mountain view'}
        </span>
        {webMcpStatus === 'native'
          ? <span className="mcp-pill mcp-native"><i />WebMCP native</span>
          : <button type="button" className={`mcp-pill mcp-${webMcpStatus} mcp-help-button`} onClick={onOpenWebMcpHelp}><i />Connect WebMCP</button>}
        <button type="button" className="glass-button" onClick={() => setShowMissionMap(true)}>Mission Map</button>
      </div>

              {showMissionMap && (
        <div className="mission-map-overlay" role="dialog" aria-modal="true" aria-label="Mission Map">
          <div className="mission-map-header">
            <div><span>Optional diagnostic view</span><strong>Mission Map</strong></div>
            <button type="button" onClick={() => setShowMissionMap(false)} aria-label="Close Mission Map">×</button>
          </div>
          <Suspense fallback={<div className="mission-map-loading">Preparing diagnostic map…</div>}>
            <MissionMapCanvas
              state={state}
              topology={topology}
              instructions={instructions}
              selectedEntityId={selectedEntityId}
              onSelectEntity={onSelectEntity}
              onChoosePath={onChoosePath}
            />
          </Suspense>
        </div>
      )}
    </section>
  )
}
