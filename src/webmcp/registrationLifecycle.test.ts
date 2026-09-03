import { describe, expect, it, vi } from 'vitest'
import { createWebMcpRegistrationLifecycle } from './registrationLifecycle'

describe('WebMCP registration lifecycle', () => {
  it('cancels the development probe and registers only the surviving mount', async () => {
    const tasks = new Map<number, () => void>()
    let nextHandle = 0
    const schedule = (task: () => void) => {
      nextHandle += 1
      tasks.set(nextHandle, task)
      return nextHandle
    }
    const cancel = (handle: unknown) => { tasks.delete(handle as number) }
    const unregister = vi.fn()
    const register = vi.fn(async () => unregister)

    const disposeProbe = createWebMcpRegistrationLifecycle(register, schedule, cancel)
    disposeProbe()
    expect(tasks.size).toBe(0)

    const disposeLive = createWebMcpRegistrationLifecycle(register, schedule, cancel)
    tasks.get(nextHandle)?.()
    await Promise.resolve()

    expect(register).toHaveBeenCalledTimes(1)
    disposeLive()
    expect(unregister).toHaveBeenCalledTimes(1)
  })
})
