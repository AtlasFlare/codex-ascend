interface ScenarioCardReviewHarnessProps {
  cursor: number
  onLoad: (cursor: number) => void
}

const checkpoints = [
  { cursor: 8, label: 'Camp III · normal' },
  { cursor: 9, label: 'Persistence blocker' },
  { cursor: 11, label: 'Route decision' },
] as const

export function ScenarioCardReviewHarness({ cursor, onLoad }: ScenarioCardReviewHarnessProps) {
  return (
    <aside className="scenario-review-harness" aria-label="Scenario card visual review checkpoints">
      <strong>Scenario beta</strong>
      <span>Deterministic visual checkpoints</span>
      <div>
        {checkpoints.map((checkpoint) => (
          <button
            key={checkpoint.cursor}
            type="button"
            className={cursor === checkpoint.cursor ? 'is-current' : ''}
            onClick={() => onLoad(checkpoint.cursor)}
          >
            {checkpoint.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
