import { useEffect, useState } from 'react'
import { DEMO_STEP_COUNT } from '../demo/demoExpedition'
import { missionStore, type MissionSnapshot } from '../state/missionStore'

export function DemoControls({ snapshot }: { snapshot: MissionSnapshot }) {
  const [autoplay, setAutoplay] = useState(false)
  const [speed, setSpeed] = useState(1)
  const cursor = snapshot.demoCursor
  const waitingForHuman = snapshot.mission.mission.status === 'awaiting_human'
  const autoplayRunning = autoplay && cursor < DEMO_STEP_COUNT && !waitingForHuman
  const autoplayLabel = waitingForHuman
    ? 'Waiting for decision'
    : cursor >= DEMO_STEP_COUNT
      ? 'Complete'
      : autoplayRunning ? 'Pause' : 'Autoplay'

  useEffect(() => {
    if (!autoplayRunning) return
    const timer = window.setInterval(() => missionStore.advanceDemo(), 1600 / speed)
    return () => window.clearInterval(timer)
  }, [autoplayRunning, cursor, speed])

  return (
    <details className="demo-controls" open>
      <summary>Demo lab <span>{cursor}/{DEMO_STEP_COUNT}</span></summary>
      <div>
        <button onClick={() => { setAutoplay(false); missionStore.resetDemo() }} aria-label="Reset deterministic demo">↺ Reset</button>
        <button onClick={() => { setAutoplay(false); missionStore.previousDemo() }} disabled={cursor === 0} aria-label="Previous demo event">←</button>
        <button className="primary-control" onClick={() => missionStore.advanceDemo()} disabled={cursor >= DEMO_STEP_COUNT}>Next event →</button>
        <button
          onClick={() => setAutoplay((value) => !value)}
          disabled={waitingForHuman || cursor >= DEMO_STEP_COUNT}
        >
          {autoplayLabel}
        </button>
        <label>Speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
      </div>
      <details className="dev-inspector">
        <summary>State + WebMCP log</summary>
        <pre>{JSON.stringify({
          revision: snapshot.mission.revision,
          status: snapshot.mission.mission.status,
          activeStageId: snapshot.mission.mission.activeStageId,
          openObstacles: Object.values(snapshot.mission.obstacles).filter((item) => item.status !== 'resolved').map((item) => item.id),
          pendingDecisions: Object.values(snapshot.mission.decisions).filter((item) => !item.resolvedAt).map((item) => item.id),
          toolLog: snapshot.toolLog.slice(-6),
        }, null, 2)}</pre>
      </details>
    </details>
  )
}
