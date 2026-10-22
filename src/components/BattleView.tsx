import { useEffect, useRef, useState } from 'react'
import { playerTurn, startBattle, type Battle, type BattleCommand } from '../game/battle.ts'
import { ENEMIES, MISSIONS } from '../game/data.ts'
import { claimVictory, spendCrop } from '../game/engine.ts'
import type { CropId, MissionId } from '../game/types.ts'
import { useGame } from '../game/useGame.ts'

export function BattleView({ missionId, onClose }: { missionId: MissionId; onClose: () => void }) {
  const { state, act } = useGame()
  const [battle, setBattle] = useState<Battle | null>(null)
  const [target, setTarget] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const rng = useRef(() => Math.random())
  const mission = MISSIONS.find((item) => item.id === missionId)

  useEffect(() => {
    if (!state) return
    const next = startBattle(state, missionId)
    setBattle(next)
    if (next) {
      const first = next.units.findIndex((unit) => unit.side === 'enemy')
      if (first >= 0) setTarget(first)
    }
    // The party is snapshotted when the contract opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId])

  if (!state || !battle || !mission) return null

  const play = (command: BattleCommand) => {
    if (battle.result !== 'fight' || busy) return
    if (command.type === 'item' && command.item !== 'ration' && (state.inventory[command.item] ?? 0) < 1) {
      setNote(`No ${command.item} in the bag.`)
      return
    }
    const outcome = playerTurn(battle, command, rng.current)
    if (outcome.error) {
      setNote(outcome.error)
      return
    }
    setNote(null)
    if (outcome.spent) {
      const eaten = outcome.spent
      act((current) => spendCrop(current, eaten))
    }
    setBattle(outcome.battle)
  }

  const collect = () => {
    if (busy) return
    setBusy(true)
    act((current) => claimVictory(current, missionId))
    onClose()
  }

  const retry = () => {
    const next = startBattle(state, missionId)
    setBattle(next)
    setNote(null)
  }

  return (
    <div className="battle-back">
      <section className="battle" role="dialog" aria-label={mission.name}>
        <header className="battle-head">
          <div>
            <p className="kicker">Guild contract</p>
            <h2>{mission.name}</h2>
          </div>
          <button type="button" className="text-btn" onClick={onClose}>
            Retreat
          </button>
        </header>
        <div className="battle-lanes">
          <div className="lane">
            <p className="kicker">Your side</p>
            {battle.units
              .filter((unit) => unit.side === 'party')
              .map((unit) => (
                <Fighter key={unit.key} name={unit.name} hp={unit.hp} max={unit.maxHp} tint="#f4a05a" guard={unit.guard} />
              ))}
          </div>
          <div className="lane">
            <p className="kicker">The lane</p>
            {battle.units.map((unit, index) =>
              unit.side === 'enemy' ? (
                <button
                  key={unit.key}
                  type="button"
                  className={`fighter-btn ${target === index ? 'selected' : ''}`}
                  onClick={() => setTarget(index)}
                >
                  <Fighter
                    name={unit.name}
                    hp={unit.hp}
                    max={unit.maxHp}
                    tint={unit.name.includes('Goblin') ? ENEMIES.goblin.tint : ENEMIES.slime.tint}
                  />
                </button>
              ) : null,
            )}
          </div>
        </div>
        <p className="battle-log">{note ?? battle.log[battle.log.length - 1]}</p>
        {battle.result === 'fight' && (
          <div className="battle-commands">
            <button type="button" className="btn primary" onClick={() => play({ type: 'attack', target })}>
              Attack
            </button>
            <button
              type="button"
              className="btn"
              disabled={battle.units.find((unit) => unit.key === 'player')?.skillCd !== 0}
              onClick={() => play({ type: 'skill', target })}
            >
              Skill
            </button>
            <button type="button" className="btn" onClick={() => play({ type: 'defend' })}>
              Defend
            </button>
            <ItemMenu
              rations={battle.rations}
              radish={state.inventory.radish ?? 0}
              turnip={state.inventory.turnip ?? 0}
              onPick={(item) => play({ type: 'item', item })}
            />
          </div>
        )}
        {battle.result === 'won' && (
          <div className="battle-end">
            <p>
              {(state.missionsCleared[missionId] ?? 0) > 0 ? Math.ceil(mission.glim / 2) : mission.glim} glim ·{' '}
              {(state.missionsCleared[missionId] ?? 0) > 0 ? Math.ceil(mission.xp / 2) : mission.xp} XP
              {(state.missionsCleared[missionId] ?? 0) === 0 && mission.stardust ? ` · ${mission.stardust} stardust` : ''} ·{' '}
              {mission.materials.map((material) => material.id.replace('_', ' ')).join(', ')}
            </p>
            <button type="button" className="btn primary big" onClick={collect}>
              Collect
            </button>
          </div>
        )}
        {battle.result === 'lost' && (
          <div className="battle-end">
            <button type="button" className="btn primary" onClick={retry}>
              Try again
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Back to the square
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function Fighter({ name, hp, max, tint, guard = false }: { name: string; hp: number; max: number; tint: string; guard?: boolean }) {
  const pct = Math.max(0, Math.round((hp / Math.max(1, max)) * 100))
  return (
    <div className="fighter">
      <div className="fighter-top">
        <strong>{name}</strong>
        <span>
          {hp}/{max}
          {guard ? ' · guard' : ''}
        </span>
      </div>
      <div className="hp">
        <span style={{ width: `${pct}%`, background: tint }} />
      </div>
    </div>
  )
}

function ItemMenu({
  rations,
  radish,
  turnip,
  onPick,
}: {
  rations: number
  radish: number
  turnip: number
  onPick: (item: 'ration' | CropId) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="item-menu">
      <button type="button" className="btn" onClick={() => setOpen((value) => !value)}>
        Item
      </button>
      {open && (
        <div className="item-pop">
          <button type="button" className="btn tiny" disabled={rations <= 0} onClick={() => onPick('ration')}>
            Ration {rations}
          </button>
          <button type="button" className="btn tiny" disabled={radish <= 0} onClick={() => onPick('radish')}>
            Radish {radish}
          </button>
          <button type="button" className="btn tiny" disabled={turnip <= 0} onClick={() => onPick('turnip')}>
            Turnip {turnip}
          </button>
        </div>
      )}
    </div>
  )
}
