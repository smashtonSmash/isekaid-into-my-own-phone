import type { BuildingId, VillagerId } from '../game/types.ts'

export type WorldPick =
  | { kind: 'plot'; index: number }
  | { kind: 'villager'; id: VillagerId }
  | { kind: 'hall' }
  | { kind: 'market' }
  | { kind: 'building'; id: BuildingId }
