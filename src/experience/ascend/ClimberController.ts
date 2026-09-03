import type { Container } from 'pixi.js'
import type { TopologyPoint } from './topology'

export type ClimberState = 'idle' | 'hiking' | 'climbing' | 'inspecting' | 'waiting' | 'resting' | 'celebrating'

export class ClimberController {
  private current: TopologyPoint
  private target: TopologyPoint
  private state: ClimberState = 'idle'

  constructor(initial: TopologyPoint) {
    this.current = { ...initial }
    this.target = { ...initial }
  }

  setTarget(target: TopologyPoint, state: ClimberState) {
    this.target = { ...target }
    this.state = state
  }

  update(deltaSeconds: number, container: Container, width: number, height: number, reducedMotion: boolean) {
    const distance = Math.hypot(this.target.x - this.current.x, this.target.y - this.current.y)
    const factor = reducedMotion ? 1 : Math.min(1, deltaSeconds * (distance > 0.08 ? 2.1 : 3.4))
    this.current.x += (this.target.x - this.current.x) * factor
    this.current.y += (this.target.y - this.current.y) * factor
    container.position.set(this.current.x * width, this.current.y * height)
    const pulse = reducedMotion ? 1 : 1 + Math.sin(performance.now() / 190) * (this.state === 'celebrating' ? 0.12 : 0.025)
    container.scale.set(pulse)
  }
}
