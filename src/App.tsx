import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DemoControls } from './components/DemoControls'
import { WebMcpOnboarding } from './components/WebMcpOnboarding'
import { shouldShowWebMcpOnboarding } from './components/webMcpOnboardingModel'
import { createNarratorInput } from './domain/narrator'
import { BasecampDialog } from './experience/ascend/BasecampDialog'
import { ElevationProfile } from './experience/ascend/ElevationProfile'
import { Journal } from './experience/ascend/Journal'
import { MissionDetail } from './experience/ascend/MissionDetail'
import { ScenarioCardReviewHarness } from './experience/ascend/ScenarioCardReviewHarness'
import { resolveMissionMapScene } from './experience/ascend/missionMapSceneGrammar'
import { TransparentMountainHero } from './experience/ascend/TransparentMountainHero'
import type { PersistedGeneratedWorld } from './experience/generation'
import { loadGeneratedWorld } from './experience/generationClient'
import { activeExperiencePack } from './experience/registry'
import { missionStore } from './state/missionStore'
import { registerWebMcpTools } from './webmcp/registerTools'
import { createWebMcpRegistrationLifecycle } from './webmcp/registrationLifecycle'

export default function App() {
  const snapshot = useSyncExternalStore(missionStore.subscribe, missionStore.getSnapshot)
  const [showBasecamp, setShowBasecamp] = useState(false)
  const [generatedWorld, setGeneratedWorld] = useState<PersistedGeneratedWorld>()
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const presentationMode = query.get('present') === '1'
  const scenarioReviewMode = query.get('review') === 'scenario-cards'
  const forceWebMcpGuide = query.get('webmcp-help') === '1'
  const [webMcpGuideDismissed, setWebMcpGuideDismissed] = useState(() => sessionStorage.getItem('ascend:webmcp-guide-dismissed') === '1')
  const [webMcpGuideRequested, setWebMcpGuideRequested] = useState(false)
  const [webMcpGuideClosedThisView, setWebMcpGuideClosedThisView] = useState(false)
  const openWebMcpGuide = useCallback(() => {
    setWebMcpGuideClosedThisView(false)
    setWebMcpGuideRequested(true)
  }, [])
  const closeWebMcpGuide = useCallback(() => {
    sessionStorage.setItem('ascend:webmcp-guide-dismissed', '1')
    setWebMcpGuideDismissed(true)
    setWebMcpGuideRequested(false)
    setWebMcpGuideClosedThisView(true)
  }, [])
  const projection = useMemo(() => {
    const experienceState = activeExperiencePack.validateState(snapshot.experience.state, snapshot.mission.mission.seed)
    return activeExperiencePack.project(snapshot.mission, experienceState)
  }, [snapshot.experience, snapshot.mission])
  const topology = projection.topology
  const productionScene = useMemo(() => activeExperiencePack.resolveScene(snapshot.mission, projection), [projection, snapshot.mission])
  const missionMapInstructions = useMemo(() => resolveMissionMapScene(snapshot.mission, topology), [snapshot.mission, topology])
  const narration = useMemo(() => activeExperiencePack.narrate(createNarratorInput(snapshot.mission), projection), [projection, snapshot.mission])
  const visibleGeneratedWorld = generatedWorld?.expeditionId === snapshot.mission.mission.id ? generatedWorld : undefined

  useEffect(() => {
    return createWebMcpRegistrationLifecycle(() => registerWebMcpTools(missionStore))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const refresh = async () => {
      try {
        const world = await loadGeneratedWorld(snapshot.mission.mission.id, controller.signal)
        if (!controller.signal.aborted && world) {
          setGeneratedWorld((current) => current?.updatedAt === world.updatedAt ? current : world)
        }
      } catch {
        // Preserve the last known-good scene during transient edge/network errors.
      }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 30_000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [snapshot.mission.mission.id])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__ASCEND_DEV__ = {
      next: () => { missionStore.advanceDemo() },
      previous: () => { missionStore.previousDemo() },
      reset: () => { missionStore.resetDemo() },
    }
    return () => { delete window.__ASCEND_DEV__ }
  }, [])

  return (
    <main className={`app-shell${presentationMode ? '' : ' has-demo-controls'}`}>
      <TransparentMountainHero
        state={snapshot.mission}
        topology={topology}
        selection={productionScene}
        instructions={missionMapInstructions}
        narration={narration}
        lastMessage={snapshot.lastMessage}
        webMcpStatus={snapshot.webMcpStatus}
        toolLog={snapshot.toolLog}
        handoff={snapshot.handoff}
        generation={snapshot.generation}
        generatedWorld={visibleGeneratedWorld}
        scenarioReviewMode={scenarioReviewMode}
        selectedEntityId={snapshot.selectedEntityId}
        onSelectEntity={(id) => missionStore.selectEntity(id)}
        onChoosePath={(decisionId, optionId) => missionStore.selectDecision(decisionId, optionId)}
        onNewMission={() => setShowBasecamp(true)}
        onOpenWebMcpHelp={openWebMcpGuide}
      />

      <section className="mission-console">
        <div className="console-primary">
          <MissionDetail
            state={snapshot.mission}
            topology={topology}
            selectedEntityId={snapshot.selectedEntityId}
            webMcpStatus={snapshot.webMcpStatus}
            onReviewDecision={(stageId) => {
              missionStore.selectEntity(stageId)
              window.requestAnimationFrame(() => document.getElementById('mission-hero')?.scrollIntoView({ block: 'start' }))
            }}
          />
          <ElevationProfile
            state={snapshot.mission}
            topology={topology}
            discoveryPercent={snapshot.mission.mission.discoveryPercent}
            selectedEntityId={snapshot.selectedEntityId}
            onSelectEntity={(id) => missionStore.selectEntity(id)}
          />
        </div>
        <Journal events={snapshot.mission.events} />
      </section>

      <section className="semantic-mirror" aria-label="Accessible mountain entities">
        <h2>Mission entities</h2>
        {topology.nodes.map((node) => (
          <button key={node.id} onClick={() => missionStore.selectEntity(node.id)}>
            {node.hidden ? 'Unknown terrain' : node.stage.title}: {node.stage.status}
          </button>
        ))}
      </section>

      {!presentationMode && <DemoControls snapshot={snapshot} />}
      {scenarioReviewMode && (
        <ScenarioCardReviewHarness
          cursor={snapshot.demoCursor}
          onLoad={(cursor) => missionStore.seekDemo(cursor, true, 'Loaded review checkpoint')}
        />
      )}
      {showBasecamp && <BasecampDialog onClose={() => setShowBasecamp(false)} />}
      {!webMcpGuideClosedThisView && (webMcpGuideRequested || shouldShowWebMcpOnboarding(snapshot.webMcpStatus, webMcpGuideDismissed, forceWebMcpGuide)) && (
        <WebMcpOnboarding
          status={snapshot.webMcpStatus}
          onClose={closeWebMcpGuide}
        />
      )}
    </main>
  )
}
