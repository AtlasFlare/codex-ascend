import type { MissionState } from '../../domain/types'
import type { MountainTopology } from './topology'
import { getElevationCheckpointSignal, getSurveyedPercent } from './elevationProfileTelemetry'

interface ElevationProfileProps {
  state: MissionState
  topology: MountainTopology
  discoveryPercent: number
  selectedEntityId?: string
  onSelectEntity: (entityId?: string) => void
}

const statusLabel = (status: string) => status.replaceAll('_', ' ')

export function ElevationProfile({ state, topology, discoveryPercent, selectedEntityId, onSelectEntity }: ElevationProfileProps) {
  const visible = topology.nodes.filter((node) => !node.hidden).sort((a, b) => a.altitude - b.altitude)
  const surveyedPercent = getSurveyedPercent(topology, discoveryPercent)
  const points = visible.map((node) => `${Math.round(node.x * 260)},${Math.round(node.y * 82)}`).join(' ')

  const selectCheckpoint = (entityId: string, selected: boolean) => {
    const nextEntityId = selected ? undefined : entityId
    onSelectEntity(nextEntityId)
    if (nextEntityId) {
      window.requestAnimationFrame(() => document.getElementById('mission-hero')?.scrollIntoView({ block: 'start' }))
    }
  }

  return (
    <section className="elevation-profile" aria-labelledby="elevation-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Path topology</p>
          <h2 id="elevation-heading">Elevation profile</h2>
        </div>
        <span>{surveyedPercent}% surveyed · {topology.securedAltitude.toLocaleString()} m secured</span>
      </div>
      <svg viewBox="0 0 280 96" role="img" aria-label="Mission checkpoint elevation overview">
        <defs>
          <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6b3d" stopOpacity="0.34" />
            <stop offset="1" stopColor="#ff6b3d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points && <polygon points={`${points} 260,92 18,92`} fill="url(#profile-fill)" />}
        {points && <polyline points={points} fill="none" stroke="#ff6b3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {visible.map((node) => {
          const signal = getElevationCheckpointSignal(state, node.id)
          const x = Math.round(node.x * 260)
          const y = Math.round(node.y * 82)
          return (
            <g key={node.id} className={`profile-point signal-${signal.kind}`}>
              <circle
                cx={x}
                cy={y}
                r={signal.kind === 'decision' || signal.kind === 'blocker' ? 5 : node.stage.status === 'active' ? 4.5 : 3}
                fill={node.stage.status === 'completed' ? '#ff6b3d' : '#f2fbff'}
                stroke="currentColor"
                strokeWidth="1.5"
              />
              {(signal.kind === 'decision' || signal.kind === 'blocker') && <text x={x} y={y + 1.8} textAnchor="middle">!</text>}
            </g>
          )
        })}
      </svg>
      <div className="profile-legend" aria-label="Elevation signal legend"><span className="legend-evidence">◆ Evidence</span><span className="legend-decision">! Decision</span><span className="legend-blocker">! Blocker</span></div>
      <div className="elevation-checkpoints" aria-label="Elevation checkpoints">
        {visible.map((node) => {
          const selected = node.id === selectedEntityId
          const signal = getElevationCheckpointSignal(state, node.id)
          return (
            <button
              key={node.id}
              type="button"
              className={`elevation-checkpoint checkpoint-${node.stage.status} signal-${signal.kind}${selected ? ' is-selected' : ''}`}
              aria-current={selected ? 'step' : undefined}
              onClick={() => selectCheckpoint(node.id, selected)}
            >
              <i aria-hidden="true" />
              <span><b>{node.stage.title}</b><small>{node.altitude.toLocaleString()} m · {statusLabel(node.stage.status)}</small></span>
              {signal.kind !== 'none' && <em>{signal.label}</em>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
