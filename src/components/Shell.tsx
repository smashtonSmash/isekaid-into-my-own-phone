import { useEffect, useState } from 'react'
import { CROPS, growthOf, tutorialMarks, xpToNext } from '../game/data.ts'
import { moveGarden, payTax } from '../game/engine.ts'
import { formatLeft } from '../game/format.ts'
import type { MissionId, VillagerId } from '../game/types.ts'
import { useGame } from '../game/useGame.ts'
import type { WorldPick } from '../world/pick.ts'
import { TownWorld } from '../world/TownWorld.tsx'
import { BattleView } from './BattleView.tsx'
import { BuildButton, TabBar, TopBar, type PhoneTab } from './Chrome.tsx'
import { LumiGuide, type LumiExpression } from './LumiGuide.tsx'
import { AdventurePage, FriendsPage, HomePage, StoragePage, type BagFilter } from './pages.tsx'
import { HallSheet, HelpSheet, PersonSheet, PlaceSheet, PlotSheet } from './Sheets.tsx'
import { useNow } from './useNow.ts'

type Panel =
  | { type: 'plot'; index: number }
  | { type: 'villager'; id: VillagerId }
  | { type: 'hall' }
  | { type: 'building'; id: 'inn' | 'cafe' | 'barn' | 'garden' }
  | { type: 'help' }

export function Shell() {
  const { state, toast, act, dismissToast } = useGame()
  const [tab, setTab] = useState<PhoneTab>('village')
  const [panel, setPanel] = useState<Panel | null>(null)
  const [battle, setBattle] = useState<MissionId | null>(null)
  const [placing, setPlacing] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const [bag, setBag] = useState<BagFilter>('all')
  const now = useNow(500)
  const tutorial = state?.tutorial

  useEffect(() => {
    if (tutorial !== 'plant') return
    const id = window.setTimeout(() => setGreeted(true), 3200)
    return () => window.clearTimeout(id)
  }, [tutorial])

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
  const planted = state.plots.find((plot) => plot.crop)?.crop
  const guide = lumiLine({
    toast,
    placing: placing && tab === 'village',
    tutorial: state.tutorial,
    greeted,
    ready,
    label: current?.label ?? '',
    growingMs: growing?.remainingMs,
    cropName: planted ? CROPS[planted].name.toLowerCase() : 'crop',
  })
  const focus: WorldPick | null =
    panel?.type === 'plot'
      ? { kind: 'plot', index: panel.index }
      : panel?.type === 'villager'
        ? { kind: 'villager', id: panel.id }
        : panel?.type === 'hall'
          ? { kind: 'hall' }
          : panel?.type === 'building'
            ? { kind: 'building', id: panel.id }
            : null

  const openPick = (pick: WorldPick) => {
    if (pick.kind === 'plot') setPanel({ type: 'plot', index: pick.index })
    else if (pick.kind === 'villager') setPanel({ type: 'villager', id: pick.id })
    else if (pick.kind === 'hall') setPanel({ type: 'hall' })
    else if (pick.kind === 'market') {
      setBag('seeds')
      setTab('storage')
      setPanel(null)
      setPlacing(false)
    } else if (pick.id === 'house') {
      setTab('home')
      setPanel(null)
      setPlacing(false)
    } else setPanel({ type: 'building', id: pick.id })
  }

  const showGuide = guide && (tab === 'village' || toast)

  return (
    <div className="app world-app">
      <div className="village-layer" hidden={tab !== 'village'}>
        <TownWorld
          state={state}
          now={now}
          focus={focus}
          placing={placing}
          onPick={openPick}
          onMoveGarden={(x, y) => {
            act((currentState) => {
              const result = moveGarden(currentState, x, y)
              if (result.ok) setPlacing(false)
              return result
            })
          }}
        />
        <BuildButton
          placing={placing}
          onClick={() => {
            setPlacing((value) => !value)
            setPanel(null)
          }}
        />
      </div>
      {tab === 'home' && <HomePage now={now} onHelp={() => setPanel({ type: 'help' })} />}
      {tab === 'friends' && <FriendsPage onOpen={(id) => setPanel({ type: 'villager', id })} />}
      {tab === 'storage' && <StoragePage filter={bag} onFilter={setBag} />}
      {tab === 'adventure' && <AdventurePage onFight={setBattle} />}
      <TopBar
        name={state.playerName}
        level={state.level}
        xp={state.xp}
        nextXp={nextXp}
        glim={state.glim}
        stardust={state.stardust}
        taxReady={canPay}
        taxText={`Tax ${Math.min(state.glim, state.tax.goal)}/${state.tax.goal} · ${state.tax.dueAt > 0 ? formatLeft(taxLeft) : 'soon'}`}
        onTax={() => act((currentState) => payTax(currentState, Date.now()))}
      />
      {showGuide && guide && (
        <LumiGuide
          key={guide.popKey}
          popKey={guide.popKey}
          expression={guide.expression}
          kicker={guide.kicker}
          line={guide.line}
          onDismiss={toast ? dismissToast : undefined}
        />
      )}
      <TabBar
        tab={tab}
        onTab={(next) => {
          setTab(next)
          setPanel(null)
        }}
      />
      {panel?.type === 'plot' && <PlotSheet index={panel.index} now={now} onClose={() => setPanel(null)} />}
      {panel?.type === 'villager' && <PersonSheet id={panel.id} onClose={() => setPanel(null)} />}
      {panel?.type === 'building' && <PlaceSheet id={panel.id} now={now} onClose={() => setPanel(null)} />}
      {panel?.type === 'hall' && (
        <HallSheet
          now={now}
          onClose={() => setPanel(null)}
          onAdventure={() => {
            setTab('adventure')
          }}
        />
      )}
      {panel?.type === 'help' && <HelpSheet onClose={() => setPanel(null)} />}
      {battle && <BattleView missionId={battle} onClose={() => setBattle(null)} />}
    </div>
  )
}

