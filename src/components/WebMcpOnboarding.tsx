import { useEffect, useRef, useState } from 'react'
import { ASCEND_STARTER_PROMPT, type WebMcpConnectionStatus } from './webMcpOnboardingModel'

interface WebMcpOnboardingProps {
  status: WebMcpConnectionStatus
  onClose: () => void
}

export function WebMcpOnboarding({ status, onClose }: WebMcpOnboardingProps) {
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const connected = status === 'native'

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(ASCEND_STARTER_PROMPT)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="webmcp-onboarding-layer" data-webmcp-guide={status}>
      <aside ref={panelRef} className="webmcp-onboarding" role="dialog" aria-modal="true" aria-labelledby="webmcp-onboarding-title">
        <header>
          <div>
            <span className={`webmcp-guide-kicker${connected ? ' is-connected' : ''}`}><i />{connected ? 'WEBMCP READY' : 'GPT + ASCEND'}</span>
            <h2 id="webmcp-onboarding-title">{connected ? 'Your agent is connected to the climb' : 'Connect your agent to the climb'}</h2>
          </div>
          <button ref={closeRef} type="button" className="webmcp-guide-close" onClick={onClose} aria-label="Explore Ascend without connecting WebMCP">×</button>
        </header>

        <p className="webmcp-guide-lede">{connected
          ? 'Ascend’s 18 site tools are live in this page. ChatGPT can now inspect and advance the same mission state you see on the mountain.'
          : 'This browser is not exposing Ascend’s site tools yet. The mountain still works as a visual demo; connect WebMCP to let ChatGPT inspect and advance the same live mission state.'}</p>

        <ol className="webmcp-connect-steps">
          <li><b>1</b><span><strong>Open this page in ChatGPT desktop</strong><small>Use ChatGPT’s built-in browser, then select the site-tools arrow in the address bar.</small></span></li>
          <li><b>2</b><span><strong>Review website access</strong><small>ChatGPT discovers Ascend’s 18 typed tools on this page. Approve the access prompt when asked.</small></span></li>
          <li><b>3</b><span><strong>Start the expedition</strong><small>Paste the prompt below. The agent will stop when a route needs your decision.</small></span></li>
        </ol>

        <div className="webmcp-starter-prompt">
          <span>Starter prompt</span>
          <p>{ASCEND_STARTER_PROMPT}</p>
          <button type="button" onClick={() => { void copyPrompt() }}>{copied ? 'Copied' : 'Copy prompt'}</button>
        </div>

        <div className="webmcp-collaboration-flow" aria-label="How Codex Ascend works">
          <span><i>01</i><b>Agent surveys</b><small>mission topology</small></span>
          <em>→</em>
          <span><i>02</i><b>You decide</b><small>inside the world</small></span>
          <em>→</em>
          <span><i>03</i><b>Evidence unlocks</b><small>Verified Summit</small></span>
        </div>

        <footer>
          <p><strong>Chrome tester?</strong> Enable <code>chrome://flags/#enable-webmcp-testing</code>, then reload this page.</p>
          <div>
            <button type="button" className="webmcp-guide-secondary" onClick={onClose}>Explore visual demo</button>
            <button type="button" className="webmcp-guide-primary" onClick={() => window.location.reload()}>Check connection</button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
