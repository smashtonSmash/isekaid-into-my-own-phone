import { createContext, useContext } from 'react'
import type { ActionResult, GameState } from './types.ts'

export type Toast = { text: string; ok: boolean }

export type GameApi = {
  state: GameState | null
  playing: boolean
  toast: Toast | null
  startNew: (name: string) => void
  continueGame: () => void
  finishIntro: () => void
  lockPhone: () => void
  abandon: () => void
  dismissToast: () => void
  act: (fn: (state: GameState) => ActionResult) => void
}

export const GameContext = createContext<GameApi | null>(null)

export function useGame(): GameApi {
  const api = useContext(GameContext)
  if (!api) throw new Error('useGame must be used inside GameProvider')
  return api
}
