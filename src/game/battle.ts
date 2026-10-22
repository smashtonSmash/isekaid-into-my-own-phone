import { ENEMIES, MISSIONS, VILLAGERS, playerCombat } from './data.ts'
import type { CropId, GameState, MissionId } from './types.ts'

export type Combatant = {
  key: string
  name: string
  side: 'party' | 'enemy'
  hp: number
  maxHp: number
  atk: number
  def: number
  guard: boolean
  skillCd: number
}

export type BattleCommand =
  | { type: 'attack'; target: number }
  | { type: 'skill'; target: number }
  | { type: 'defend' }
  | { type: 'item'; item: 'ration' | CropId }

export type Battle = {
  missionId: MissionId
  units: Combatant[]
  rations: number
  log: string[]
  result: 'fight' | 'won' | 'lost'
}

export type TurnOutcome = {
  battle: Battle
  spent: CropId | null
  error: string | null
}

function living(units: Combatant[], side: Combatant['side']): Combatant[] {
  return units.filter((unit) => unit.side === side && unit.hp > 0)
}

function strike(atk: number, def: number, rng: () => number, mult = 1): number {
  const spread = 0.9 + rng() * 0.2
  return Math.max(1, Math.round(atk * mult * spread - def * 0.45))
}

function hurt(units: Combatant[], key: string, amount: number): Combatant[] {
  return units.map((unit) => {
    if (unit.key !== key || unit.hp <= 0) return unit
    const taken = unit.guard ? Math.max(1, Math.ceil(amount * 0.5)) : amount
    return { ...unit, hp: Math.max(0, unit.hp - taken), guard: false }
  })
}

function heal(units: Combatant[], key: string, amount: number): Combatant[] {
  return units.map((unit) => (unit.key === key ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + amount) } : unit))
}

function firstLiving(units: Combatant[], side: Combatant['side'], prefer: number | null): Combatant | undefined {
  if (prefer != null) {
    const unit = units[prefer]
    if (unit && unit.side === side && unit.hp > 0) return unit
  }
  return units.find((unit) => unit.side === side && unit.hp > 0)
}

export function startBattle(state: GameState, missionId: MissionId): Battle | null {
  const mission = MISSIONS.find((item) => item.id === missionId)
  if (!mission) return null
  const stats = playerCombat(state.level)
  const units: Combatant[] = [
    {
      key: 'player',
      name: state.playerName,
      side: 'party',
      hp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      guard: false,
      skillCd: 0,
    },
  ]
  for (const villager of state.villagers.filter((item) => item.hired).slice(0, 2)) {
    const def = VILLAGERS[villager.id]
    units.push({
      key: villager.id,
      name: def.name,
      side: 'party',
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: 2,
      guard: false,
      skillCd: 0,
    })
  }
  mission.enemies.forEach((kind, index) => {
    const enemy = ENEMIES[kind]
    units.push({
      key: `${kind}-${index}`,
      name: mission.enemies.length > 1 ? `${enemy.name} ${index + 1}` : enemy.name,
      side: 'enemy',
      hp: enemy.hp,
      maxHp: enemy.hp,
      atk: enemy.atk,
      def: enemy.def,
      guard: false,
      skillCd: 0,
    })
  })
  return { missionId, units, rations: 2, log: ['The lane goes quiet. Your turn.'], result: 'fight' }
}

export function playerTurn(battle: Battle, command: BattleCommand, rng: () => number): TurnOutcome {
  if (battle.result !== 'fight') return { battle, spent: null, error: 'The fight is over.' }
  let units = battle.units.map((unit) => ({ ...unit }))
  const player = units.find((unit) => unit.key === 'player')
  if (!player || player.hp <= 0) return { battle: { ...battle, result: 'lost' }, spent: null, error: null }

  let rations = battle.rations
  let spent: CropId | null = null
  let log = battle.log
  const note = (line: string) => {
    log = [...log, line].slice(-8)
  }
  const preferred = command.type === 'attack' || command.type === 'skill' ? command.target : null

  if (command.type === 'attack' || command.type === 'skill') {
    if (command.type === 'skill' && player.skillCd > 0) {
      return { battle, spent: null, error: 'Signal Burst is still warm.' }
    }
    const enemy = firstLiving(units, 'enemy', preferred)
    if (!enemy) return { battle: { ...battle, units, log, result: 'won' }, spent: null, error: null }
    const amount = strike(player.atk, enemy.def, rng, command.type === 'skill' ? 1.75 : 1)
    units = hurt(units, enemy.key, amount)
    if (command.type === 'skill') {
      units = units.map((unit) => (unit.key === 'player' ? { ...unit, skillCd: 1 } : unit))
      note(`${player.name} uses Signal Burst for ${amount}.`)
    } else {
      note(`${player.name} hits ${enemy.name} for ${amount}.`)
    }
  } else if (command.type === 'defend') {
    units = heal(
      units.map((unit) => (unit.key === 'player' ? { ...unit, guard: true } : unit)),
      'player',
      5,
    )
    note(`${player.name} braces. The next hit will land lighter.`)
  } else if (command.item === 'ration') {
    if (rations <= 0) return { battle, spent: null, error: 'The ration tin is empty.' }
    rations -= 1
    units = heal(units, 'player', 16)
    note(`${player.name} eats a packed ration.`)
  } else {
    spent = command.item
    units = heal(units, 'player', 12)
    note(`${player.name} crunches a ${command.item}.`)
  }

  if (!living(units, 'enemy').length) {
    return { battle: { ...battle, units, rations, log, result: 'won' }, spent, error: null }
  }

  for (const ally of units.filter((unit) => unit.side === 'party' && unit.key !== 'player' && unit.hp > 0)) {
    const enemy = firstLiving(units, 'enemy', null)
    if (!enemy) break
    const amount = strike(ally.atk, enemy.def, rng)
    units = hurt(units, enemy.key, amount)
    note(`${ally.name} strikes ${enemy.name} for ${amount}.`)
  }

  if (!living(units, 'enemy').length) {
    return { battle: { ...battle, units, rations, log, result: 'won' }, spent, error: null }
  }

  for (const enemy of [...units].filter((unit) => unit.side === 'enemy' && unit.hp > 0)) {
    const party = living(units, 'party')
    if (!party.length) break
    const victim = party[Math.floor(rng() * party.length)] ?? party[0]
    if (!victim) break
    const amount = strike(enemy.atk, victim.def, rng)
    const guarded = units.find((unit) => unit.key === victim.key)?.guard ?? false
    units = hurt(units, victim.key, amount)
    note(guarded ? `${enemy.name} thumps ${victim.name}'s guard.` : `${enemy.name} hits ${victim.name} for ${amount}.`)
  }

  if (command.type !== 'skill') {
    units = units.map((unit) =>
      unit.key === 'player' ? { ...unit, skillCd: Math.max(0, unit.skillCd - 1) } : unit,
    )
  }

  const result = living(units, 'party').length ? 'fight' : 'lost'
  if (result === 'lost') note('You drop back to the square. The contract is still on the board.')
  return { battle: { ...battle, units, rations, log, result }, spent, error: null }
}

export function attackUntilDone(battle: Battle, rng: () => number): Battle {
  let current = battle
  let guard = 0
  while (current.result === 'fight' && guard < 40) {
    const target = current.units.findIndex((unit) => unit.side === 'enemy' && unit.hp > 0)
    current = playerTurn(current, { type: 'attack', target }, rng).battle
    guard += 1
  }
  return current
}
