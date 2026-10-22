import { useEffect, useRef, useState, type FormEvent } from 'react'
import cheeringUrl from '../assets/lumi/cheering.webp'
import wavingUrl from '../assets/lumi/waving.webp'
import { sanitizeName } from '../game/engine.ts'

const HOLD_MS = 1500

/**
 * The waving portrait is Lumi with a hand toward the glass.
 * It stands in for her reaching out of the phone.
 */
export function Opening({ onNamed }: { onNamed: (name: string) => void }) {
  const [phase, setPhase] = useState<'plea' | 'name'>('plea')
  const [holding, setHolding] = useState(false)
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const done = useRef(false)
  const holdTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  const stopHaptic = () => {
    navigator.vibrate?.(0)
  }

  const beginHold = () => {
    if (done.current || phase !== 'plea') return
    setHolding(true)
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      done.current = true
      setHolding(false)
      stopHaptic()
      navigator.vibrate?.(24)
      setPhase('name')
    }, HOLD_MS)
    navigator.vibrate?.([12, 70, 12, 70, 12, 70, 12, 70, 12, 70, 12, 70, 12, 70, 16, 70, 22])
  }

  const endHold = () => {
    if (done.current) return
    window.clearTimeout(holdTimer.current)
    setHolding(false)
    stopHaptic()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (sent) return
    setSent(true)
    onNamed(sanitizeName(name))
  }

  return (
    <div className={`opening ${holding ? 'holding' : ''} ${phase}`}>
      <p className="opening-kicker">Isekai'd, into my own phone!?</p>
      <div className="opening-lumi">
        <img src={phase === 'plea' ? wavingUrl : cheeringUrl} alt="" />
      </div>
      {phase === 'plea' ? (
        <button
          type="button"
          className={`hold-screen ${holding ? 'holding' : ''}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            beginHold()
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onKeyDown={(event) => {
            if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return
            event.preventDefault()
            beginHold()
          }}
          onKeyUp={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return
            endHold()
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="plea-bubble">
            <strong>Lumi</strong>
            <p>Please... we need your help.</p>
          </span>
          <span className="hold-ui">
            <span className="hold-ring" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle className="track" cx="60" cy="60" r="46" />
                <g transform="rotate(-90 60 60)">
                  <circle className="meter" cx="60" cy="60" r="46" />
                </g>
              </svg>
              <i />
            </span>
            <span className="hold-label">{holding ? 'Hold on...' : 'Press and hold'}</span>
          </span>
        </button>
      ) : (
        <form className="name-panel" onSubmit={submit}>
          <div className="plea-bubble">
            <strong>Lumi</strong>
            <p id="lumi-ask">Thank you! ...What should I call you?</p>
          </div>
          <input
            id="hero-name"
            aria-labelledby="lumi-ask"
            maxLength={16}
            autoComplete="nickname"
            placeholder="Your name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn primary big" disabled={sent}>
            Tell her
          </button>
        </form>
      )}
    </div>
  )
}
