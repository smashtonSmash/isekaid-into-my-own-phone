import { useState } from 'react'
import {
  BUILDINGS,
  CROPS,
  CROP_IDS,
  GUILD_MASTER,
  KINGDOM_HALL,
  RECIPES,
  VILLAGERS,
  buildingDuration,
  cropUnlocked,
  hallDuration,
  dialogueFor,
  growthOf,
  itemDef,
  nextHall,
  nextTier,
} from '../game/data.ts'
import {
  cook,
  gift,
  harvest,
  hire,
  hurryBuilding,
  hurryHall,
  hurryPlot,
  plant,
  till,
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
import type { BuildingId, ItemId, VillagerId } from '../game/types.ts'
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
  onAdventure,
}: {
  now: number
  onClose: () => void
  onAdventure: () => void
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
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onAdventure()
              onClose()
            }}
          >
            Open the Adventure map
            <small>The guild contracts and the battles live on that road.</small>
          </button>
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

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="How the village works" onClose={onClose}>
      <p>Hold the phone upright. Drag the village in any direction, and pinch or scroll to come closer. Tap a soil tile, a neighbor, or a building. The hammer on the right turns on the grid so the beds can slide onto clear grass.</p>
      <p>Crops grow on real timers. Watering shortens them. Leave a crop for twice its time and it tires, selling for half and still cooking fine.</p>
      <p>The inn cooks the first dishes. Friends pay glim and hearts for the plate they asked for. Guild contracts are on the Adventure tab, and the Town Hall still points at that road.</p>
      <p>Your name, level, glim, and stardust sit in the top bar, with the tax on the name plate. Home keeps the day’s goals. Storage is the bag and the seed stall.</p>
    </Sheet>
  )
}
