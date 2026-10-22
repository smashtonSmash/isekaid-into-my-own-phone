import { useEffect, useState } from 'react'
import { CROPS, growthOf, tutorialMarks, xpToNext } from '../game/data.ts'
import { moveGarden, payTax } from '../game/engine.ts'
import { formatLeft } from '../game/format.ts'
import type { MissionId, VillagerId } from '../game/types.ts'
import { useGame } from '../game/useGame.ts'
import type { WorldPick } from '../world/pick.ts'
import { TownWorld } from '../world/TownWorld.tsx'
import { BattleView } from './BattleView.tsx'
import {
  FriendsSheet,
  GoalsSheet,
  HallSheet,
  HelpSheet,
  MarketSheet,
  PersonSheet,
  PlaceSheet,
  PlotSheet,
} from './Sheets.tsx'
import { useNow } from './useNow.ts'

type Panel =
  | { type: 'plot'; index: number }
  | { type: 'villager'; id: VillagerId }
  | { type: 'hall' }
  | { type: 'market' }
  | { type: 'building'; id: 'house' | 'inn' | 'cafe' | 'barn' | 'garden' }
  | { type: 'goals' }
  | { type: 'friends' }
  | { type: 'help' }

export function Shell() {
  const { state, toast, act, dismissToast } = useGame()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [battle, setBattle] = useState<MissionId | null>(null)
  const [placing, setPlacing] = useState(false)
  const now = useNow(500)

  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> }
    try {
      void orientation.lock?.call(screen.orientation, 'landscape').catch(() => {})
    } catch {
      /* The portrait hint covers browsers that refuse the lock. */
    }
  }, [])

  if (!state) return null

  const nextXp = xpToNext(state.level)
  const taxLeft = state.tax.dueAt > 0 ? Math.max(0, state.tax.dueAt - now) : 0
  const canPay = state.tax.dueAt > 0 && state.glim >= state.tax.goal
  const ready = state.plots.some((plot) => plot.crop === 'radish' && growthOf(plot, state.villagers, now)?.ready)
  const current = tutorialMarks(state.tutorial, Boolean(ready)).find((mark) => mark.state === 'now')
  const growing = state.plots
    .map((plot) => growthOf(plot, state.villagers, now))
    .filter((growth) => growth && !growth.ready)
    .sort((a, b) => (a?.remainingMs ?? 0) - (b?.remainingMs ?? 0))[0]
  const focus: WorldPick | null =
    panel?.type === 'plot'
      ? { kind: 'plot', index: panel.index }
      : panel?.type === 'villager'
        ? { kind: 'villager', id: panel.id }
        : panel?.type === 'hall'
          ? { kind: 'hall' }
          : panel?.type === 'market'
            ? { kind: 'market' }
            : panel?.type === 'building'
              ? { kind: 'building', id: panel.id }
              : null

  const openPick = (pick: WorldPick) => {
    if (pick.kind === 'plot') setPanel({ type: 'plot', index: pick.index })
    else if (pick.kind === 'villager') setPanel({ type: 'villager', id: pick.id })
    else if (pick.kind === 'hall') setPanel({ type: 'hall' })
    else if (pick.kind === 'market') setPanel({ type: 'market' })
    else setPanel({ type: 'building', id: pick.id })
  }

  return (
    <div className="app world-app">
      <TownWorld
        state={state}
        now={now}
        focus={focus}
        placing={placing}
        onPick={openPick}
        onMoveGarden={(x, y) => {
          act((current) => {
            const result = moveGarden(current, x, y)
            if (result.ok) setPlacing(false)
            return result
          })
        }}
      />
      <header className="hud">
        <div className="pill level" aria-label={`Level ${state.level}, ${state.xp} of ${nextXp} experience`}>
          <strong>Lv {state.level}</strong>
          <span className="xp">
            <i style={{ width: `${Math.min(100, (state.xp / nextXp) * 100)}%` }} />
          </span>
        </div>
        <button
          type="button"
          className={`pill tax ${canPay ? 'ready' : ''}`}
          onClick={() => {
            if (canPay) act((currentState) => payTax(currentState, Date.now()))
          }}
        >
          <span>Tax</span>
          <strong>
            {Math.min(state.glim, state.tax.goal)}/{state.tax.goal}
          </strong>
          <small>{state.tax.dueAt > 0 ? formatLeft(taxLeft) : 'soon'}</small>
        </button>
        <div className="pill star" aria-label={`${state.stardust} stardust`}>
          <span>★</span>
          <strong>{state.stardust}</strong>
        </div>
        <div className="pill glim" aria-label={`${state.glim} glim`}>
          <i className="coin" aria-hidden="true" />
          <strong>{state.glim}</strong>
        </div>
        <button type="button" className="icon-btn" onClick={() => setPanel({ type: 'help' })} aria-label="How to play">
          ?
        </button>
        {toast && (
          <button type="button" className={`toast ${toast.ok ? 'ok' : 'bad'}`} onClick={dismissToast}>
            {toast.text}
          </button>
        )}
      </header>
      {current && (
        <aside className="coach">
          <strong>{current.label}</strong>
          {state.tutorial === 'grow' && !ready && growing && (
            <p>
              {formatLeft(growing.remainingMs)} left
              {state.plots.find((plot) => plot.crop)?.crop ? ` on the ${CROPS[state.plots.find((plot) => plot.crop)?.crop ?? 'radish'].name.toLowerCase()}` : ''}.
            </p>
          )}
          {state.tutorial === 'plant' && <p>Tap a soil tile in the garden.</p>}
          {state.tutorial === 'grow' && ready && <p>Tap the plot and bring it in.</p>}
          {state.tutorial === 'cook' && <p>Tap the inn and cook a radish skillet.</p>}
          {state.tutorial === 'deliver' && <p>Serve Miri, or sell the skillet at the market.</p>}
        </aside>
      )}
      <div className="map-tools">
        {placing && <p>Tap the grass where the beds should sit. The grid marks every tile.</p>}
        <button
          type="button"
          className={placing ? 'on' : ''}
          onClick={() => {
            setPlacing((value) => !value)
            setPanel(null)
          }}
        >
          {placing ? 'Cancel move' : 'Move garden'}
        </button>
      </div>
      <nav className="tabbar">
        <button type="button" className={panel?.type === 'goals' ? 'on' : ''} onClick={() => setPanel({ type: 'goals' })}>
          Goals
        </button>
        <button type="button" className={panel?.type === 'friends' ? 'on' : ''} onClick={() => setPanel({ type: 'friends' })}>
          Friends
        </button>
        <button type="button" className={panel?.type === 'market' ? 'on' : ''} onClick={() => setPanel({ type: 'market' })}>
          Market
        </button>
      </nav>
      {panel?.type === 'plot' && <PlotSheet index={panel.index} now={now} onClose={() => setPanel(null)} />}
      {panel?.type === 'villager' && <PersonSheet id={panel.id} onClose={() => setPanel(null)} />}
      {panel?.type === 'building' && <PlaceSheet id={panel.id} now={now} onClose={() => setPanel(null)} />}
      {panel?.type === 'hall' && <HallSheet now={now} onClose={() => setPanel(null)} onFight={setBattle} />}
      {panel?.type === 'goals' && <GoalsSheet now={now} onClose={() => setPanel(null)} />}
      {panel?.type === 'friends' && (
        <FriendsSheet onClose={() => setPanel(null)} onOpen={(id) => setPanel({ type: 'villager', id })} />
      )}
      {panel?.type === 'market' && <MarketSheet onClose={() => setPanel(null)} />}
      {panel?.type === 'help' && <HelpSheet onClose={() => setPanel(null)} />}
      {battle && <BattleView missionId={battle} onClose={() => setBattle(null)} />}
    </div>
  )
}
