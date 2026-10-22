import { useState } from 'react'
import { useGame } from '../game/useGame.ts'
import { Speech } from './Portrait.tsx'

const BEATS: { who: string; name: string; line: string }[] = [
  {
    who: 'lumi',
    name: 'Lumi',
    line: 'Hey. Look at the glass. I am Lumi, and I reached through because your thumb was still on the screen.',
  },
  {
    who: 'lumi',
    name: 'Lumi',
    line: 'You have been isekai’d into your own phone. The village on the other side is real, and it has to earn glim to pay the king’s taxes.',
  },
  {
    who: 'lumi',
    name: 'Lumi',
    line: 'The tax clock starts when you step onto the soil. I will stay with you. Miri is at the gate.',
  },
  {
    who: 'miri',
    name: 'Miri',
    line: 'There you are. I am Miri. Pink hair, turnip basket, welcome-to-the-village voice. The field is soft if you ask it nicely.',
  },
  {
    who: 'miri',
    name: 'Miri',
    line: 'Plant a radish in the garden. It grows on a real timer, so wander while you wait. Harvest it, cook a skillet at Elowen’s inn, and bring it to me. I will pay you in glim.',
  },
]

export function Intro() {
  const { finishIntro, state } = useGame()
  const [step, setStep] = useState(0)
  const beat = BEATS[step] ?? BEATS[0]
  const last = step >= BEATS.length - 1

  return (
    <div className="app" data-sky="dawn">
      <div className="stage intro-stage">
        <p className="kicker">Through the glass</p>
        <h1>The phone let go.</h1>
        {state && <p className="lede">The status bar still says {state.playerName}.</p>}
        <Speech who={beat.who} name={beat.name} line={beat.line} />
      </div>
      <div className="dock">
        <button type="button" className="text-btn" onClick={finishIntro}>
          Skip ahead
        </button>
        <button
          type="button"
          className="btn primary big"
          onClick={() => {
            if (last) finishIntro()
            else setStep((value) => value + 1)
          }}
        >
          {last ? 'Step into the village' : 'Next'}
        </button>
      </div>
    </div>
  )
}
