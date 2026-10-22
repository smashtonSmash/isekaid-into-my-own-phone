import { useState } from 'react'
import { seasonLabel } from '../game/data.ts'
import { useGame } from '../game/useGame.ts'
import { Confirm } from './ui.tsx'

export function TitleScreen() {
  const { state, continueGame, abandon } = useGame()
  const [confirmNew, setConfirmNew] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)

  if (!state) return null

  return (
    <div className="app" data-phase="dawn">
      <div className="stage title-stage">
        <p className="kicker">Chapter I · Slow life</p>
        <h1 className="logo">Isekai'd, into my own phone!?</h1>
        <p className="tag">Her hand is already in yours.</p>
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
          <button type="button" className="text-btn" onClick={() => setConfirmNew(true)}>
            Take her hand again
          </button>
          <button type="button" className="text-btn" onClick={() => setConfirmErase(true)}>
            Erase this dream
          </button>
        </div>
      </div>
      {confirmNew && (
        <Confirm
          title="Start over?"
          body="A new fall will erase the day saved on this phone. Lumi will reach through the glass again."
          confirmLabel="Take her hand"
          tone="danger"
          onClose={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false)
            abandon()
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
            abandon()
          }}
        />
      )}
    </div>
  )
}
