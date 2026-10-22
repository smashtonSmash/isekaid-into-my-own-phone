import { Intro } from './components/Intro.tsx'
import { Shell } from './components/Shell.tsx'
import { TitleScreen } from './components/TitleScreen.tsx'
import { GameProvider } from './game/context.tsx'
import { useGame } from './game/useGame.ts'

function Desk() {
  const { state, playing } = useGame()
  let screen = <TitleScreen />
  if (playing && state && !state.introSeen) screen = <Intro />
  if (playing && state?.introSeen) screen = <Shell />

  return (
    <div className="desk">
      <div className="phone">{screen}</div>
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
