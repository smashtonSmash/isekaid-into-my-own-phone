import { useState } from 'react'
import {
  BUILDINGS,
  CROPS,
  CROP_IDS,
  GUILD_MASTER,
  MISSIONS,
  VILLAGERS,
  buildingDuration,
  cropUnlocked,
  itemDef,
  missionUnlocked,
  nextTier,
  priceOf,
  tutorialMarks,
  growthOf,
} from '../game/data.ts'
import {
  buySeed,
  claimGoal,
  friendTitle,
  hurryBuilding,
  payTax,
  rest,
  sell,
  signGuild,
  startBuilding,
} from '../game/engine.ts'
import { formatLeft } from '../game/format.ts'
import type { CropId, ItemId, MissionId, VillagerId } from '../game/types.ts'
import { useGame } from '../game/useGame.ts'
import { Speech } from './Portrait.tsx'

const GLYPH: Record<string, string> = {
  radish: '🌱',
  turnip: '🥬',
  carrot: '🥕',
  strawberry: '🍓',
  tomato: '🍅',
  pumpkin: '🎃',
  wheat: '🌾',
  cabbage: '🥗',
  watermelon: '🍉',
  sunflower: '🌻',
  radish_skillet: '🍳',
  turnip_soup: '🥣',
  carrot_tea: '🍵',
  berry_cup: '🫐',
  slime_gel: '💧',
  goblin_scrap: '🔩',
}

export type BagFilter = 'all' | 'crops' | 'seeds' | 'meals' | 'materials'

const FILTERS: { id: BagFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crops', label: 'Crops' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'meals', label: 'Meals' },
  { id: 'materials', label: 'Bits' },
]

export function HomePage({ now, onHelp }: { now: number; onHelp: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const ready = state.plots.some((plot) => plot.crop === 'radish' && growthOf(plot, state.villagers, now)?.ready)
  const marks = tutorialMarks(state.tutorial, Boolean(ready))
  const taxLeft = state.tax.dueAt > 0 ? state.tax.dueAt - now : 0
  const house = state.buildings.house
  const tier = nextTier('house', house.level)
  const raising = house.readyAt ? house.readyAt - now : 0

  return (
    <section className="phone-page room-page">
      <div className="room">
        <div className="room-window" aria-hidden="true">
          <i />
          <i />
        </div>
        <p className="room-blurb">{BUILDINGS.house.blurb}</p>
        <article className="quest-board">
          <h3>On the wall</h3>
          <ol className="marks">
            {marks.map((mark) => (
              <li key={mark.label} data-state={mark.state}>
                {mark.label}
              </li>
            ))}
          </ol>
          <h3>Today</h3>
          <div className="stack">
            {state.goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className="btn"
                disabled={goal.claimed || goal.progress < goal.target}
                onClick={() => act((current) => claimGoal(current, goal.id))}
              >
                {goal.title}
                <small>
                  {goal.detail} · {goal.progress}/{goal.target} · {goal.rewardGlim} glim
                  {goal.claimed ? ' · claimed' : ''}
                </small>
              </button>
            ))}
          </div>
        </article>
        <div className="room-row">
          <article className="hearth">
            <h3>Hearth</h3>
            <p>Cottage level {house.level}. The lantern stays lit while you are out in the lanes.</p>
            {house.readyAt && (
              <>
                <p>Raising the walls · {formatLeft(raising)}</p>
                <button type="button" className="btn" onClick={() => act((current) => hurryBuilding(current, 'house', Date.now()))}>
                  Skip 30s · 1 stardust
                </button>
              </>
            )}
            {!house.readyAt && tier && (
              <button type="button" className="btn primary" onClick={() => act((current) => startBuilding(current, 'house', Date.now()))}>
                {house.level === 0 ? `Build · ${tier.cost} glim` : `Upgrade · ${tier.cost} glim`}
                <small>
                  {formatLeft(buildingDuration('house', house.level, state))} · {tier.effect}
                </small>
              </button>
            )}
            <button type="button" className="btn" onClick={() => act(rest)}>
              Rest until dawn
              <small>Refreshes chats, gifts, and orders. Crops keep their real timers.</small>
            </button>
          </article>
          <article className="ledger">
            <h3>King’s tax</h3>
            <p>
              {Math.min(state.glim, state.tax.goal)}/{state.tax.goal} glim · {state.tax.dueAt > 0 ? formatLeft(Math.max(0, taxLeft)) : 'starts in the village'}
            </p>
            <button type="button" className="btn primary" onClick={() => act((current) => payTax(current, Date.now()))}>
              Pay the tax
            </button>
          </article>
        </div>
        <button type="button" className="text-btn" onClick={onHelp}>
          How the village works
        </button>
      </div>
    </section>
  )
}

