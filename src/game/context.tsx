import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createGame, enterTown, sync } from './engine.ts'
import { clearGame, loadGame, saveGame } from './storage.ts'
import type { ActionResult, GameState } from './types.ts'
import { GameContext, type Toast } from './useGame.ts'

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(() => loadGame())
  const [playing, setPlaying] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const stateRef = useRef(state)
  const saveWarned = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!state) return
    const saved = saveGame(state)
    if (!saved && !saveWarned.current) {
      saveWarned.current = true
      setToast({ ok: false, text: 'This browser blocked saving. The village lasts until you close the tab.' })
    }
  }, [state])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(id)
  }, [toast])

  const act = useCallback((fn: (current: GameState) => ActionResult) => {
    const current = stateRef.current
    if (!current) return
    const result = fn(current)
    if (result.ok) {
      stateRef.current = result.state
      setState(result.state)
    }
    if (result.message) setToast({ text: result.message, ok: result.ok })
  }, [])

  useEffect(() => {
    if (!playing || !state?.introSeen) return
    const catchUp = () => {
      const current = stateRef.current
      if (!current) return
      const next = sync(current, Date.now())
      if (next === current) return
      stateRef.current = next
      setState(next)
      if (next.log[0] && next.log[0] !== current.log[0]) setToast({ ok: true, text: next.log[0] })
    }
    catchUp()
    const id = window.setInterval(catchUp, 1000)
    document.addEventListener('visibilitychange', catchUp)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', catchUp)
    }
  }, [playing, state?.introSeen])

  const startNew = useCallback((name: string) => {
    const next = createGame(name)
    stateRef.current = next
    setState(next)
    setPlaying(true)
  }, [])

  const continueGame = useCallback(() => {
    const current = stateRef.current
    if (!current) return
    const next = sync(current, Date.now())
    stateRef.current = next
    setState(next)
    setPlaying(true)
  }, [])

  const finishIntro = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const next = enterTown(prev, Date.now())
      stateRef.current = next
      return next
    })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])
  const lockPhone = useCallback(() => setPlaying(false), [])

  const abandon = useCallback(() => {
    clearGame()
    stateRef.current = null
    setState(null)
    setPlaying(false)
    setToast(null)
  }, [])

  return (
    <GameContext.Provider value={{ state, playing, toast, startNew, continueGame, finishIntro, lockPhone, abandon, dismissToast, act }}>
      {children}
    </GameContext.Provider>
  )
}
