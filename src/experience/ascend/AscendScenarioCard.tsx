import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { AscendScenarioCardModel } from './scenarioCards'

interface AscendScenarioCardProps {
  card: AscendScenarioCardModel
  side: 'left' | 'right'
  vertical: 'above' | 'below'
  open: boolean
  onClose: () => void
  onChoosePath: (decisionId: string, optionId: string) => void
}

interface CardArtStyle extends CSSProperties {
  '--card-art-url': string
  '--card-art-size-x': string
  '--card-art-size-y': string
  '--card-art-position-x': string
  '--card-art-position-y': string
}

const percent = (value: number) => `${Math.round(value * 10_000) / 100}%`

function artStyle(card: AscendScenarioCardModel): CardArtStyle {
  const crop = card.sourceReference.crop!
  return {
    '--card-art-url': `url("${card.sourceReference.assetUrl}")`,
    '--card-art-size-x': percent(1 / crop.width),
    '--card-art-size-y': percent(1 / crop.height),
    '--card-art-position-x': percent(crop.x / Math.max(0.001, 1 - crop.width)),
    '--card-art-position-y': percent(crop.y / Math.max(0.001, 1 - crop.height)),
  }
}

export function AscendScenarioCard({ card, side, vertical, open, onClose, onChoosePath }: AscendScenarioCardProps) {
  const titleId = `${card.id}:title`
  const cardRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const cardElement = cardRef.current
    const world = cardElement?.closest<HTMLElement>('.production-hero')
    if (!cardElement || !world) return
    let frame = 0
    const place = () => {
      const transition = cardElement.style.transition
      cardElement.style.transition = 'none'
      const worldBounds = world.getBoundingClientRect()
      const visualViewport = window.visualViewport
      const viewportLeft = visualViewport?.offsetLeft ?? 0
      const viewportTop = visualViewport?.offsetTop ?? 0
      const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth)
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight)
      const demoControls = document.querySelector<HTMLElement>('.demo-controls')
      const demoControlsBounds = demoControls?.getClientRects().length ? demoControls.getBoundingClientRect() : undefined
      const bounds = {
        left: Math.max(worldBounds.left, viewportLeft),
        top: Math.max(worldBounds.top, viewportTop),
        right: Math.min(worldBounds.right, viewportRight),
        bottom: Math.min(worldBounds.bottom, viewportBottom, demoControlsBounds?.top ?? viewportBottom),
      }
      const inset = 14
      const ownMarker = cardElement.closest<HTMLElement>('.waypoint-marker')
      const activityRail = world.querySelector<HTMLElement>('.webmcp-activity-rail')
      const activityRailBounds = activityRail?.getClientRects().length ? activityRail.getBoundingClientRect() : undefined
      const obstacles = [...world.querySelectorAll<HTMLElement>('.brand-cluster, .scene-chip, .waypoint-guide, .hero-metrics, .hero-actions')]
        .filter((target) => target.getClientRects().length > 0)
        .map((target) => target.getBoundingClientRect())
      const waypointObstacles = [...world.querySelectorAll<HTMLElement>('.position-beacon')]
        .filter((target) => !ownMarker?.contains(target) && target.getClientRects().length > 0)
        .map((target) => target.getBoundingClientRect())
      const oppositeSide = side === 'left' ? 'right' : 'left'
      const oppositeVertical = vertical === 'above' ? 'below' : 'above'
      const candidates = [
        { side, vertical },
        { side, vertical: oppositeVertical },
        { side: oppositeSide, vertical },
        { side: oppositeSide, vertical: oppositeVertical },
      ]
      let best = candidates[0]
      let bestScore = Number.POSITIVE_INFINITY
      for (const [index, candidate] of candidates.entries()) {
        cardElement.dataset.resolvedSide = candidate.side
        cardElement.dataset.resolvedVertical = candidate.vertical
        cardElement.style.setProperty('--scenario-shift-x', '0px')
        cardElement.style.setProperty('--scenario-shift-y', '0px')
        const rawRect = cardElement.getBoundingClientRect()
        const candidateShiftX = Math.max(bounds.left + inset - rawRect.left, Math.min(0, bounds.right - inset - rawRect.right))
        const candidateShiftY = Math.max(bounds.top + inset - rawRect.top, Math.min(0, bounds.bottom - inset - rawRect.bottom))
        const rect = {
          left: rawRect.left + candidateShiftX,
          right: rawRect.right + candidateShiftX,
          top: rawRect.top + candidateShiftY,
          bottom: rawRect.bottom + candidateShiftY,
        }
        const overflow = Math.max(0, bounds.left + inset - rect.left)
          + Math.max(0, rect.right - bounds.right + inset)
          + Math.max(0, bounds.top + inset - rect.top)
          + Math.max(0, rect.bottom - bounds.bottom + inset)
        const overlapArea = obstacles.reduce((total, obstacle) => {
          const width = Math.max(0, Math.min(rect.right, obstacle.right + 8) - Math.max(rect.left, obstacle.left - 8))
          const height = Math.max(0, Math.min(rect.bottom, obstacle.bottom + 8) - Math.max(rect.top, obstacle.top - 8))
          return total + width * height
        }, 0)
        const waypointOverlapArea = waypointObstacles.reduce((total, obstacle) => {
          const width = Math.max(0, Math.min(rect.right, obstacle.right + 10) - Math.max(rect.left, obstacle.left - 10))
          const height = Math.max(0, Math.min(rect.bottom, obstacle.bottom + 10) - Math.max(rect.top, obstacle.top - 10))
          return total + width * height
        }, 0)
        const activityRailOverlapArea = activityRailBounds
          ? Math.max(0, Math.min(rect.right, activityRailBounds.right + 8) - Math.max(rect.left, activityRailBounds.left - 8))
            * Math.max(0, Math.min(rect.bottom, activityRailBounds.bottom + 8) - Math.max(rect.top, activityRailBounds.top - 8))
          : 0
        // An open scenario must never make another visible waypoint unclickable.
        // Viewport containment remains the first priority. The live WebMCP rail
        // is the proof surface for the contest path, so a card must not cover it;
        // beacon reachability and passive HUD panels follow.
        const displacement = Math.abs(candidateShiftX) + Math.abs(candidateShiftY)
        const score = overflow * 100_000_000
          + activityRailOverlapArea * 10_000_000
          + waypointOverlapArea * 100_000
          + overlapArea
          + displacement * 10
          + index
        if (score < bestScore) {
          bestScore = score
          best = candidate
        }
      }
      cardElement.dataset.resolvedSide = best.side
      cardElement.dataset.resolvedVertical = best.vertical
      const rect = cardElement.getBoundingClientRect()
      let shiftX = Math.max(bounds.left + inset - rect.left, Math.min(0, bounds.right - inset - rect.right))
      let shiftY = Math.max(bounds.top + inset - rect.top, Math.min(0, bounds.bottom - inset - rect.bottom))
      shiftX = Math.round(shiftX)
      shiftY = Math.round(shiftY)
      cardElement.style.setProperty('--scenario-shift-x', `${shiftX}px`)
      cardElement.style.setProperty('--scenario-shift-y', `${shiftY}px`)
      cardElement.dataset.collisionAdjusted = String(shiftX !== 0 || shiftY !== 0)
      cardElement.getBoundingClientRect()
      cardElement.style.transition = transition
    }
    const schedule = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(place)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(world)
    observer.observe(cardElement)
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    schedule()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      window.cancelAnimationFrame(frame)
    }
  }, [card.id, card.kind, open, side, vertical])

  return (
    <article
      ref={cardRef}
      id={card.id}
      className={`waypoint-scenario-card card-${side} card-${vertical} scenario-${card.kind}`}
      data-master-generation-id={card.sourceReference.generationId}
      data-scenario-kind={card.kind}
      data-card-state={open ? 'open' : 'preview'}
      aria-labelledby={titleId}
      aria-hidden={!open}
      role={open ? 'dialog' : undefined}
    >
      <div className="scenario-card-art" style={artStyle(card)} aria-hidden="true" />
      <div className="scenario-card-scrim" aria-hidden="true" />
      <div className="scenario-card-copy">
        <p>{card.eyebrow}</p>
        <h3 id={titleId}>{card.title}</h3>
        <span>{card.summary}</span>
        <footer>
          <b>{card.concealed ? 'Survey pending' : `${card.altitude.toLocaleString()} m`}</b>
          <em>{card.status}</em>
          {!card.concealed && <em>{card.evidenceCount} evidence</em>}
        </footer>
        {open && card.decision && (
          <div className="scenario-card-options" aria-label="Route options">
            {card.decision.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={card.decision?.recommendedOptionId === option.id ? 'is-recommended' : ''}
                onClick={() => onChoosePath(card.decision!.id, option.id)}
              >
                <span>{option.label}</span>
                <small>Effort {Math.round(option.effort * 100)} · Risk {Math.round(option.risk * 100)}</small>
                {card.decision?.recommendedOptionId === option.id && <i>Agent pick</i>}
              </button>
            ))}
          </div>
        )}
        {open && !card.decision && (
          <a className="scenario-card-detail-link" href="#mission-detail">View mission detail <span aria-hidden="true">↓</span></a>
        )}
      </div>
      {open && (
        <button type="button" className="scenario-card-close" onClick={onClose} aria-label="Close scenario card">×</button>
      )}
    </article>
  )
}
