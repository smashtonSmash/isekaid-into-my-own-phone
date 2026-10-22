import { useState } from 'react'
import { seasonLabel } from '../game/data.ts'
import { sanitizeName } from '../game/engine.ts'
import { useGame } from '../game/useGame.ts'
import { Confirm } from './ui.tsx'

export function TitleScreen() {
  const { state, startNew, continueGame, abandon } = useGame()
  const [name, setName] = useState(state?.playerName ?? '')
  const [confirmNew, setConfirmNew] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)

  const begin = () => {
    if (state) {
      setConfirmNew(true)
      return
    }
    startNew(sanitizeName(name))
  }

  return (
    <div className="app" data-phase="dawn">
      <div className="stage title-stage">
        <p className="kicker">Chapter I · Slow life</p>
        <h1 className="logo">Isekai'd, into my own phone!?</h1>
        <p className="tag">You were only going to check one more thing.</p>
        <div className="title-phone" aria-hidden="true">
          <div className="title-glass">
            <span>11:58</span>
            <i />
            <b>???</b>
          </div>
        </div>
        <form
          className="title-form"
          onSubmit={(event) => {
            event.preventDefault()
            begin()
          }}
        >
          <label htmlFor="hero-name">What should the village call you?</label>
          <input
            id="hero-name"
            maxLength={16}
            autoComplete="nickname"
            placeholder="Traveler"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn primary big">
            Fall in
          </button>
        </form>
        {state && (
          <div className="panel continue-card">
            <p className="kicker">Still on this phone</p>
            <strong>
              {state.playerName} · Lv {state.level}
            </strong>
            <p>
              {state.glim} glim · Day {state.day} · {seasonLabel(state.season)}
            </p>
            <button type="button" className="btn good big" onClick={continueGame}>
              Continue
            </button>
            <button type="button" className="text-btn" onClick={() => setConfirmErase(true)}>
              Erase this dream
            </button>
          </div>
        )}
      </div>
      {confirmNew && (
        <Confirm
          title="Start over?"
          body="A new fall will erase the day saved on this phone."
          confirmLabel="Fall in again"
          tone="danger"
          onClose={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false)
            startNew(sanitizeName(name))
          }}
        />
      )}
      {confirmErase && (
        <Confirm
          title="Erase the save?"
          body="The village will forget this visit. Nothing is uploaded anywhere. It only lived in this browser."
          confirmLabel="Erase"
          tone="danger"
          onClose={() => setConfirmErase(false)}
          onConfirm={() => {
            setConfirmErase(false)
            setName('')
            abandon()
          }}
        />
      )}
    </div>
  )
}
