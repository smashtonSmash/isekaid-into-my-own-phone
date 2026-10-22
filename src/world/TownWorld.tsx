import { useEffect, useRef, useState } from 'react'
import { VILLAGERS, growthOf } from '../game/data.ts'
import {
  COLS,
  FOOTPRINTS,
  GARDEN_ANCHOR,
  GARDEN_H,
  GARDEN_W,
  NPC_HOME,
  ROWS,
  TILE,
  footprintAt,
  gardenFits,
  plotIndexAt,
  terrainAt,
  walkable,
  type FootprintId,
} from '../game/layout.ts'
import type { CropId, GameState, VillagerId } from '../game/types.ts'
import type { WorldPick } from './pick.ts'
import { BUILDING_ART, CHARACTER_SPRITES, facingFromStep, type Facing } from './sprites.ts'

type Actor = { id: VillagerId; x: number; y: number; facing: Facing }

const CROP_EMOJI: Partial<Record<CropId, string>> = {
  tomato: '🍅',
  pumpkin: '🎃',
  carrot: '🥕',
  wheat: '🌾',
  cabbage: '🥬',
  strawberry: '🍓',
  watermelon: '🍉',
  sunflower: '🌻',
}

const DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function grassTone(x: number, y: number): string {
  const tones = ['#7ec850', '#8ed45c', '#74be48', '#86cc58', '#6fb844']
  return tones[(x * 3 + y * 5) % tones.length] ?? '#7ec850'
}

function nearestWalk(x: number, y: number, garden: { x: number; y: number }): { x: number; y: number } {
  if (walkable(x, y, garden)) return { x, y }
  for (let radius = 1; radius < 8; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (walkable(x + dx, y + dy, garden)) return { x: x + dx, y: y + dy }
      }
    }
  }
  return { x, y }
}

function stepActor(actor: Actor, garden: { x: number; y: number }): Actor {
  const here = walkable(actor.x, actor.y, garden) ? actor : { ...actor, ...nearestWalk(actor.x, actor.y, garden) }
  const options = DIRS.filter(([dx, dy]) => walkable(here.x + dx, here.y + dy, garden))
  if (options.length === 0 || Math.random() < 0.35) return here
  const pick = options[Math.floor(Math.random() * options.length)] ?? [0, 0]
  const dx = pick[0] ?? 0
  const dy = pick[1] ?? 0
  return {
    id: here.id,
    x: here.x + dx,
    y: here.y + dy,
    facing: facingFromStep(dx, dy, here.facing),
  }
}

function stageOf(fraction: number, ready: boolean, stale: boolean): 'sprout' | 'leaf' | 'ready' | 'tired' {
  if (stale) return 'tired'
  if (ready) return 'ready'
  if (fraction < 0.34) return 'sprout'
  return 'leaf'
}

function Structure({
  id,
  label,
  x,
  y,
  w,
  h,
  level,
  busy,
}: {
  id: FootprintId
  label: string
  x: number
  y: number
  w: number
  h: number
  level: number
  busy: boolean
}) {
  const art = BUILDING_ART[id]
  return (
    <div
      className={`structure ${id} ${level < 1 ? 'staked' : ''} ${busy ? 'busy' : ''}`}
      style={{ left: x * TILE, top: y * TILE, width: w * TILE, height: h * TILE }}
    >
      {art && <img src={art} alt="" />}
      {!art && (
        <span className="block">
          <i className="roof" />
          <i className="wall" />
        </span>
      )}
      <span className="structure-name">{busy ? `${label} · raising` : label}</span>
    </div>
  )
}

