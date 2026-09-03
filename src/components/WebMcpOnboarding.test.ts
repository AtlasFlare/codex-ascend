import { describe, expect, it } from 'vitest'
import { ASCEND_STARTER_PROMPT, shouldShowWebMcpOnboarding } from './webMcpOnboardingModel'

describe('WebMCP onboarding visibility', () => {
  it('opens for a disconnected browser until the visitor dismisses it', () => {
    expect(shouldShowWebMcpOnboarding('unsupported', false)).toBe(true)
    expect(shouldShowWebMcpOnboarding('error', false)).toBe(true)
    expect(shouldShowWebMcpOnboarding('unsupported', true)).toBe(false)
  })

  it('does not interrupt a native WebMCP session', () => {
    expect(shouldShowWebMcpOnboarding('checking', false)).toBe(false)
    expect(shouldShowWebMcpOnboarding('native', false)).toBe(false)
  })

  it('supports a deterministic video-review route', () => {
    expect(shouldShowWebMcpOnboarding('native', true, true)).toBe(true)
    expect(ASCEND_STARTER_PROMPT).toContain('Stop when human authorization is required')
  })
})
