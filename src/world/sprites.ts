import elowenBack from '../assets/sprites/elowen-back.png'
import elowenFront from '../assets/sprites/elowen-front.png'
import elowenLeft from '../assets/sprites/elowen-left.png'
import elowenRight from '../assets/sprites/elowen-right.png'
import rokhaBack from '../assets/sprites/rokha-back.png'
import rokhaFront from '../assets/sprites/rokha-front.png'
import rokhaLeft from '../assets/sprites/rokha-left.png'
import rokhaRight from '../assets/sprites/rokha-right.png'
import hallUrl from '../assets/buildings/hall.png'
import innUrl from '../assets/buildings/inn.png'
import type { FootprintId } from '../game/layout.ts'

/** Screen facing. Down the map is front, up is back. */
export type Facing = 'front' | 'back' | 'left' | 'right'

/**
 * Elowen's sheet is the transparent v2 PNG: front, back, left, right.
 * Side frames show one braid. The older two-braid JPG is not used.
 * Rokha's sheet order is front, right, back, left.
 */
export const CHARACTER_SPRITES: Record<'elowen' | 'rokha', Record<Facing, string>> = {
  elowen: { front: elowenFront, back: elowenBack, left: elowenLeft, right: elowenRight },
  rokha: { front: rokhaFront, back: rokhaBack, left: rokhaLeft, right: rokhaRight },
}

export const BUILDING_ART: Partial<Record<FootprintId, string>> = {
  hall: hallUrl,
  inn: innUrl,
}

export function facingFromStep(dx: number, dy: number, current: Facing): Facing {
  if (dx === 0 && dy === 0) return current
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'front' : 'back'
}
