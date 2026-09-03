export type WebMcpRegistrationCleanup = () => void

type ScheduleRegistration = (task: () => void) => unknown
type CancelRegistration = (handle: unknown) => void

const browserSchedule: ScheduleRegistration = (task) => window.setTimeout(task, 0)
const browserCancel: CancelRegistration = (handle) => window.clearTimeout(handle as number)

/**
 * Defers registration by one task so React's development remount can cancel
 * its probe before native tool names are registered twice.
 */
export function createWebMcpRegistrationLifecycle(
  register: () => Promise<WebMcpRegistrationCleanup>,
  schedule: ScheduleRegistration = browserSchedule,
  cancel: CancelRegistration = browserCancel,
): WebMcpRegistrationCleanup {
  let disposed = false
  let unregister: WebMcpRegistrationCleanup = () => undefined
  const handle = schedule(() => {
    if (disposed) return
    void register().then((cleanup) => {
      if (disposed) cleanup()
      else unregister = cleanup
    })
  })
  return () => {
    disposed = true
    cancel(handle)
    unregister()
  }
}