export function TownWorld({
  state,
  now,
  focus,
  placing,
  onPick,
  onMoveGarden,
}: {
  state: GameState
  now: number
  focus: WorldPick | null
  placing: boolean
  onPick: (pick: WorldPick) => void
  onMoveGarden: (x: number, y: number) => void
}) {
  const viewRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [cam, setCam] = useState({ x: 40, y: -80, scale: 0.78 })
  const camRef = useRef(cam)
  camRef.current = cam
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [actors, setActors] = useState<Actor[]>(() =>
    state.villagers.map((villager) => ({
      id: villager.id,
      x: NPC_HOME[villager.id].x,
      y: NPC_HOME[villager.id].y,
      facing: 'front' as Facing,
    })),
  )
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; camX: number; camY: number; moved: boolean } | null>(null)
  const pinch = useRef<{ dist: number; scale: number; x: number; y: number; px: number; py: number } | null>(null)

  const roster = state.villagers.map((villager) => villager.id).join(',')
  useEffect(() => {
    const ids = roster.split(',').filter(Boolean) as VillagerId[]
    setActors((prev) => {
      const kept = prev.filter((actor) => ids.includes(actor.id))
      for (const id of ids) {
        if (!kept.some((actor) => actor.id === id)) {
          kept.push({ id, x: NPC_HOME[id].x, y: NPC_HOME[id].y, facing: 'front' })
        }
      }
      return kept
    })
  }, [roster])

  useEffect(() => {
    const id = window.setInterval(() => {
      setActors((prev) => prev.map((actor) => stepActor(actor, state.garden)))
    }, 560)
    return () => window.clearInterval(id)
  }, [state.garden])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const scale = 0.78
    const gx = (state.garden.x + GARDEN_W / 2) * TILE
    const gy = (state.garden.y + 1) * TILE
    setCam({
      scale,
      x: view.clientWidth * 0.42 - gx * scale,
      y: view.clientHeight * 0.58 - gy * scale,
    })
    // Frame the beds once. Later pans belong to the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const current = camRef.current
      const next = Math.min(1.85, Math.max(0.45, current.scale * (event.deltaY > 0 ? 0.92 : 1.08)))
      const rect = view.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const k = next / current.scale
      setCam({ scale: next, x: px - (px - current.x) * k, y: py - (py - current.y) * k })
    }
    view.addEventListener('wheel', onWheel, { passive: false })
    return () => view.removeEventListener('wheel', onWheel)
  }, [])

  const tileFromClient = (clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * COLS)
    const y = Math.floor(((clientY - rect.top) / rect.height) * ROWS)
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null
    return { x, y }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const a = pts[0]
      const b = pts[1]
      if (!a || !b || !viewRef.current) return
      const rect = viewRef.current.getBoundingClientRect()
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: camRef.current.scale,
        x: camRef.current.x,
        y: camRef.current.y,
        px: (a.x + b.x) / 2 - rect.left,
        py: (a.y + b.y) / 2 - rect.top,
      }
      drag.current = null
      return
    }
    drag.current = { x: event.clientX, y: event.clientY, camX: camRef.current.x, camY: camRef.current.y, moved: false }
    pinch.current = null
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointers.current.get(event.pointerId)
    if (point) {
      point.x = event.clientX
      point.y = event.clientY
    }
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const a = pts[0]
      const b = pts[1]
      if (!a || !b) return
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const next = Math.min(1.85, Math.max(0.45, pinch.current.scale * (dist / pinch.current.dist)))
      const k = next / pinch.current.scale
      setCam({
        scale: next,
        x: pinch.current.px - (pinch.current.px - pinch.current.x) * k,
        y: pinch.current.py - (pinch.current.py - pinch.current.y) * k,
      })
      return
    }
    if (drag.current) {
      const dx = event.clientX - drag.current.x
      const dy = event.clientY - drag.current.y
      if (Math.hypot(dx, dy) > 12) drag.current.moved = true
      setCam({ ...camRef.current, x: drag.current.camX + dx, y: drag.current.camY + dy })
      return
    }
    setHover(tileFromClient(event.clientX, event.clientY))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const moved = drag.current?.moved ?? false
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (moved || pointers.current.size > 0) return
    const tile = tileFromClient(event.clientX, event.clientY)
    if (!tile) return
    if (placing) {
      onMoveGarden(tile.x - GARDEN_ANCHOR.x, tile.y - GARDEN_ANCHOR.y)
      return
    }
    const actor =
      actors.find((item) => item.x === tile.x && item.y === tile.y) ??
      actors.find((item) => item.x === tile.x && item.y === tile.y + 1)
    if (actor) {
      onPick({ kind: 'villager', id: actor.id })
      return
    }
    const plot = plotIndexAt(state.garden.x, state.garden.y, tile.x, tile.y)
    if (plot != null) {
      onPick({ kind: 'plot', index: plot })
      return
    }
    const spot = footprintAt(tile.x, tile.y)
    if (!spot) return
    if (spot.id === 'hall') onPick({ kind: 'hall' })
    else if (spot.id === 'market') onPick({ kind: 'market' })
    else onPick({ kind: 'building', id: spot.id })
  }

  const selected = new Set<string>()
  if (focus?.kind === 'plot') {
    const lx = focus.index % GARDEN_W
    const ly = Math.floor(focus.index / GARDEN_W)
    selected.add(`${state.garden.x + lx},${state.garden.y + ly}`)
  } else if (focus?.kind === 'villager') {
    const actor = actors.find((item) => item.id === focus.id)
    if (actor) selected.add(`${actor.x},${actor.y}`)
  } else if (focus) {
    const id: FootprintId = focus.kind === 'hall' ? 'hall' : focus.kind === 'market' ? 'market' : focus.id
    const spot = FOOTPRINTS.find((item) => item.id === id)
    if (spot) {
      for (let y = spot.y; y < spot.y + spot.h; y += 1) {
        for (let x = spot.x; x < spot.x + spot.w; x += 1) selected.add(`${x},${y}`)
      }
    }
  }

  const ghost = hover ? { x: hover.x - GARDEN_ANCHOR.x, y: hover.y - GARDEN_ANCHOR.y } : null
  const ghostOk = ghost ? gardenFits(ghost.x, ghost.y) : false

  return (
    <div
      className={`map-view ${placing ? 'placing' : ''}`}
      ref={viewRef}
      role="application"
      aria-label="Village tile map"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="map-stage"
        ref={stageRef}
        style={{
          width: COLS * TILE,
          height: ROWS * TILE,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
        }}
      >
        {TERRAIN_CELLS.map((cell) => (
          <div
            key={cell.key}
            className={`tile ${cell.terrain}`}
            data-tile={`${cell.x},${cell.y}`}
            style={{ left: cell.x * TILE + 1, top: cell.y * TILE + 1, background: cell.background }}
          />
        ))}
        {state.plots.map((plot, index) => {
          const x = state.garden.x + (index % GARDEN_W)
          const y = state.garden.y + Math.floor(index / GARDEN_W)
          const growth = plot.crop ? growthOf(plot, state.villagers, now) : null
          const stage = growth ? stageOf(growth.fraction, growth.ready, growth.stale) : null
          const emoji = plot.crop ? CROP_EMOJI[plot.crop] : undefined
          return (
            <div key={`soil-${index}`} className={`tile soil ${plot.tilled ? 'tilled' : ''} ${plot.crop ?? ''}`} style={{ left: x * TILE + 1, top: y * TILE + 1 }}>
              {plot.crop && stage && (emoji && stage !== 'sprout' ? <span className={`glyph ${stage}`}>{emoji}</span> : <i className={`plant ${stage} ${plot.crop}`} />)}
            </div>
          )
        })}
        {FOOTPRINTS.map((spot) => {
          const built = spot.id === 'hall' || spot.id === 'market' ? { level: 1, busy: spot.id === 'hall' && state.townHall.readyAt != null } : { level: state.buildings[spot.id].level, busy: state.buildings[spot.id].readyAt != null }
          return <Structure key={spot.id} {...spot} level={built.level} busy={built.busy} />
        })}
        {actors.map((actor) => {
          const sheet = actor.id === 'elowen' || actor.id === 'rokha' ? CHARACTER_SPRITES[actor.id] : null
          const look = VILLAGERS[actor.id].look
          return (
            <div key={actor.id} className={`actor face-${actor.facing}`} style={{ left: actor.x * TILE, top: actor.y * TILE }} data-actor={actor.id} data-facing={actor.facing}>
              {sheet ? <img src={sheet[actor.facing]} alt="" /> : (
                <span className="token" style={{ background: look.cloth }}>
                  <b style={{ background: look.hair }} />
                  <i style={{ background: look.skin }} />
                </span>
              )}
            </div>
          )
        })}
        {hover && <div className="tile-mark hover" style={{ left: hover.x * TILE, top: hover.y * TILE }} />}
        {[...selected].map((key) => {
          const [x, y] = key.split(',').map(Number)
          return <div key={`sel-${key}`} className="tile-mark selected" style={{ left: (x ?? 0) * TILE, top: (y ?? 0) * TILE }} />
        })}
        {placing && ghost && (
          <div
            className={`garden-ghost ${ghostOk ? 'ok' : 'bad'}`}
            style={{ left: ghost.x * TILE, top: ghost.y * TILE, width: GARDEN_W * TILE, height: GARDEN_H * TILE }}
          />
        )}
        {placing && <div className="map-grid" />}
      </div>
    </div>
  )
}

const TERRAIN_CELLS = Array.from({ length: COLS * ROWS }, (_, index) => {
  const x = index % COLS
  const y = Math.floor(index / COLS)
  const terrain = terrainAt(x, y) ?? 'grass'
  const background = terrain === 'grass' ? grassTone(x, y) : undefined
  return { key: `${x},${y}`, x, y, terrain, background }
})
