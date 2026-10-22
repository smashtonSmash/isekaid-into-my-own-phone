import {
  BUILDINGS,
  CROP_IDS,
  CROPS,
  GIFT_POINTS,
  HEARTMARK_AT,
  HIRE_AT,
  HURRY_MS,
  MISSIONS,
  RECIPES,
  START_GLIM,
  TAX_EXTEND_MS,
  TAX_GOAL,
  TAX_WINDOW_MS,
  TH1_IDS,
  TH2_IDS,
  VILLAGERS,
  buildingDuration,
  cropUnlocked,
  dialogueFor,
  growDuration,
  growthOf,
  hallDuration,
  isHired,
  itemDef,
  makeGoals,
  missionUnlocked,
  nextHall,
  nextTier,
  priceOf,
  rollRequest,
  seedId,
  tasteOf,
  tierLabel,
  xpToNext,
} from './data.ts'
import { formatLeft } from './format.ts'
import type {
  ActionResult,
  BuildingId,
  CropId,
  GameState,
  Goal,
  ItemId,
  MealId,
  Metric,
  MissionId,
  Plot,
  VillagerId,
  VillagerState,
} from './types.ts'

export { formatLeft } from './format.ts'
export { growthOf } from './data.ts'

export function sanitizeName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, 16)
  return name.length > 0 ? name : 'Traveler'
}

function emptyPlot(): Plot {
  return { crop: null, plantedAt: null, watered: false }
}

function freshVillager(id: VillagerId, day: number): VillagerState {
  return {
    id,
    friendship: 0,
    talkedToday: false,
    giftedToday: false,
    request: rollRequest(id, day),
    requestFilled: false,
    hired: false,
    heartmarkSeen: false,
    romanceRoute: null,
  }
}

export function createGame(name: string): GameState {
  const state: GameState = {
    version: 2,
    playerName: sanitizeName(name),
    day: 1,
    season: 'early-spring',
    level: 1,
    xp: 0,
    glim: START_GLIM,
    stardust: 0,
    plots: Array.from({ length: 4 }, emptyPlot),
    inventory: { radish_seed: 3, turnip_seed: 2 },
    stale: {},
    villagers: TH1_IDS.map((id) => freshVillager(id, 1)),
    buildings: {
      house: { level: 1, readyAt: null },
      inn: { level: 1, readyAt: null },
      cafe: { level: 0, readyAt: null },
      barn: { level: 0, readyAt: null },
      garden: { level: 0, readyAt: null },
    },
    townHall: { level: 1, readyAt: null },
    tax: { goal: TAX_GOAL, dueAt: 0, extensions: 0 },
    goals: makeGoals(1, false),
    tutorial: 'plant',
    introSeen: false,
    guildSigned: false,
    missionsCleared: {},
    log: ['The phone is warm in your hand, and the village is on the other side of the glass.'],
    dating: null,
  }
  return state
}

function ok(state: GameState, message: string, log = false): ActionResult {
  return { ok: true, message, state: log ? pushLog(state, message) : state }
}

function reject(state: GameState, message: string): ActionResult {
  return { ok: false, message, state }
}

function pushLog(state: GameState, message: string): GameState {
  return { ...state, log: [message, ...state.log].slice(0, 12) }
}

function withItem(state: GameState, id: ItemId, delta: number): GameState | null {
  const have = state.inventory[id] ?? 0
  if (have + delta < 0) return null
  const inventory: GameState['inventory'] = { ...state.inventory }
  const nextCount = have + delta
  if (nextCount <= 0) delete inventory[id]
  else inventory[id] = nextCount
  return { ...state, inventory }
}

function replacePlot(state: GameState, index: number, plot: Plot): GameState {
  return { ...state, plots: state.plots.map((current, i) => (i === index ? plot : current)) }
}

function patchVillager(state: GameState, id: VillagerId, patch: Partial<VillagerState>): GameState {
  return {
    ...state,
    villagers: state.villagers.map((villager) => (villager.id === id ? { ...villager, ...patch } : villager)),
  }
}

