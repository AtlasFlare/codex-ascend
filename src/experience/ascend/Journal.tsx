import type { MissionEvent } from '../../domain/types'

const eventIcon: Partial<Record<MissionEvent['type'], string>> = {
  mission_created: '⌂',
  obstacle_discovered: '!',
  path_blocked: '╳',
  human_decision_requested: '⑂',
  human_decision_resolved: '✓',
  evidence_attached: '◆',
  stage_completed: '⚑',
  scope_expanded: '⌁',
  completion_verified: '△',
  mission_completed: '★',
}

export function Journal({ events }: { events: MissionEvent[] }) {
  return (
    <section className="journal" aria-labelledby="journal-heading">
      <div className="section-heading"><div><p className="eyebrow">Immutable trail</p><h2 id="journal-heading">Expedition journal</h2></div><span>{events.length} events</span></div>
      <ol>
        {[...events].reverse().slice(0, 7).map((event) => (
          <li key={event.id}>
            <span className="journal-icon" aria-hidden="true">{eventIcon[event.type] ?? '·'}</span>
            <div><strong>{event.title}</strong><p>{event.description}</p><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
          </li>
        ))}
      </ol>
    </section>
  )
}