export function FriendsPage({ onOpen }: { onOpen: (id: VillagerId) => void }) {
  const { state } = useGame()
  if (!state) return null
  return (
    <section className="phone-page">
      <h2 className="page-title">Friends</h2>
      <p className="fine">The people already in the lanes. Hearts rise from chats, gifts, and plates.</p>
      <div className="roster">
        {state.villagers.map((villager) => {
          const def = VILLAGERS[villager.id]
          return (
            <button key={villager.id} type="button" className="roster-card" onClick={() => onOpen(villager.id)}>
              <span className="roster-face" style={{ background: def.look.cloth }} aria-hidden="true">
                <b style={{ background: def.look.hair }} />
                <i style={{ background: def.look.skin }} />
              </span>
              <span>
                <strong>{def.name}</strong>
                <small>
                  {def.title} · {friendTitle(villager.id, villager.friendship)} · {villager.friendship} hearts
                  {villager.hired ? ' · hired' : ''}
                </small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function StoragePage({ filter, onFilter }: { filter: BagFilter; onFilter: (filter: BagFilter) => void }) {
  const { state, act } = useGame()
  const [picked, setPicked] = useState<ItemId | null>(null)
  if (!state) return null
  const owned = (Object.keys(state.inventory) as ItemId[]).filter((id) => (state.inventory[id] ?? 0) > 0)
  const shown = owned.filter((id) => matchesFilter(itemDef(id).kind, filter))
  const selected = picked && (state.inventory[picked] ?? 0) > 0 ? picked : null
  const selectedDef = selected ? itemDef(selected) : null
  const stale = selected && selectedDef?.kind === 'crop' ? (state.stale[selected as CropId] ?? 0) : 0
  const price = selected ? priceOf(selected, false, state.villagers, state.buildings.inn.level) : 0

  return (
    <section className="phone-page">
      <h2 className="page-title">Storage</h2>
      <div className="filter-row" role="tablist" aria-label="Bag filters">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? 'on' : ''} onClick={() => onFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="empty-bag">{filter === 'all' ? 'The bag is light. The garden and the inn fill it.' : 'Nothing in this pocket yet.'}</p>
      ) : (
        <div className="bag-grid">
          {shown.map((id) => {
            const def = itemDef(id)
            const tired = def.kind === 'crop' ? (state.stale[id as CropId] ?? 0) : 0
            return (
              <button key={id} type="button" className={`bag-cell ${selected === id ? 'on' : ''}`} onClick={() => setPicked(id)}>
                <span className="bag-glyph" aria-hidden="true">
                  {glyphFor(id)}
                </span>
                <b>{state.inventory[id]}</b>
                <small>
                  {def.name}
                  {tired ? ` · ${tired} tired` : ''}
                </small>
              </button>
            )
          })}
        </div>
      )}
      {selected && selectedDef && (
        <div className="bag-detail">
          <strong>{selectedDef.name}</strong>
          <p>{selectedDef.blurb}</p>
          {selectedDef.sell != null ? (
            <button type="button" className="btn primary" onClick={() => act((current) => sell(current, selected, 1))}>
              Sell one · {price} glim{stale > 0 ? ` · ${stale} tired, half price` : ''}
            </button>
          ) : (
            <p className="fine">This stays in the bag. Seeds go in the ground, and bits wait for the forge.</p>
          )}
        </div>
      )}
      {(filter === 'seeds' || filter === 'all') && (
        <>
          <h3>Market stall</h3>
          <p className="fine">The stall on the lane sells the same packets. Tap the building, or buy them here.</p>
          <div className="bag-grid shop">
            {CROP_IDS.map((crop) => {
              const open = cropUnlocked(crop, state.townHall.level)
              return (
                <button key={crop} type="button" className="bag-cell shop-cell" disabled={!open} onClick={() => act((current) => buySeed(current, crop, 1))}>
                  <span className="bag-glyph" aria-hidden="true">
                    {GLYPH[crop] ?? '🌱'}
                  </span>
                  <small>
                    {CROPS[crop].name} · {open ? `${CROPS[crop].seedCost} glim` : `Hall ${CROPS[crop].hall}`}
                  </small>
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

export function AdventurePage({ onFight }: { onFight: (id: MissionId) => void }) {
  const { state, act } = useGame()
  if (!state) return null
  return (
    <section className="phone-page">
      <div className="expedition">
        <h2 className="page-title">Adventure</h2>
        <Speech who="vale" name={GUILD_MASTER.name} line={state.guildSigned ? GUILD_MASTER.signed : GUILD_MASTER.greeting}>
          <p className="fine">{GUILD_MASTER.title}</p>
        </Speech>
        {!state.guildSigned && (
          <button type="button" className="btn primary big" onClick={() => act(signGuild)}>
            Sign the ledger
          </button>
        )}
        <ol className="road">
          {MISSIONS.map((mission) => {
            const open = state.guildSigned && missionUnlocked(state.missionsCleared, mission.id)
            const clears = state.missionsCleared[mission.id] ?? 0
            return (
              <li key={mission.id}>
                <button type="button" className={`expedition-node ${clears ? 'cleared' : ''} ${open ? 'open' : ''}`} disabled={!open} onClick={() => onFight(mission.id)}>
                  <strong>{mission.name}</strong>
                  <small>
                    {open ? mission.detail : state.guildSigned ? 'Clear the earlier contract first.' : 'Sign the ledger first.'} · {mission.glim} glim · {mission.xp} XP
                    {clears ? ` · cleared ${clears}` : ''}
                  </small>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function matchesFilter(kind: ReturnType<typeof itemDef>['kind'], filter: BagFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'crops') return kind === 'crop'
  if (filter === 'seeds') return kind === 'seed'
  if (filter === 'meals') return kind === 'meal'
  return kind === 'material'
}

function glyphFor(id: ItemId): string {
  if (id.endsWith('_seed')) return GLYPH[id.slice(0, -5)] ?? '🌱'
  return GLYPH[id] ?? '📦'
}