function findVillager(state: GameState, id: VillagerId): VillagerState | undefined {
  return state.villagers.find((villager) => villager.id === id)
}

function gain(state: GameState, xp: number, glim: number): GameState {
  let level = state.level
  let pocket = state.xp + Math.max(0, xp)
  let dust = state.stardust
  let guard = 0
  while (pocket >= xpToNext(level) && guard < 30) {
    pocket -= xpToNext(level)
    level += 1
    dust += 1
    guard += 1
  }
  return { ...state, xp: pocket, level, stardust: dust, glim: state.glim + glim }
}

function bump(state: GameState, metric: Metric, amount = 1): GameState {
  if (amount <= 0) return state
  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.metric === metric ? { ...goal, progress: goal.progress + amount } : goal,
    ),
  }
}

function claimable(goal: Goal): boolean {
  return !goal.claimed && goal.progress >= goal.target
}

function bankGoals(state: GameState): GameState {
  let next = state
  for (const goal of state.goals) {
    if (!claimable(goal)) continue
    next = gain(next, goal.rewardXp, goal.rewardGlim)
    next = {
      ...next,
      goals: next.goals.map((item) => (item.id === goal.id ? { ...item, claimed: true } : item)),
    }
  }
  return next
}

function addFriendship(state: GameState, id: VillagerId, points: number): { state: GameState; note: string | null } {
  const villager = findVillager(state, id)
  if (!villager || points <= 0) return { state, note: null }
  const friendship = Math.min(100, villager.friendship + points)
  const crossed = friendship >= HEARTMARK_AT && !villager.heartmarkSeen
  let next = patchVillager(state, id, {
    friendship,
    heartmarkSeen: villager.heartmarkSeen || crossed,
    romanceRoute: null,
  })
  if (!crossed) return { state: next, note: null }
  const def = VILLAGERS[id]
  const note = def.romance
    ? `${def.name}'s heartmark glows. A later chapter can answer it. This one keeps the promise open.`
    : `${def.name} calls you a best friend. That is the whole promise, and it is kept.`
  next = pushLog(next, note)
  return { state: next, note }
}

function consumeCrop(state: GameState, id: CropId, qty: number): GameState | null {
  const total = state.inventory[id] ?? 0
  if (total < qty) return null
  const staleCount = Math.min(state.stale[id] ?? 0, total)
  const useStale = Math.min(staleCount, qty)
  const stale = { ...state.stale }
  if (staleCount - useStale <= 0) delete stale[id]
  else stale[id] = staleCount - useStale
  return withItem({ ...state, stale }, id, -qty)
}

export function enterTown(state: GameState, now: number): GameState {
  if (state.introSeen) return state
  const dueAt = state.tax.dueAt > 0 ? state.tax.dueAt : now + TAX_WINDOW_MS
  return pushLog(
    { ...state, introSeen: true, tax: { ...state.tax, dueAt } },
    'Lumi sets the tax clock. Miri points at the open soil.',
  )
}

export function plant(state: GameState, index: number, crop: CropId, now: number): ActionResult {
  const plot = state.plots[index]
  if (!plot) return reject(state, 'That plot is still meadow.')
  if (plot.crop) return reject(state, 'Something is already growing here.')
  if (!cropUnlocked(crop, state.townHall.level)) return reject(state, `${CROPS[crop].name} waits for a taller Town Hall.`)
  const seed = seedId(crop)
  if ((state.inventory[seed] ?? 0) < 1) return reject(state, `The market can sell you ${CROPS[crop].name} seeds.`)
  const seeded = withItem(state, seed, -1)
  if (!seeded) return reject(state, `The market can sell you ${CROPS[crop].name} seeds.`)
  let next = replacePlot(seeded, index, { crop, plantedAt: now, watered: false })
  next = bump(next, 'plant')
  if (next.tutorial === 'plant' && crop === 'radish') next = { ...next, tutorial: 'grow' }
  const ms = growDuration(crop, false, next.villagers)
  return ok(next, `${CROPS[crop].name} is in the soil. ${formatLeft(ms)} until it is ready.`, true)
}

