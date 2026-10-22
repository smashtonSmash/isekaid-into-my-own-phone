import { attackUntilDone, startBattle } from '../src/game/battle.ts'
import { CROPS, growthOf, KINGDOM_HALL, missionUnlocked } from '../src/game/data.ts'
import {
  buySeed,
  claimGoal,
  claimVictory,
  cook,
  createGame,
  enterTown,
  gift,
  harvest,
  hire,
  payTax,
  plant,
  sell,
  serve,
  signGuild,
  startBuilding,
  startTownHall,
  sync,
  talk,
  water,
} from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function must(result: { ok: boolean; message: string; state: GameState }, label: string): GameState {
  if (!result.ok) throw new Error(`${label}: ${result.message}`)
  return result.state
}

const now = 1_700_000_000_000
let state = enterTown(createGame('Aoi'), now)
assert(state.playerName === 'Aoi', 'name')
assert(state.glim === 20, 'starting glim')
assert(state.plots.length === 4, 'four plots')
assert(state.townHall.level === 1, 'hall starts at 1')
assert(state.tutorial === 'plant', 'tutorial')
assert(state.dating === null, 'dating hook stays null')
assert(state.villagers.every((villager) => villager.romanceRoute === null), 'routes stay null')
assert(state.tax.dueAt === now + 10 * 60_000, 'tax clock')
assert(!plant(state, 0, 'carrot', now).ok, 'carrot waits for town hall 2')

state = must(plant(state, 0, 'radish', now), 'plant')
assert(state.tutorial === 'grow', 'tutorial advances')
assert((state.inventory.radish_seed ?? 0) === 2, 'seed spent')
assert(!harvest(state, 0, now + 1000).ok, 'not ready yet')
state = must(water(state, 0, now + 1000), 'water')
const watered = growthOf(state.plots[0]!, state.villagers, now + 1000)
assert(watered && watered.ms < CROPS.radish.ms, 'water shortens the timer')

state = must(harvest(state, 0, now + CROPS.radish.ms), 'harvest')
assert(state.tutorial === 'cook', 'harvest step')
assert(state.inventory.radish === 1, 'radish bagged')
state = must(cook(state, 'radish_skillet'), 'cook')
assert(state.tutorial === 'deliver', 'cook step')
assert(state.inventory.radish_skillet === 1, 'skillet plated')
const before = state.glim
state = must(serve(state, 'miri'), 'serve miri')
assert(state.tutorial === 'done', 'tutorial done')
assert(state.glim === before + 28, 'miri paid')
assert(state.villagers.find((villager) => villager.id === 'miri')?.friendship === 6, 'hearts')

state = must(payTax(state, now + 20_000), 'tax')
assert(state.glim === before + 28 - 30, 'tax spent')
assert(state.level >= 2, 'tax pushed a level')

const tired = must(plant(state, 1, 'radish', now), 'plant tired')
state = must(harvest(tired, 1, now + CROPS.radish.ms * 3), 'stale harvest')
assert((state.stale.radish ?? 0) === 1, 'marked tired')
const sale = state.glim
state = must(sell(state, 'radish', 1), 'sell tired')
assert(state.glim === sale + Math.max(1, Math.floor(CROPS.radish.sell / 2)), 'half price')

state = must(signGuild(state), 'sign')
const battle = startBattle(state, 'slime_patch')
assert(battle, 'battle exists')
const won = attackUntilDone(battle, () => 0.5)
assert(won.result === 'won', 'slime falls')
state = must(claimVictory(state, 'slime_patch'), 'reward')
assert((state.missionsCleared.slime_patch ?? 0) === 1, 'cleared')
assert((state.inventory.slime_gel ?? 0) === 1, 'gel')
assert(!missionUnlocked(state.missionsCleared, 'goblin_pair'), 'later contracts stay locked')
assert(missionUnlocked(state.missionsCleared, 'slime_pair'), 'next contract opens')
assert(KINGDOM_HALL === 8, 'kingdom waits for hall 8')

state = must(startBuilding({ ...state, glim: 100 }, 'house', now), 'cottage')
assert(state.buildings.house.readyAt != null, 'timer running')
const built = sync(state, (state.buildings.house.readyAt ?? 0) + 1)
assert(built.buildings.house.level === 2, 'cottage finished')

const rich = { ...built, glim: 500 }
const raising = must(startTownHall(rich, now), 'hall')
const raised = sync(raising, (raising.townHall.readyAt ?? 0) + 1)
assert(raised.townHall.level === 2, 'hall 2')
assert(raised.plots.length === 8, 'eight plots')
assert(raised.villagers.some((villager) => villager.id === 'kenji'), 'kenji arrives')
assert(raised.dating === null, 'upgrade does not date anyone')

const friend = {
  ...raised,
  villagers: raised.villagers.map((villager) =>
    villager.id === 'miri' ? { ...villager, friendship: 90, heartmarkSeen: false } : villager,
  ),
}
const marked = must(talk(friend, 'miri'), 'heartmark')
const miri = marked.villagers.find((villager) => villager.id === 'miri')
assert(miri?.heartmarkSeen, 'heartmark seen')
assert(miri?.romanceRoute === null, 'route stays empty')
assert(marked.dating === null, 'dating stays null')

const hirable = {
  ...marked,
  villagers: marked.villagers.map((villager) => (villager.id === 'miri' ? { ...villager, friendship: 40 } : villager)),
}
state = must(hire(hirable, 'miri'), 'hire')
const plain = growthOf({ crop: 'turnip', plantedAt: now, watered: false }, hirable.villagers, now)
const led = growthOf({ crop: 'turnip', plantedAt: now, watered: false }, state.villagers, now)
assert(plain && led && led.ms < plain.ms, 'miri speeds crops')

assert(!gift(state, 'aldric', 'radish').ok, 'mayor refuses a radish')
state = must(buySeed({ ...state, glim: 20 }, 'turnip', 1), 'buy seed')
const goal = state.goals.find((item) => item.metric === 'harvest')
assert(goal && goal.progress >= 1, 'harvest goal moved')
if (goal && !goal.claimed) state = must(claimGoal(state, goal.id), 'claim goal')

console.log('smoke ok', { day: state.day, glim: state.glim, level: state.level, plots: state.plots.length })