function lumiLine(input: {
  toast: { text: string; ok: boolean } | null
  placing: boolean
  tutorial: 'plant' | 'grow' | 'cook' | 'deliver' | 'done'
  greeted: boolean
  ready: boolean
  label: string
  growingMs: number | undefined
  cropName: string
}): { popKey: string; expression: LumiExpression; kicker: string; line: string } | null {
  if (input.toast) {
    return {
      popKey: `toast:${input.toast.text}`,
      expression: expressionForToast(input.toast.text, input.toast.ok),
      kicker: 'Lumi',
      line: input.toast.text,
    }
  }
  if (input.placing) {
    return {
      popKey: 'place',
      expression: 'explaining',
      kicker: 'Place the beds',
      line: 'Tap the grass where the beds should sit. The grid marks every tile.',
    }
  }
  if (input.tutorial === 'done' || !input.label) return null
  if (input.tutorial === 'plant' && !input.greeted) {
    return {
      popKey: 'greet',
      expression: 'waving',
      kicker: 'Lumi',
      line: 'You made it through the glass. I’ll stay in this corner and talk you through the morning.',
    }
  }
  if (input.tutorial === 'plant') {
    return { popKey: 'plant', expression: 'explaining', kicker: input.label, line: 'Tap a soil tile in the garden.' }
  }
  if (input.tutorial === 'grow' && !input.ready) {
    const line = input.growingMs != null ? `${formatLeft(input.growingMs)} left on the ${input.cropName}.` : 'Wait for it to grow.'
    return { popKey: 'grow', expression: 'explaining', kicker: input.label, line }
  }
  if (input.tutorial === 'grow' && input.ready) {
    return { popKey: 'harvest', expression: 'explaining', kicker: input.label, line: 'Tap the plot and bring it in.' }
  }
  if (input.tutorial === 'cook') {
    return { popKey: 'cook', expression: 'explaining', kicker: input.label, line: 'Tap the inn and cook a radish skillet.' }
  }
  if (input.tutorial === 'deliver') {
    return { popKey: 'deliver', expression: 'explaining', kicker: input.label, line: 'Serve Miri, or sell the skillet at the market.' }
  }
  return null
}

function expressionForToast(text: string, ok: boolean): LumiExpression {
  if (!ok) return 'surprised'
  if (/finished|arriv|walk into|opens|unlock|ledger|heartmark|best friend|bell rings|king is still/i.test(text)) return 'surprised'
  return 'cheering'
}
