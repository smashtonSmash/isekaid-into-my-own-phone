import { useState } from 'react'
import {
  BUILDINGS,
  CROPS,
  CROP_IDS,
  GUILD_MASTER,
  KINGDOM_HALL,
  MISSIONS,
  RECIPES,
  VILLAGERS,
  buildingDuration,
  cropUnlocked,
  hallDuration,
  dialogueFor,
  growthOf,
  itemDef,
  missionUnlocked,
  nextHall,
  nextTier,
  priceOf,
  tutorialMarks,
} from '../game/data.ts'
import {
  buySeed,
  claimGoal,
  cook,
  gift,
  harvest,
  hire,
  hurryBuilding,
  hurryHall,
  hurryPlot,
  payTax,
  plant,
  till,
  rest,
  sell,
  serve,
  signGuild,
  startBuilding,
  startTownHall,
  talk,
  water,
  workplaceOpen,
  friendTitle,
} from '../game/engine.ts'
import { formatLeft } from '../game/format.ts'
import type { BuildingId, CropId, ItemId, MissionId, VillagerId } from '../game/types.ts'
import { useGame } from '../game/useGame.ts'
import { Speech } from './Portrait.tsx'
import { Meter, Sheet } from './ui.tsx'

export function PlotSheet({ index, now, onClose }: { index: number; now: number; onClose: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const plot = state.plots[index]
  if (!plot) return null
  const growth = growthOf(plot, state.villagers, now)

  return (
    <Sheet title={`Bed ${index + 1}`} onClose={onClose}>
      {!plot.crop && (
        <>
          <p>
            {plot.tilled
              ? 'Tilled soil. Plant a crop, or leave the bed turned.'
              : 'Bare soil. Till it, or plant straight into it. A radish is ready in one minute.'}
          </p>
          {!plot.tilled && (
            <button type="button" className="btn" onClick={() => act((current) => till(current, index))}>
              Leave tilled
            </button>
          )}
          <div className="stack">
            {CROP_IDS.filter((crop) => cropUnlocked(crop, state.townHall.level)).map((crop) => {
              const held = state.inventory[`${crop}_seed`] ?? 0
              return (
                <button
                  key={crop}
                  type="button"
                  className="btn primary"
                  disabled={held < 1}
                  onClick={() => act((current) => plant(current, index, crop, Date.now()))}
                >
                  Plant {CROPS[crop].name}
                  <small>{held > 0 ? `${held} seeds · ${formatLeft(CROPS[crop].ms)}` : `Buy seeds · ${CROPS[crop].seedCost} glim`}</small>
                </button>
              )
            })}
          </div>
        </>
      )}
      {plot.crop && growth && !growth.ready && (
        <>
          <p>
            {CROPS[plot.crop].name} · {formatLeft(growth.remainingMs)} left
            {plot.watered ? ' · watered' : ''}
          </p>
          <Meter label="Growth" value={Math.round(growth.fraction * 100)} max={100} />
          <div className="stack">
            {!plot.watered && (
              <button type="button" className="btn good" onClick={() => act((current) => water(current, index, Date.now()))}>
                Water
              </button>
            )}
            <button type="button" className="btn" onClick={() => act((current) => hurryPlot(current, index, Date.now()))}>
              Skip 30s · 1 stardust
            </button>
          </div>
        </>
      )}
      {plot.crop && growth?.ready && (
        <>
          <p>{growth.stale ? `${CROPS[plot.crop].name} is tired. The market will pay half.` : `${CROPS[plot.crop].name} is ready.`}</p>
          <button type="button" className="btn primary big" onClick={() => act((current) => harvest(current, index, Date.now()))}>
            Harvest
          </button>
        </>
      )}
    </Sheet>
  )
}

export function PlaceSheet({ id, now, onClose }: { id: BuildingId; now: number; onClose: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const def = BUILDINGS[id]
  const building = state.buildings[id]
  const tier = nextTier(id, building.level)
  const recipes = RECIPES.filter((recipe) => (id === 'inn' && recipe.place === 'inn') || (id === 'cafe' && recipe.place === 'cafe'))
  const left = building.readyAt ? building.readyAt - now : 0

  return (
    <Sheet title={def.name} onClose={onClose}>
      <p>{def.blurb}</p>
      <p className="fine">Level {building.level}</p>
      {building.level > 0 && recipes.length > 0 && (
        <div className="stack">
          {recipes.map((recipe) => {
            const ready = recipe.ingredients.every((part) => (state.inventory[part.item] ?? 0) >= part.qty)
            return (
              <button key={recipe.id} type="button" className="btn" disabled={!ready || building.level < 1} onClick={() => act((current) => cook(current, recipe.id))}>
                Cook {recipe.name}
                <small>
                  {recipe.ingredients.map((part) => `${part.qty} ${CROPS[part.item].name}`).join(', ')} · sells {recipe.sell}
                </small>
              </button>
            )
          })}
        </div>
      )}
      {building.readyAt && (
        <>
          <p>Raising the walls · {formatLeft(left)}</p>
          <button type="button" className="btn" onClick={() => act((current) => hurryBuilding(current, id, Date.now()))}>
            Skip 30s · 1 stardust
          </button>
        </>
      )}
      {!building.readyAt && tier && (
        <button
          type="button"
          className="btn primary"
          onClick={() => act((current) => startBuilding(current, id, Date.now()))}
        >
          {building.level === 0 ? `Build · ${tier.cost} glim` : `Upgrade · ${tier.cost} glim`}
          <small>
            {formatLeft(buildingDuration(id, building.level, state))} · Town Hall {tier.hall} · {tier.effect}
          </small>
        </button>
      )}
      {!tier && <p className="fine">This building is as fine as the current chapter allows.</p>}
    </Sheet>
  )
}

export function PersonSheet({ id, onClose }: { id: VillagerId; onClose: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const villager = state.villagers.find((item) => item.id === id)
  if (!villager) return null
  const def = VILLAGERS[id]
  const line = dialogueFor(id, villager.friendship, state.day)
  const gifts = (Object.keys(state.inventory) as ItemId[]).filter((item) => {
    const kind = itemDef(item).kind
    return (state.inventory[item] ?? 0) > 0 && (kind === 'crop' || kind === 'meal')
  })

  return (
    <Sheet title={def.name} onClose={onClose}>
      <Speech who={id} name={def.name} line={line}>
        <p className="fine">
          {def.title} · {def.age} · {friendTitle(id, villager.friendship)} · {villager.friendship} hearts
        </p>
      </Speech>
      <Meter label="Hearts" value={villager.friendship} max={100} />
      <p>{def.personality}</p>
      <div className="stack">
        <button type="button" className="btn" onClick={() => act((current) => talk(current, id))}>
          Chat
          <small>{villager.talkedToday ? 'Already talked today' : '+1 heart'}</small>
        </button>
        <button type="button" className="btn primary" disabled={villager.requestFilled} onClick={() => act((current) => serve(current, id))}>
          {villager.requestFilled ? 'Order filled' : `Serve ${itemDef(villager.request.item).name}`}
          <small>
            {villager.request.reward} glim · {villager.request.hearts} hearts
          </small>
        </button>
        {villager.friendship >= 40 && !villager.hired && (
          <button type="button" className="btn good" onClick={() => act((current) => hire(current, id))}>
            Hire
            <small>{workplaceOpen(state, id) ? def.perk : def.hireLock}</small>
          </button>
        )}
        {villager.hired && <p className="fine">Hired. {def.perk}</p>}
        {villager.heartmarkSeen && (
          <p className="fine">
            {def.romance ? 'Heartmark is glowing. A later chapter can open a route. This one leaves it unwritten.' : 'Best friend. That promise is the whole of it.'}
          </p>
        )}
      </div>
      {gifts.length > 0 && (
        <>
          <h3>A gift</h3>
          <div className="chip-row">
            {gifts.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => act((current) => gift(current, id, item))}>
                {itemDef(item).name} · {state.inventory[item]}
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

export function HallSheet({
  now,
  onClose,
  onFight,
}: {
  now: number
  onClose: () => void
  onFight: (id: MissionId) => void
}) {
  const { state, act } = useGame()
  const [tab, setTab] = useState<'guild' | 'upgrades' | 'kingdom'>('guild')
  if (!state) return null
  const next = nextHall(state.townHall.level)
  const left = state.townHall.readyAt ? state.townHall.readyAt - now : 0

  return (
    <Sheet title="Town Hall" onClose={onClose}>
      <div className="tabs">
        <button type="button" className={tab === 'guild' ? 'on' : ''} onClick={() => setTab('guild')}>
          Guild
        </button>
        <button type="button" className={tab === 'upgrades' ? 'on' : ''} onClick={() => setTab('upgrades')}>
          Upgrades
        </button>
        <button type="button" className={tab === 'kingdom' ? 'on' : ''} onClick={() => setTab('kingdom')}>
          Kingdom
        </button>
      </div>
      {tab === 'guild' && (
        <>
          <Speech who="vale" name={GUILD_MASTER.name} line={state.guildSigned ? GUILD_MASTER.signed : GUILD_MASTER.greeting}>
            <p className="fine">
              {GUILD_MASTER.title} · {GUILD_MASTER.age} · portrait stand-in
            </p>
          </Speech>
          {!state.guildSigned && (
            <button type="button" className="btn primary big" onClick={() => act(signGuild)}>
              Sign the ledger
            </button>
          )}
          {state.guildSigned && (
            <div className="stack">
              {MISSIONS.map((mission) => {
                const open = missionUnlocked(state.missionsCleared, mission.id)
                const clears = state.missionsCleared[mission.id] ?? 0
                return (
                  <button
                    key={mission.id}
                    type="button"
                    className="btn"
                    disabled={!open}
                    onClick={() => {
                      onFight(mission.id)
                      onClose()
                    }}
                  >
                    {mission.name}
                    <small>
                      {open ? mission.detail : 'Clear the earlier contract first.'} · {mission.glim} glim · {mission.xp} XP
                      {clears ? ` · cleared ${clears}` : ''}
                    </small>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
      {tab === 'upgrades' && (
        <>
          <p>Town Hall {state.townHall.level}. Floors gate buildings, crops, and the people who walk into town.</p>
          {state.townHall.readyAt && next && (
            <>
              <p>
                Raising floor {next.level} · {formatLeft(left)}
              </p>
              <button type="button" className="btn" onClick={() => act((current) => hurryHall(current, Date.now()))}>
                Skip 30s · 1 stardust
              </button>
            </>
          )}
          {!state.townHall.readyAt && next && (
            <button type="button" className="btn primary" onClick={() => act((current) => startTownHall(current, Date.now()))}>
              Raise to Town Hall {next.level} · {next.cost} glim
              <small>
                {formatLeft(hallDuration(state.townHall.level, state))} · {next.unlocks}
              </small>
            </button>
          )}
          {!next && <p>The Town Hall stands at the Gate.</p>}
        </>
      )}
      {tab === 'kingdom' && (
        <div className="lock-card">
          <p className="kicker">Locked</p>
          <h3>Kingdom</h3>
          {state.townHall.level >= KINGDOM_HALL ? (
            <p>Town Hall {KINGDOM_HALL} has opened the road. The kingdom beyond it is still unwritten.</p>
          ) : (
            <p>The kingdom road opens at Town Hall {KINGDOM_HALL}. The gate stays shut until then, and there is no realm behind it yet.</p>
          )}
        </div>
      )}
    </Sheet>
  )
}

export function GoalsSheet({ now, onClose }: { now: number; onClose: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const ready = state.plots.some((plot) => plot.crop === 'radish' && growthOf(plot, state.villagers, now)?.ready)
  const marks = tutorialMarks(state.tutorial, Boolean(ready))
  const taxLeft = state.tax.dueAt > 0 ? state.tax.dueAt - now : 0

  return (
    <Sheet title="Goals" onClose={onClose}>
      <h3>First morning</h3>
      <ol className="marks">
        {marks.map((mark) => (
          <li key={mark.label} data-state={mark.state}>
            {mark.label}
          </li>
        ))}
      </ol>
      <h3>King’s tax</h3>
      <p>
        {Math.min(state.glim, state.tax.goal)}/{state.tax.goal} glim · {state.tax.dueAt > 0 ? formatLeft(taxLeft) : 'starts in the village'}
      </p>
      <button type="button" className="btn primary" onClick={() => act((current) => payTax(current, Date.now()))}>
        Pay the tax
      </button>
      <h3>Today</h3>
      <div className="stack">
        {state.goals.map((goal) => (
          <button key={goal.id} type="button" className="btn" disabled={goal.claimed || goal.progress < goal.target} onClick={() => act((current) => claimGoal(current, goal.id))}>
            {goal.title}
            <small>
              {goal.detail} · {goal.progress}/{goal.target} · {goal.rewardGlim} glim
              {goal.claimed ? ' · claimed' : ''}
            </small>
          </button>
        ))}
      </div>
      <button type="button" className="btn" onClick={() => act(rest)}>
        Rest until dawn
        <small>Refreshes chats, gifts, and orders. Crops keep their real timers.</small>
      </button>
      <p className="fine">Guild contracts live in the Town Hall, under the tallest thatch.</p>
    </Sheet>
  )
}

export function FriendsSheet({ onOpen, onClose }: { onOpen: (id: VillagerId) => void; onClose: () => void }) {
  const { state } = useGame()
  if (!state) return null
  return (
    <Sheet title="Friends" onClose={onClose}>
      <p>The people already in the lanes. Hearts rise from chats, gifts, and plates.</p>
      <div className="stack">
        {state.villagers.map((villager) => {
          const def = VILLAGERS[villager.id]
          return (
            <button key={villager.id} type="button" className="btn" onClick={() => onOpen(villager.id)}>
              {def.name}
              <small>
                {def.title} · {friendTitle(villager.id, villager.friendship)} · {villager.friendship} hearts
                {villager.hired ? ' · hired' : ''}
              </small>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

export function MarketSheet({ onClose }: { onClose: () => void }) {
  const { state, act } = useGame()
  if (!state) return null
  const sellable = (Object.keys(state.inventory) as ItemId[]).filter((id) => {
    const def = itemDef(id)
    return (state.inventory[id] ?? 0) > 0 && def.sell != null
  })
  const materials = (['slime_gel', 'goblin_scrap'] as ItemId[]).filter((id) => (state.inventory[id] ?? 0) > 0)

  return (
    <Sheet title="Market" onClose={onClose}>
      <h3>Seeds</h3>
      <div className="stack">
        {CROP_IDS.map((crop) => {
          const open = cropUnlocked(crop, state.townHall.level)
          return (
            <button key={crop} type="button" className="btn" disabled={!open} onClick={() => act((current) => buySeed(current, crop, 1))}>
              {CROPS[crop].name} seed · {CROPS[crop].seedCost} glim
              <small>{open ? CROPS[crop].blurb : `Town Hall ${CROPS[crop].hall}`}</small>
            </button>
          )
        })}
      </div>
      <h3>Sell</h3>
      <div className="stack">
        {sellable.length === 0 && <p>Harvest or cook something, then bring it here.</p>}
        {sellable.map((id) => {
          const def = itemDef(id)
          const stale = def.kind === 'crop' ? (state.stale[id as CropId] ?? 0) : 0
          const price = priceOf(id, false, state.villagers, state.buildings.inn.level)
          return (
            <button key={id} type="button" className="btn" onClick={() => act((current) => sell(current, id, 1))}>
              Sell {def.name}
              <small>
                {state.inventory[id]} in the bag · {price} glim
                {stale ? ` · ${stale} tired, half price` : ''}
              </small>
            </button>
          )
        })}
      </div>
      {materials.length > 0 && (
        <>
          <h3>Materials</h3>
          <ul className="plain">
            {materials.map((id) => (
              <li key={id}>
                {itemDef(id).name} · {state.inventory[id]}
              </li>
            ))}
          </ul>
          <p className="fine">The forge pays better for these once Town Hall 3 raises it. For now they stay in the bag.</p>
        </>
      )}
    </Sheet>
  )
}

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="How the village works" onClose={onClose}>
      <p>Drag to look around the lanes. Pinch or scroll to come closer. Tap a soil tile, a neighbor, or a building. Move garden turns on the grid so the beds can slide onto clear grass.</p>
      <p>Crops grow on real timers. Watering shortens them. Leave a crop for twice its time and it tires, selling for half and still cooking fine.</p>
      <p>The inn cooks the first dishes. Friends pay glim and hearts for the plate they asked for. The Town Hall guild sends you into short battles.</p>
      <p>Level and the tax live in the top bar. Goals, Friends, and Market live along the bottom.</p>
    </Sheet>
  )
}