export function water(state: GameState, index: number, _now: number): ActionResult {
  const plot = state.plots[index]
  if (!plot?.crop) return reject(state, 'Plant something before you water it.')
  if (plot.watered) return reject(state, 'This one already had a drink.')
  const growth = growthOf(plot, state.villagers, _now)
  if (growth?.ready) return reject(state, 'It is ready to pick.')
  const next = replacePlot(state, index, { ...plot, watered: true })
  const after = growthOf(next.plots[index]!, next.villagers, _now)
  return ok(next, `The roots drink. ${formatLeft(after?.remainingMs ?? 0)} left.`, true)
}

export function hurryPlot(state: GameState, index: number, now: number): ActionResult {
  const plot = state.plots[index]
  if (!plot?.crop || plot.plantedAt == null) return reject(state, 'Nothing is growing there.')
  if (state.stardust < 1) return reject(state, 'Stardust hurries a timer. Quests and levels leave some in your pocket.')
  const growth = growthOf(plot, state.villagers, now)
  if (growth?.ready) return reject(state, 'It is already ready.')
  const next = replacePlot({ ...state, stardust: state.stardust - 1 }, index, {
    ...plot,
    plantedAt: plot.plantedAt - HURRY_MS,
  })
  return ok(next, 'Thirty seconds fall off the crop.', true)
}

export function harvest(state: GameState, index: number, now: number): ActionResult {
  const plot = state.plots[index]
  if (!plot?.crop || plot.plantedAt == null) return reject(state, 'The soil is empty.')
  const growth = growthOf(plot, state.villagers, now)
  if (!growth) return reject(state, 'The soil is empty.')
  if (!growth.ready) return reject(state, `Still growing. ${formatLeft(growth.remainingMs)} left.`)
  const crop = plot.crop
  let next = replacePlot(state, index, emptyPlot())
  const bagged = withItem(next, crop, 1)
  if (!bagged) return reject(state, 'The bag refused a vegetable. That should not happen.')
  next = bagged
  if (growth.stale) {
    next = { ...next, stale: { ...next.stale, [crop]: (next.stale[crop] ?? 0) + 1 } }
  } else if (isHired(next, 'kenji')) {
    next = { ...next, glim: next.glim + 1 }
  }
  if (crop === 'strawberry' && isHired(next, 'hana')) {
    const extra = withItem(next, crop, 1)
    if (extra) next = extra
  }
  next = gain(next, growth.stale ? 4 : 8, 0)
  next = bump(next, 'harvest')
  if (next.tutorial === 'grow' && crop === 'radish') next = { ...next, tutorial: 'cook' }
  const name = CROPS[crop].name
  const message = growth.stale
    ? `${name} waited too long and tired out. Cooking still saves it. The market pays half.`
    : `${name} comes up warm.`
  return ok(next, message, true)
}

export function cook(state: GameState, recipeId: MealId): ActionResult {
  const recipe = RECIPES.find((item) => item.id === recipeId)
  if (!recipe) return reject(state, 'That recipe is not in the kitchen.')
  if (recipe.place === 'inn' && state.buildings.inn.level < 1) return reject(state, 'The inn kitchen is dark.')
  if (recipe.place === 'cafe' && state.buildings.cafe.level < 1) return reject(state, 'The café is not built yet.')
  for (const ingredient of recipe.ingredients) {
    const have = (state.inventory[ingredient.item] ?? 0)
    if (have < ingredient.qty) {
      return reject(state, `Need ${ingredient.qty} ${CROPS[ingredient.item].name}.`)
    }
  }
  let next = state
  for (const ingredient of recipe.ingredients) {
    const spent = consumeCrop(next, ingredient.item, ingredient.qty)
    if (!spent) return reject(state, `Need ${ingredient.qty} ${CROPS[ingredient.item].name}.`)
    next = spent
  }
  const plated = withItem(next, recipe.id, 1)
  if (!plated) return reject(state, 'The plate slipped.')
  next = gain(plated, isHired(plated, 'ren') ? 12 : 10, 0)
  next = bump(next, 'cook')
  if (next.tutorial === 'cook' && recipe.id === 'radish_skillet') next = { ...next, tutorial: 'deliver' }
  return ok(next, `${recipe.name} is plated.`, true)
}

