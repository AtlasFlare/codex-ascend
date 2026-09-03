import type { HumanDecision, MissionState } from '../../domain/types'
import { missionDetailEvidenceCount } from './missionDetailEvidence'
import type { MountainTopology } from './topology'

interface MissionDetailProps {
  state: MissionState
  topology: MountainTopology
  selectedEntityId?: string
  onReviewDecision: (stageId: string) => void
  webMcpStatus: 'checking' | 'native' | 'unsupported' | 'error'
}

function SelectedEntity({ state, topology, entityId }: { state: MissionState; topology: MountainTopology; entityId?: string }) {
  const stage = entityId ? state.stages[entityId] : undefined
  const path = entityId ? state.paths[entityId] : undefined
  const obstacle = entityId ? state.obstacles[entityId] : undefined
  const decision = entityId ? state.decisions[entityId] : undefined
  if (obstacle) {
    return (
      <div className="detail-card hazard-detail">
        <span className="detail-symbol">裂</span>
        <div>
          <p className="eyebrow">{obstacle.severity} {obstacle.category.replace('_', ' ')}</p>
          <h3>{obstacle.title}</h3>
          <p>{obstacle.description}</p>
          <dl><div><dt>Source</dt><dd>{obstacle.source}</dd></div><div><dt>Confidence</dt><dd>{Math.round(obstacle.confidence * 100)}%</dd></div></dl>
        </div>
      </div>
    )
  }
  if (decision) {
    return <div className="detail-card"><div><p className="eyebrow">Path decision</p><h3>{decision.question}</h3><p>{decision.context}</p></div></div>
  }
  if (path) {
    return (
      <div className="detail-card">
        <span className="detail-symbol">↗</span>
        <div><p className="eyebrow">{path.status} route</p><h3>{path.title}</h3><p>{path.description}</p></div>
      </div>
    )
  }
  if (stage) {
    if (stage.status === 'hidden') {
      return (
        <div className="detail-card">
          <span className="detail-symbol">?</span>
          <div><p className="eyebrow">Unsurveyed terrain</p><h3>Route not yet revealed</h3><p>Advance the mission to reveal this section and its requirements.</p></div>
        </div>
      )
    }
    const altitude = topology.nodes.find((node) => node.id === stage.id)?.altitude
    const evidenceCount = missionDetailEvidenceCount(state, stage.id)
    return (
      <div className="detail-card">
        <span className="detail-symbol">△</span>
        <div>
          <p className="eyebrow">{stage.status} · {stage.kind.replace('_', ' ')}</p>
          <h3>{stage.title}</h3>
          <p>{stage.description}</p>
          <dl><div><dt>Altitude</dt><dd>{altitude?.toLocaleString() ?? '—'}m</dd></div><div><dt>Evidence</dt><dd>{evidenceCount}</dd></div></dl>
        </div>
      </div>
    )
  }
  const active = state.stages[state.mission.activeStageId ?? '']
  return (
    <div className="detail-card">
      <span className="detail-symbol">⌁</span>
      <div><p className="eyebrow">Current situation</p><h3>{active?.title ?? 'Basecamp'}</h3><p>{active?.description ?? state.mission.objective}</p></div>
    </div>
  )
}

function DecisionSummary({ decision, onReviewDecision }: { decision: HumanDecision; onReviewDecision: MissionDetailProps['onReviewDecision'] }) {
  return (
    <section className="decision-card" aria-labelledby="decision-title">
      <div className="decision-beacon" aria-hidden="true">!</div>
      <p className="eyebrow">Human decision required</p>
      <h3 id="decision-title">{decision.question}</h3>
      <p>{decision.context}</p>
      <p className="decision-location-note">The route card is the authoritative decision surface, keeping the choice beside the terrain it changes.</p>
      <button type="button" className="decision-review-button" onClick={() => onReviewDecision(decision.stageId)}>Review route options on mountain <span aria-hidden="true">↑</span></button>
    </section>
  )
}

export function MissionDetail({ state, topology, selectedEntityId, onReviewDecision, webMcpStatus }: MissionDetailProps) {
  const pending = Object.values(state.decisions).find((decision) => !decision.resolvedAt)
  return (
    <section id="mission-detail" className="situation-panel" aria-labelledby="situation-heading" tabIndex={-1}>
      <div className="section-heading">
        <div><p className="eyebrow">Live mission state</p><h2 id="situation-heading">Current situation</h2></div>
        <span className={`status-badge status-${state.mission.status}`}>{state.mission.status.replace('_', ' ')}</span>
      </div>
      {state.mission.status === 'draft' && (
        <aside className="agent-survey-callout" aria-label="Next step">
          <div><p className="eyebrow">Next step · Agent survey</p><h3>Survey the route from basecamp</h3></div>
          <p>{webMcpStatus === 'native'
            ? 'WebMCP is connected. Ask your agent to inspect this mission, then discover its stages and paths.'
            : 'Ask your agent to inspect this mission and discover its stages and paths. WebMCP connection is not yet available in this browser.'}</p>
          <code>inspect_mission → discover_mission</code>
        </aside>
      )}
      {pending ? <DecisionSummary decision={pending} onReviewDecision={onReviewDecision} /> : <SelectedEntity state={state} topology={topology} entityId={selectedEntityId} />}
    </section>
  )
}
