export type WebMcpConnectionStatus = 'checking' | 'native' | 'unsupported' | 'error'

export const ASCEND_STARTER_PROMPT = 'Inspect this mission, discover its route, and advance carefully. Stop when human authorization is required.'

export function shouldShowWebMcpOnboarding(
  status: WebMcpConnectionStatus,
  dismissed: boolean,
  forced = false,
) {
  return forced || (!dismissed && (status === 'unsupported' || status === 'error'))
}