export function serve(state: GameState, id: VillagerId): ActionResult {
  const villager = findVillager(state, id)
  if (!villager) return reject(state, 'They are not in the village yet.')
  if (villager.requestFilled) return reject(state, `${VILLAGERS[id].name} is content for today.`)
  const item = villager.request.item
  if ((state.inventory[item] ?? 0) < 1) return reject(state, `Bring ${itemDef(item).name}.`)
  const spent = withItem(state, item, -1)
  if (!spent) return reject(state, `Bring ${itemDef(item).name}.`)
  const hearts = villager.request.hearts + (isHired(spent, 'popo') ? 1 : 0)
  let next = gain(spent, 12, villager.request.reward)
  const heart = addFriendship(next, id, hearts)
  next = patchVillager(heart.state, id, { requestFilled: true })
  next = bump(next, 'feed')
  if (next.tutorial === 'deliver' && id === 'miri' && item === 'radish_skillet') next = { ...next, tutorial: 'done' }
  const bonus = heart.note ? ` ${heart.note}` : ''
  return ok(next, `${VILLAGERS[id].name} pays ${villager.request.reward} glim.${bonus}`, true)
}

export function sell(state: GameState, id: ItemId, qty: number): ActionResult {
  if (qty < 1) return reject(state, 'Sell at least one.')
  const def = itemDef(id)
  if (def.sell == null || def.kind === 'seed' || def.kind === 'material') return reject(state, 'That stays in the bag.')
  if (def.kind === 'crop') {
    const crop = id as CropId
    const total = state.inventory[crop] ?? 0
    if (total < qty) return reject(state, `Not enough ${def.name}.`)
    const staleCount = Math.min(state.stale[crop] ?? 0, total)
    const useStale = Math.min(staleCount, qty)
    const useFresh = qty - useStale
    const earned =
      useStale * priceOf(id, true, state.villagers, state.buildings.inn.level) +
      useFresh * priceOf(id, false, state.villagers, state.buildings.inn.level)
    const stale = { ...state.stale }
    if (staleCount - useStale <= 0) delete stale[crop]
    else stale[crop] = staleCount - useStale
    const spent = withItem({ ...state, stale, glim: state.glim + earned }, crop, -qty)
    if (!spent) return reject(state, `Not enough ${def.name}.`)
    return ok(spent, `The market pays ${earned} glim.`, true)
  }
  if ((state.inventory[id] ?? 0) < qty) return reject(state, `Not enough ${def.name}.`)
  const earned = priceOf(id, false, state.villagers, state.buildings.inn.level) * qty
  const spent = withItem(state, id, -qty)
  if (!spent) return reject(state, `Not enough ${def.name}.`)
  let next: GameState = { ...spent, glim: spent.glim + earned }
  if (next.tutorial === 'deliver' && id === 'radish_skillet') next = { ...next, tutorial: 'done' }
  return ok(next, `The market pays ${earned} glim.`, true)
}

export function buySeed(state: GameState, crop: CropId, qty: number): ActionResult {
  if (!CROP_IDS.includes(crop)) return reject(state, 'Unknown seed.')
  if (qty < 1) return reject(state, 'Buy at least one.')
  if (!cropUnlocked(crop, state.townHall.level)) return reject(state, `${CROPS[crop].name} seed arrives with a taller Town Hall.`)
  const cost = CROPS[crop].seedCost * qty
  if (state.glim < cost) return reject(state, `${cost} glim for those seeds.`)
  const next = withItem({ ...state, glim: state.glim - cost }, seedId(crop), qty)
  if (!next) return reject(state, 'The pouch is full.')
  return ok(next, `${qty} ${CROPS[crop].name} ${qty === 1 ? 'seed' : 'seeds'} tucked away.`, true)
}

