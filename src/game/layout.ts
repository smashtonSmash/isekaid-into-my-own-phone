import type { BuildingId, VillagerId } from './types.ts'

/** Square town grid. Buildings, paths, water, flowers, and the garden all occupy these cells. */
export const TILE = 48
export const COLS = 22
export const ROWS = 16
export const GARDEN_W = 6
export const GARDEN_H = 6
/** Cursor sits on this cell inside the beds, so a tap aims at the middle of the plot. */
export const GARDEN_ANCHOR = { x: Math.floor(GARDEN_W / 2), y: Math.floor(GARDEN_H / 2) }
export const DEFAULT_GARDEN = { x: 5, y: 10 }

export type CellTerrain = 'grass' | 'path' | 'water' | 'flower'

export type FootprintId = BuildingId | 'hall' | 'market'

export type Footprint = {
  id: FootprintId
  label: string
  x: number
  y: number
  w: number
  h: number
}

export const FOOTPRINTS: Footprint[] = [
  { id: 'hall', label: 'Town Hall', x: 1, y: 2, w: 4, h: 3 },
  { id: 'house', label: 'Cottage', x: 8, y: 2, w: 3, h: 3 },
  { id: 'market', label: 'Market', x: 13, y: 3, w: 2, h: 2 },
  { id: 'inn', label: 'Inn', x: 17, y: 2, w: 4, h: 3 },
  { id: 'barn', label: 'Barn', x: 1, y: 8, w: 3, h: 2 },
  { id: 'garden', label: 'Shed', x: 13, y: 8, w: 2, h: 2 },
  { id: 'cafe', label: 'Café', x: 17, y: 8, w: 3, h: 2 },
]

export const NPC_HOME: Record<VillagerId, { x: number; y: number }> = {
  miri: { x: 6, y: 9 },
  lumi: { x: 7, y: 6 },
  elowen: { x: 16, y: 6 },
  garrick: { x: 9, y: 5 },
  aldric: { x: 5, y: 6 },
  rokha: { x: 3, y: 6 },
  lila: { x: 18, y: 6 },
  ren: { x: 18, y: 7 },
  hana: { x: 12, y: 9 },
  theo: { x: 15, y: 8 },
  kenji: { x: 4, y: 9 },
}

const FLOWERS: readonly [number, number][] = [
  [6, 4],
  [15, 3],
  [20, 5],
  [0, 4],
  [7, 1],
  [14, 1],
]

function buildTerrain(): CellTerrain[] {
  const cells: CellTerrain[] = Array.from({ length: COLS * ROWS }, () => 'grass')
  const put = (x: number, y: number, terrain: CellTerrain) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return
    cells[y * COLS + x] = terrain
  }
  for (let x = 0; x < COLS; x += 1) put(x, 6, 'path')
  for (let y = 1; y <= 6; y += 1) put(11, y, 'path')
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 3; x += 1) put(x, y, 'water')
  }
  for (const [x, y] of FLOWERS) put(x, y, 'flower')
  return cells
}

const TERRAIN = buildTerrain()

export function terrainAt(x: number, y: number): CellTerrain | null {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null
  return TERRAIN[y * COLS + x] ?? null
}

export function footprintAt(x: number, y: number): Footprint | null {
  return FOOTPRINTS.find((spot) => x >= spot.x && y >= spot.y && x < spot.x + spot.w && y < spot.y + spot.h) ?? null
}

export function plotIndexAt(originX: number, originY: number, x: number, y: number): number | null {
  const lx = x - originX
  const ly = y - originY
  if (lx < 0 || ly < 0 || lx >= GARDEN_W || ly >= GARDEN_H) return null
  return ly * GARDEN_W + lx
}

/** The beds slide only onto open grass, clear of paths, water, flowers, and buildings. */
export function gardenFits(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + GARDEN_W > COLS || y + GARDEN_H > ROWS) return false
  for (let ly = 0; ly < GARDEN_H; ly += 1) {
    for (let lx = 0; lx < GARDEN_W; lx += 1) {
      if (terrainAt(x + lx, y + ly) !== 'grass') return false
      if (footprintAt(x + lx, y + ly)) return false
    }
  }
  return true
}

export function walkable(x: number, y: number, garden: { x: number; y: number }): boolean {
  const terrain = terrainAt(x, y)
  if (terrain !== 'grass' && terrain !== 'path') return false
  if (footprintAt(x, y)) return false
  if (plotIndexAt(garden.x, garden.y, x, y) != null) return false
  return true
}
