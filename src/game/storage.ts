import type { GameState } from './types.ts'
import { SAVE_KEY, SAVE_VERSION } from './types.ts'

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const data = value as GameState
  return (
    data.version === SAVE_VERSION &&
    typeof data.playerName === 'string' &&
    typeof data.level === 'number' &&
    typeof data.glim === 'number' &&
    Array.isArray(data.plots) &&
    data.plots.length === 36 &&
    typeof data.garden?.x === 'number' &&
    typeof data.garden?.y === 'number' &&
    Array.isArray(data.villagers) &&
    Array.isArray(data.goals) &&
    data.dating === null &&
    typeof data.townHall?.level === 'number' &&
    typeof data.tax?.goal === 'number' &&
    typeof data.tutorial === 'string' &&
    typeof data.buildings?.house?.level === 'number'
  )
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isGameState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Ignore locked storage. The in-memory day is already gone.
  }
}