export function talk(state: GameState, id: VillagerId): ActionResult {
  const villager = findVillager(state, id)
  if (!villager) return reject(state, 'They have not arrived.')
  if (villager.talkedToday) return reject(state, `${VILLAGERS[id].name} is out of chatter for today. Rest, and the morning brings more.`)
  const heart = addFriendship(patchVillager(state, id, { talkedToday: true }), id, 1)
  const next = bump(heart.state, 'talk')
  const line = dialogueFor(id, villager.friendship, state.day)
  const extra = heart.note ? ` ${heart.note}` : ''
  return ok(next, `${line}${extra}`, true)
}

export function gift(state: GameState, id: VillagerId, item: ItemId): ActionResult {
  const villager = findVillager(state, id)
  if (!villager) return reject(state, 'They have not arrived.')
  if (villager.giftedToday) return reject(state, `${VILLAGERS[id].name} already accepted a gift today.`)
  const def = itemDef(item)
  if (def.kind === 'seed' || def.kind === 'material') return reject(state, 'Seeds and scrap stay in the bag.')
  if ((state.inventory[item] ?? 0) < 1) return reject(state, `You don't have ${def.name}.`)
  const taste = tasteOf(id, item)
  if (taste === 'disliked') return reject(state, VILLAGERS[id].refuse)
  const spent = withItem(state, item, -1)
  if (!spent) return reject(state, `You don't have ${def.name}.`)
  const marked = patchVillager(spent, id, { giftedToday: true })
  const heart = addFriendship(marked, id, GIFT_POINTS[taste])
  const word = taste === 'loved' ? 'loves' : taste === 'liked' ? 'likes' : 'accepts'
  const extra = heart.note ? ` ${heart.note}` : ''
  return ok(heart.state, `${VILLAGERS[id].name} ${word} the ${def.name}.${extra}`, true)
}

function workplaceReady(state: GameState, id: VillagerId): boolean {
  const place = VILLAGERS[id].workplace
  if (place === 'field' || place === 'hall') return true
  return state.buildings[place].level >= 1
}

export function hire(state: GameState, id: VillagerId): ActionResult {
  const villager = findVillager(state, id)
  if (!villager) return reject(state, 'They have not arrived.')
  if (villager.hired) return reject(state, `${VILLAGERS[id].name} is already with you.`)
  if (villager.friendship < HIRE_AT) return reject(state, `Friend is ${HIRE_AT} hearts. ${VILLAGERS[id].name} is at ${villager.friendship}.`)
  if (!workplaceReady(state, id)) return reject(state, VILLAGERS[id].hireLock)
  const next = patchVillager(state, id, { hired: true, romanceRoute: null })
  return ok(next, `${VILLAGERS[id].name} signs on. ${VILLAGERS[id].perk}`, true)
}

export function payTax(state: GameState, now: number): ActionResult {
  if (state.tax.dueAt <= 0) return reject(state, 'The clock starts when you step into the village.')
  if (state.glim < state.tax.goal) return reject(state, `The tax is ${state.tax.goal} glim. You have ${state.glim}.`)
  const paid = state.tax.goal
  const nextGoal = Math.round(paid * 1.8)
  const next = gain({ ...state, glim: state.glim - paid }, 15, 0)
  return ok(
    {
      ...next,
      tax: { goal: nextGoal, dueAt: now + TAX_WINDOW_MS * 2, extensions: 0 },
    },
    `The tax is paid. ${paid} glim goes to the king. The next bill is ${nextGoal}.`,
    true,
  )
}

export function rest(state: GameState): ActionResult {
  const banked = bankGoals(state)
  const day = banked.day + 1
  const lumi = isHired(banked, 'lumi')
  const next: GameState = {
    ...banked,
    day,
    villagers: banked.villagers.map((villager) => ({
      ...villager,
      talkedToday: false,
      giftedToday: false,
      request: rollRequest(villager.id, day),
      requestFilled: false,
      romanceRoute: null,
    })),
    goals: makeGoals(day, lumi),
    dating: null,
  }
  return ok(next, 'Dawn again. The village has new orders, and yesterday’s finished goals are paid.', true)
}

