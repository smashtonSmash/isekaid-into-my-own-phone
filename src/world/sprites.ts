import hallUrl from '../assets/buildings/hall.webp'
import innUrl from '../assets/buildings/inn.webp'
import elowenBack from '../assets/sprites/elowen-back.webp'
import elowenFront from '../assets/sprites/elowen-front.webp'
import elowenLeft from '../assets/sprites/elowen-left.webp'
import elowenRight from '../assets/sprites/elowen-right.webp'
import rokhaBack from '../assets/sprites/rokha-back.webp'
import rokhaFront from '../assets/sprites/rokha-front.webp'
import rokhaLeft from '../assets/sprites/rokha-left.webp'
import rokhaRight from '../assets/sprites/rokha-right.webp'
import type { FootprintId } from '../game/layout.ts'

/** Screen facing. North is up the screen, so up shows the back and down shows the front. */
export type Facing = 'front' | 'back' | 'left' | 'right'

/** Front-facing 3/4 paintings. The base of each image is the south edge of the footprint. */
export const BUILDING_ART: Partial<Record<FootprintId, string>> = {
  hall: hallUrl,
  inn: innUrl,
}

/**
 * Elowen's sheet is the transparent v2 PNG, sliced front, back, left, right.
 * Side frames show one braid. Rokha's sheet order is front, right, back, left.
 */
export const CHARACTER_SPRITES: Record<'elowen' | 'rokha', Record<Facing, string>> = {
  elowen: { front: elowenFront, back: elowenBack, left: elowenLeft, right: elowenRight },
  rokha: { front: rokhaFront, back: rokhaBack, left: rokhaLeft, right: rokhaRight },
}

export function facingFromStep(dx: number, dy: number, current: Facing): Facing {
  if (dx === 0 && dy === 0) return current
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'front' : 'back'
}
