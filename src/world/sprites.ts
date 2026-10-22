import elowenBack from '../assets/sprites/elowen-back.webp'
import elowenFront from '../assets/sprites/elowen-front.webp'
import elowenLeft from '../assets/sprites/elowen-left.webp'
import elowenRight from '../assets/sprites/elowen-right.webp'
import rokhaBack from '../assets/sprites/rokha-back.webp'
import rokhaFront from '../assets/sprites/rokha-front.webp'
import rokhaLeft from '../assets/sprites/rokha-left.webp'
import rokhaRight from '../assets/sprites/rokha-right.webp'

/** Screen facing. North is up the screen, so up shows the back and down shows the front. */
export type Facing = 'front' | 'back' | 'left' | 'right'

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