export function claimGoal(state: GameState, id: string): ActionResult {
  const goal = state.goals.find((item) => item.id === id)
  if (!goal) return reject(state, 'That goal has wandered off.')
  if (goal.claimed) return reject(state, 'Already claimed.')
  if (goal.progress < goal.target) return reject(state, `${goal.progress}/${goal.target}. Keep going.`)
  let next = gain(state, goal.rewardXp, goal.rewardGlim)
  next = {
    ...next,
    goals: next.goals.map((item) => (item.id === id ? { ...item, claimed: true } : item)),
  }
  return ok(next, `${goal.title} pays ${goal.rewardGlim} glim.`, true)
}

export function signGuild(state: GameState): ActionResult {
  if (state.guildSigned) return reject(state, 'Your name is already in the ledger.')
  return ok({ ...state, guildSigned: true }, 'Vale writes your name in the guild ledger.', true)
}

export function claimVictory(state: GameState, missionId: MissionId): ActionResult {
  if (!state.guildSigned) return reject(state, 'Sign the guild ledger first.')
  const mission = MISSIONS.find((item) => item.id === missionId)
  if (!mission) return reject(state, 'Unknown contract.')
  if (!missionUnlocked(state.missionsCleared, missionId)) return reject(state, 'Clear the earlier contract first.')
  const cleared = state.missionsCleared[missionId] ?? 0
  const first = cleared === 0
  const glim = first ? mission.glim : Math.ceil(mission.glim / 2)
  const xp = first ? mission.xp : Math.ceil(mission.xp / 2)
  let next = gain(state, xp, glim)
  if (first && mission.stardust) next = { ...next, stardust: next.stardust + mission.stardust }
  for (const material of mission.materials) {
    const qty = first ? material.qty : 1
    const bagged = withItem(next, material.id, qty)
    if (bagged) next = bagged
  }
  next = {
    ...next,
    missionsCleared: { ...next.missionsCleared, [missionId]: cleared + 1 },
  }
  next = bump(next, 'battle')
  const mats = mission.materials.map((material) => itemDef(material.id).name).join(', ')
  return ok(next, `Contract paid. ${glim} glim, ${xp} XP${mats ? `, ${mats}` : ''}.`, true)
}

export function spendCrop(state: GameState, id: CropId): ActionResult {
  if ((state.inventory[id] ?? 0) < 1) return reject(state, `No ${CROPS[id].name} in the bag.`)
  const spent = consumeCrop(state, id, 1)
  if (!spent) return reject(state, `No ${CROPS[id].name} in the bag.`)
  return ok(spent, `You eat a ${CROPS[id].name} between turns.`, false)
}

function finishHall(state: GameState): GameState {
  const level = state.townHall.level + 1
  let plots = state.plots
  if (level === 2 && plots.length < 8) plots = plots.concat(Array.from({ length: 8 - plots.length }, emptyPlot))
  if (level === 4 && plots.length < 16) plots = plots.concat(Array.from({ length: 16 - plots.length }, emptyPlot))
  let villagers = state.villagers
  if (level === 2) {
    const arrivals = TH2_IDS.filter((id) => !villagers.some((villager) => villager.id === id)).map((id) => freshVillager(id, state.day))
    if (arrivals.length) villagers = villagers.concat(arrivals)
  }
  const next = gain(
    {
      ...state,
      townHall: { level, readyAt: null },
      plots,
      villagers,
    },
    40,
    0,
  )
  const arrived = level === 2 ? ' Lila, Ren, Hana, Theo, and Kenji walk into town.' : ''
  return pushLog(next, `Town Hall ${level} is finished.${arrived}`)
}

function finishBuilding(state: GameState, id: BuildingId): GameState {
  const building = state.buildings[id]
  const next = gain(
    {
      ...state,
      buildings: {
        ...state.buildings,
        [id]: { level: building.level + 1, readyAt: null },
      },
    },
    12,
    0,
  )
  return pushLog(next, `${BUILDINGS[id].name} is finished.`)
}

