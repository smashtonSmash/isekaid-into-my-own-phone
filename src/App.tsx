import { useState } from 'react'
import { Intro } from './components/Intro.tsx'
import { Opening } from './components/Opening.tsx'
import { Portal } from './components/Portal.tsx'
import { Shell } from './components/Shell.tsx'
import { TitleScreen } from './components/TitleScreen.tsx'
import { GameProvider } from './game/context.tsx'
import { useGame } from './game/useGame.ts'

function Desk() {
  const { state, playing, startNew } = useGame()
  const [portal, setPortal] = useState(false)
  let screen = <Opening onNamed={(name) => { startNew(name); setPortal(true) }} />
  if (!playing && state) screen = <TitleScreen />
  if (playing && state && !state.introSeen) screen = <Intro />
  if (playing && state?.introSeen) screen = <Shell />

  return (
    <div className="desk">
      <div className="phone">
        {screen}
        {portal && <Portal onDone={() => setPortal(false)} />}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Desk />
    </GameProvider>
  )
}
