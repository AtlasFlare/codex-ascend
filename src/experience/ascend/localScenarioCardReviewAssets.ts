import type { GenerationSourceReference } from '../generation'
import type { AscendScenarioCardKind } from './scenarioCards'

type BundledScenarioAsset = Omit<GenerationSourceReference, 'focalEntityId'> & { focalEntityId?: string }

const asset = (generationId: string, assetUrl: string, focalEntityId?: string): BundledScenarioAsset => ({
  generationId,
  assetUrl,
  width: 1600,
  height: 960,
  focalEntityId,
})

/**
 * Built-in beta artwork generated with the Codex image workflow. These files
 * provide deterministic visual coverage for the full demo without modifying
 * or implying acceptance into the Cloudflare generation world.
 */
export const BUNDLED_SCENARIO_CARD_ASSETS = {
  basecamp: asset('codex-subscription:basecamp-origin:v1', '/art/ascend/scenario-cards/basecamp-origin-subscription-v1.png'),
  foundation: asset('codex-subscription:camp-i-foundation:v2', '/art/ascend/scenario-cards/camp-i-foundation-subscription-v2.png', 'cp_foundation'),
  implementation: asset('codex-subscription:camp-ii-implementation:v1', '/art/ascend/scenario-cards/camp-ii-implementation-subscription-v1.png', 'cp_implementation'),
  validation: {
    camp: asset('codex-subscription:camp-iii-normal:v2', '/art/ascend/scenario-cards/camp-iii-normal-subscription-v2.png', 'cp_validation'),
    blocker: asset('codex-subscription:camp-iii-blocker:v1', '/art/ascend/scenario-cards/camp-iii-blocker-subscription-v1.png', 'cp_validation'),
    decision: asset('codex-subscription:camp-iii-decision:v1', '/art/ascend/scenario-cards/camp-iii-decision-subscription-v1.png', 'cp_validation'),
  },
  security: asset('codex-subscription:security-ridge:v1', '/art/ascend/scenario-cards/security-ridge-subscription-v1.png', 'cp_security'),
  finalApproach: {
    concealed: asset('codex-subscription:final-approach-concealed:v1', '/art/ascend/scenario-cards/final-approach-concealed-subscription-v1.png', 'cp_deployment'),
    active: asset('codex-subscription:final-approach-active:v1', '/art/ascend/scenario-cards/final-approach-active-subscription-v1.png', 'cp_deployment'),
  },
  summit: {
    concealed: asset('codex-subscription:summit-concealed:v1', '/art/ascend/scenario-cards/summit-concealed-subscription-v1.png', 'cp_summit'),
    verified: asset('codex-subscription:summit-verified:v1', '/art/ascend/scenario-cards/summit-verified-subscription-v1.png', 'cp_summit'),
  },
} as const

export function resolveBundledScenarioCardAsset(entityId: string, kind: AscendScenarioCardKind): GenerationSourceReference | undefined {
  let candidate: BundledScenarioAsset | undefined
  if (kind === 'basecamp') candidate = BUNDLED_SCENARIO_CARD_ASSETS.basecamp
  else if (entityId === 'cp_foundation') candidate = BUNDLED_SCENARIO_CARD_ASSETS.foundation
  else if (entityId === 'cp_implementation') candidate = BUNDLED_SCENARIO_CARD_ASSETS.implementation
  else if (entityId === 'cp_validation') {
    candidate = kind === 'blocker'
      ? BUNDLED_SCENARIO_CARD_ASSETS.validation.blocker
      : kind === 'decision'
        ? BUNDLED_SCENARIO_CARD_ASSETS.validation.decision
        : BUNDLED_SCENARIO_CARD_ASSETS.validation.camp
  } else if (entityId === 'cp_security') candidate = BUNDLED_SCENARIO_CARD_ASSETS.security
  else if (entityId === 'cp_deployment') {
    candidate = kind === 'discovery'
      ? BUNDLED_SCENARIO_CARD_ASSETS.finalApproach.concealed
      : BUNDLED_SCENARIO_CARD_ASSETS.finalApproach.active
  } else if (entityId === 'cp_summit') {
    candidate = kind === 'discovery'
      ? BUNDLED_SCENARIO_CARD_ASSETS.summit.concealed
      : BUNDLED_SCENARIO_CARD_ASSETS.summit.verified
  }
  return candidate ? { ...candidate, focalEntityId: entityId } : undefined
}