export function sync(state: GameState, now: number): GameState {
  let next = state
  let changed = false
  if (next.townHall.readyAt != null && now >= next.townHall.readyAt) {
    next = finishHall(next)
    changed = true
  }
  for (const id of Object.keys(next.buildings) as BuildingId[]) {
    const building = next.buildings[id]
    if (building.readyAt != null && now >= building.readyAt) {
      next = finishBuilding(next, id)
      changed = true
    }
  }
  if (next.tax.dueAt > 0 && now >= next.tax.dueAt) {
    const extensions = next.tax.extensions + 1
    next = pushLog(
      {
        ...next,
        tax: { ...next.tax, dueAt: now + TAX_EXTEND_MS, extensions },
      },
      extensions === 1
        ? 'The tax bell rings. Lumi talks the clerk into a little more time.'
        : 'The king is still waiting. The clock starts again.',
    )
    changed = true
  }
  return changed ? next : state
}

export function startTownHall(state: GameState, now: number): ActionResult {
  if (state.townHall.readyAt) return reject(state, 'The Town Hall is already being raised.')
  const nextInfo = nextHall(state.townHall.level)
  if (!nextInfo) return reject(state, 'The Town Hall stands at the Gate.')
  if (state.glim < nextInfo.cost) return reject(state, `Town Hall ${nextInfo.level} costs ${nextInfo.cost} glim.`)
  const ms = hallDuration(state.townHall.level, state)
  const next: GameState = {
    ...state,
    glim: state.glim - nextInfo.cost,
    townHall: { ...state.townHall, readyAt: now + ms },
  }
  return ok(next, `Work starts on Town Hall ${nextInfo.level}. ${formatLeft(ms)}.`, true)
}

export function hurryHall(state: GameState, now: number): ActionResult {
  if (!state.townHall.readyAt) return reject(state, 'The Town Hall is not under construction.')
  if (state.stardust < 1) return reject(state, 'Stardust hurries a timer.')
  const readyAt = state.townHall.readyAt - HURRY_MS
  const next = sync({ ...state, stardust: state.stardust - 1, townHall: { ...state.townHall, readyAt } }, now)
  return ok(next, 'Thirty seconds fall off the Town Hall.', true)
}

export function startBuilding(state: GameState, id: BuildingId, now: number): ActionResult {
  const building = state.buildings[id]
  const tier = nextTier(id, building.level)
  if (!tier) return reject(state, `${BUILDINGS[id].name} is as fine as this chapter allows.`)
  if (building.readyAt) return reject(state, `${BUILDINGS[id].name} is already in progress.`)
  if (state.townHall.level < tier.hall) return reject(state, `${BUILDINGS[id].name} waits for Town Hall ${tier.hall}.`)
  if (state.glim < tier.cost) return reject(state, `${tier.cost} glim will raise the ${BUILDINGS[id].name}.`)
  const ms = buildingDuration(id, building.level, state)
  const next: GameState = {
    ...state,
    glim: state.glim - tier.cost,
    buildings: { ...state.buildings, [id]: { ...building, readyAt: now + ms } },
  }
  return ok(next, `${BUILDINGS[id].name} goes up. ${formatLeft(ms)}.`, true)
}

export function hurryBuilding(state: GameState, id: BuildingId, now: number): ActionResult {
  const building = state.buildings[id]
  if (!building.readyAt) return reject(state, `${BUILDINGS[id].name} is not under construction.`)
  if (state.stardust < 1) return reject(state, 'Stardust hurries a timer.')
  const readyAt = building.readyAt - HURRY_MS
  const next = sync(
    {
      ...state,
      stardust: state.stardust - 1,
      buildings: { ...state.buildings, [id]: { ...building, readyAt } },
    },
    now,
  )
  return ok(next, `Thirty seconds fall off the ${BUILDINGS[id].name}.`, true)
}

export function workplaceOpen(state: GameState, id: VillagerId): boolean {
  return workplaceReady(state, id)
}

export function friendTitle(id: VillagerId, friendship: number): string {
  return tierLabel(friendship, VILLAGERS[id].romance)
}
