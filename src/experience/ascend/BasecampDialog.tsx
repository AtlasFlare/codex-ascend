import { useEffect, useRef, useState } from 'react'
import { missionStore } from '../../state/missionStore'

export function BasecampDialog({ onClose }: { onClose: () => void }) {
  const [objective, setObjective] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState('')
  const dialogRef = useRef<HTMLFormElement>(null)
  const objectiveRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  const returnFocusRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const returnFocus = returnFocusRef.current
    objectiveRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
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
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      returnFocus?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        ref={dialogRef}
        className="basecamp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="basecamp-dialog-title"
        aria-describedby="basecamp-dialog-description"
        onSubmit={(event) => {
          event.preventDefault()
          if (!objective.trim()) return
          missionStore.createMission({
            title: objective.trim().split(/\s+/).slice(0, 5).join(' '),
            objective,
            description,
            successCriteria: criteria.split('\n').map((line) => line.trim()).filter(Boolean),
            originStage: {
              title: 'Basecamp',
              description: 'The objective is established. The mountain is still unsurveyed.',
              successCriteria: ['Mission objective is clear enough to survey'],
            },
          })
          onClose()
        }}
      >
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">One objective. One expedition.</p>
        <h2 id="basecamp-dialog-title">Establish a new basecamp</h2>
        <p id="basecamp-dialog-description" className="basecamp-dialog-description">Define the objective and evidence that will count as reaching the summit.</p>
        <label>Mission objective<input ref={objectiveRef} autoFocus required value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ship this application to production" /></label>
        <label>Context<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What matters, what is already known, and what must stay safe." /></label>
        <label>Success criteria <span>one per line</span><textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder={'Critical tests pass\nLive release is verified'} /></label>
        <button className="establish-button" type="submit">Establish basecamp <span>↗</span></button>
      </form>
    </div>
  )
}
