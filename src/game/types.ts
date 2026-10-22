/** Save shape for the opening of the village. Dating stays a closed hook. */

export const SAVE_KEY = 'isekaid-into-my-own-phone'
export const SAVE_VERSION = 2

export type SeasonId = 'early-spring'

export type CropId = 'radish' | 'turnip' | 'carrot' | 'strawberry'

export type MealId = 'radish_skillet' | 'turnip_soup' | 'carrot_tea' | 'berry_cup'

export type MaterialId = 'slime_gel' | 'goblin_scrap'

export type SeedId = `${CropId}_seed`

export type ItemId = CropId | MealId | SeedId | MaterialId

export type VillagerId =
  | 'miri'
  | 'lumi'
  | 'popo'
  | 'garrick'
  | 'aldric'
  | 'lila'
  | 'ren'
  | 'hana'
  | 'theo'
  | 'kenji'

export type BuildingId = 'house' | 'inn' | 'cafe' | 'barn' | 'garden'

export type Workplace = 'field' | 'hall' | BuildingId

export type FriendshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'friend'
  | 'close'
  | 'trusted'
  | 'heartmark'

export type Taste = 'loved' | 'liked' | 'neutral' | 'disliked'

export type TutorialStep = 'plant' | 'grow' | 'cook' | 'deliver' | 'done'

export type MissionId = 'slime_patch' | 'slime_pair' | 'goblin_scout' | 'mixed_lane' | 'goblin_pair'

export type Metric = 'plant' | 'harvest' | 'cook' | 'talk' | 'feed' | 'battle'

export type Plot = {
  crop: CropId | null
  plantedAt: number | null
  watered: boolean
}

export type BuildingState = {
  level: number
  /** Epoch ms when the upgrade finishes. Null when idle. */
  readyAt: number | null
}

export type Request = {
  item: ItemId
  reward: number
  hearts: number
}

export type VillagerState = {
  id: VillagerId
  friendship: number
  talkedToday: boolean
  giftedToday: boolean
  request: Request
  requestFilled: boolean
  hired: boolean
  /** Set the first time friendship reaches Heartmark. Dating still does not start. */
  heartmarkSeen: boolean
  /** Future romance route id. Stays null in this chapter. */
  romanceRoute: string | null
}

export type Goal = {
  id: string
  metric: Metric
  target: number
  progress: number
  rewardGlim: number
  rewardXp: number
  claimed: boolean
  title: string
  detail: string
}

export type TaxBill = {
  goal: number
  /** Epoch ms. 0 until the player steps out of the intro. */
  dueAt: number
  extensions: number
}

export type GameState = {
  version: number
  playerName: string
  day: number
  season: SeasonId
  level: number
  xp: number
  glim: number
  stardust: number
  plots: Plot[]
  inventory: Partial<Record<ItemId, number>>
  /** Harvests left in the ground too long. Sold at half price, still fine to cook. */
  stale: Partial<Record<CropId, number>>
  villagers: VillagerState[]
  buildings: Record<BuildingId, BuildingState>
  townHall: BuildingState
  tax: TaxBill
  goals: Goal[]
  tutorial: TutorialStep
  introSeen: boolean
  guildSigned: boolean
  missionsCleared: Partial<Record<MissionId, number>>
  log: string[]
  /**
   * Reserved for a later romance chapter. This build never sets it.
   * Per-villager `romanceRoute` is the other half of the hook.
   */
  dating: null
}

export type ActionResult = {
  ok: boolean
  message: string
  state: GameState
}
