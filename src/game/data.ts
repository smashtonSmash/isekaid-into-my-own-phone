import type {
  BuildingId,
  CropId,
  FriendshipTier,
  Goal,
  ItemId,
  MealId,
  MissionId,
  Plot,
  Request,
  SeasonId,
  Taste,
  TutorialStep,
  VillagerId,
  VillagerState,
  Workplace,
} from './types.ts'
import { formatLeft } from './format.ts'

export const HEARTMARK_AT = 90
export const HIRE_AT = 40
export const KINGDOM_HALL = 8
export const TAX_GOAL = 30
export const TAX_WINDOW_MS = 10 * 60_000
export const TAX_EXTEND_MS = 4 * 60_000
export const HURRY_MS = 30_000
export const START_GLIM = 20

export const GIFT_POINTS: Record<Taste, number> = {
  loved: 8,
  liked: 5,
  neutral: 2,
  disliked: 0,
}

export type CropDef = {
  id: CropId
  name: string
  seedCost: number
  sell: number
  ms: number
  hall: number
  blurb: string
}

export const CROPS: Record<CropId, CropDef> = {
  radish: {
    id: 'radish',
    name: 'Radish',
    seedCost: 3,
    sell: 8,
    ms: 60_000,
    hall: 1,
    blurb: 'Crisp and quick. The first thing the village asks of a new pair of hands.',
  },
  turnip: {
    id: 'turnip',
    name: 'Turnip',
    seedCost: 5,
    sell: 14,
    ms: 90_000,
    hall: 1,
    blurb: 'Miri’s favorite argument. Sweet when the soil is kind.',
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    seedCost: 8,
    sell: 18,
    ms: 3 * 60_000,
    hall: 1,
    blurb: 'Theo will talk about the soil for as long as you let him.',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    seedCost: 12,
    sell: 26,
    ms: 4 * 60_000,
    hall: 1,
    blurb: 'Hana pretends she is not waiting for these.',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    seedCost: 6,
    sell: 16,
    ms: 2 * 60_000,
    hall: 1,
    blurb: 'A red cheek that ripens while you walk the square.',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Pumpkin',
    seedCost: 14,
    sell: 32,
    ms: 5 * 60_000,
    hall: 1,
    blurb: 'Heavy, patient, and proud of taking its time.',
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    seedCost: 7,
    sell: 15,
    ms: 150_000,
    hall: 1,
    blurb: 'A gold row. The inn will want it when the bakery arrives.',
  },
  cabbage: {
    id: 'cabbage',
    name: 'Cabbage',
    seedCost: 8,
    sell: 18,
    ms: 3 * 60_000,
    hall: 1,
    blurb: 'Layered and unbothered. A good gift for a long walk.',
  },
  watermelon: {
    id: 'watermelon',
    name: 'Watermelon',
    seedCost: 16,
    sell: 36,
    ms: 6 * 60_000,
    hall: 1,
    blurb: 'The loudest fruit in the beds, and the sweetest wait.',
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    seedCost: 9,
    sell: 20,
    ms: 150_000,
    hall: 1,
    blurb: 'It faces the lane. Hana says that counts as company.',
  },
}

export const CROP_IDS = Object.keys(CROPS) as CropId[]

export type Recipe = {
  id: MealId
  name: string
  ingredients: { item: CropId; qty: number }[]
  sell: number
  place: 'inn' | 'cafe'
  blurb: string
}

export const RECIPES: Recipe[] = [
  {
    id: 'radish_skillet',
    name: 'Radish Skillet',
    ingredients: [{ item: 'radish', qty: 1 }],
    sell: 20,
    place: 'inn',
    blurb: 'Hot, glossy, and enough to make Miri stop teasing.',
  },
  {
    id: 'turnip_soup',
    name: 'Turnip Soup',
    ingredients: [{ item: 'turnip', qty: 1 }],
    sell: 26,
    place: 'inn',
    blurb: 'Cloudy and kind. Elowen’s kettle knows this one by heart.',
  },
  {
    id: 'carrot_tea',
    name: 'Carrot Tea',
    ingredients: [{ item: 'carrot', qty: 1 }],
    sell: 22,
    place: 'cafe',
    blurb: 'Ren swears the steam counts as a signature.',
  },
  {
    id: 'berry_cup',
    name: 'Berry Cup',
    ingredients: [{ item: 'strawberry', qty: 2 }],
    sell: 48,
    place: 'cafe',
    blurb: 'Lila’s rush-hour peace offering.',
  },
]

export type ItemKind = 'seed' | 'crop' | 'meal' | 'material'

export type ItemDef = {
  id: ItemId
  name: string
  blurb: string
  kind: ItemKind
  sell: number | null
}

export function seedId(crop: CropId): ItemId {
  return `${crop}_seed`
}

export function itemDef(id: ItemId): ItemDef {
  if (id === 'slime_gel') {
    return { id, name: 'Slime gel', blurb: 'Wobbly, useful, and a little proud of itself.', kind: 'material', sell: null }
  }
  if (id === 'goblin_scrap') {
    return { id, name: 'Goblin scrap', blurb: 'A bent buckle. The forge will want these later.', kind: 'material', sell: null }
  }
  if (id.endsWith('_seed')) {
    const crop = CROPS[id.slice(0, -5) as CropId]
    return { id, name: `${crop.name} seed`, blurb: crop.blurb, kind: 'seed', sell: null }
  }
  if (id in CROPS) {
    const crop = CROPS[id as CropId]
    return { id, name: crop.name, blurb: crop.blurb, kind: 'crop', sell: crop.sell }
  }
  const meal = RECIPES.find((recipe) => recipe.id === id)
  if (!meal) throw new Error(`Unknown item ${id}`)
  return { id, name: meal.name, blurb: meal.blurb, kind: 'meal', sell: meal.sell }
}

export function countOf(inventory: Partial<Record<ItemId, number>>, id: ItemId): number {
  return inventory[id] ?? 0
}

export type Look = {
  hair: string
  skin: string
  cloth: string
  eye: string
  extra: 'none' | 'cat' | 'beard' | 'mustache' | 'glasses' | 'hat' | 'sunhat' | 'braid' | 'clasp'
}

export type VillagerDef = {
  id: VillagerId
  name: string
  title: string
  age: number
  personality: string
  loved: ItemId[]
  liked: ItemId[]
  disliked: ItemId[]
  refuse: string
  workplace: Workplace
  hireLock: string
  perk: string
  romance: boolean
  hp: number
  atk: number
  look: Look
  lines: Record<FriendshipTier, string[]>
}

const TIERS: FriendshipTier[] = ['stranger', 'acquaintance', 'friendly', 'friend', 'close', 'trusted', 'heartmark']

function lines(list: string[]): Record<FriendshipTier, string[]> {
  const out = {} as Record<FriendshipTier, string[]>
  TIERS.forEach((tier, index) => {
    out[tier] = [list[index] ?? list[0] ?? '']
  })
  return out
}

export const VILLAGERS: Record<VillagerId, VillagerDef> = {
  miri: {
    id: 'miri',
    name: 'Miri',
    title: 'Turnip farmer',
    age: 27,
    personality: 'Big-sister energy, teasing, stubbornly optimistic.',
    loved: ['turnip', 'turnip_soup', 'radish_skillet'],
    liked: ['radish'],
    disliked: ['carrot'],
    refuse: 'Carrots are a dare. I farm turnips. Bring me something that knows it.',
    workplace: 'field',
    hireLock: 'She is already in the field. Reach Friend and she will work your rows.',
    perk: 'Field Lead: crops on your plots grow 10% faster.',
    romance: true,
    hp: 34,
    atk: 7,
    look: { hair: '#f2a0c0', skin: '#f3c7a8', cloth: '#6e9a4a', eye: '#c47a2a', extra: 'none' },
    lines: lines([
      'You fell out of a phone and landed on your feet. I’m Miri. That is a decent first impression.',
      'The straightest row is yours to admire. Admiration looks a lot like watering.',
      'I keep a seed tin with your name scratched on the lid. Don’t make it a big deal. It is a medium deal.',
      'Hire me and the crows get a speech. Your crops get a drink and a faster season.',
      'Rain on the fields used to scare me. With you out here it just sounds busy.',
      'Lanterns suit you. Walk the long path with me when the festival comes back around.',
      'If this phone keeps a heart, I hope it keeps yours next to the village. I’m not asking it to close.',
    ]),
  },
  lumi: {
    id: 'lumi',
    name: 'Lumi',
    title: 'Phone-world guide',
    age: 25,
    personality: 'Bright, a little guilty for pulling you in, secretly lonely.',
    loved: ['radish_skillet', 'turnip'],
    liked: ['carrot_tea'],
    disliked: ['berry_cup'],
    refuse: 'Too sweet. I already feel sugary about dragging you here.',
    workplace: 'field',
    hireLock: 'She hovers at your shoulder. Friend lets her stay as your assistant.',
    perk: 'Navigator: resting adds an extra daily goal.',
    romance: true,
    hp: 30,
    atk: 6,
    look: { hair: '#3ec8c2', skin: '#f6d3b8', cloth: '#f4f7fb', eye: '#1f8f93', extra: 'clasp' },
    lines: lines([
      'The glass let go of you because I asked. I’m Lumi. I’ll explain the Gate when you’re ready to hear it.',
      'The quest board in the Town Hall is real paper. I checked. I was hoping it would be an app.',
      'I chose your phone because the light stayed on. That is the whole confession for today.',
      'Sign me on as your assistant. I can keep one more goal from slipping under the day.',
      'I pulled you through on purpose. I tell myself it was to save the tax ledger. I was also lonely.',
      'The inn roof is the best place to watch a signal cross the sky. Come up when the village is quiet.',
      'Stay. If a way home shows up, we can look at it together and decide then.',
    ]),
  },
  elowen: {
    id: 'elowen',
    name: 'Elowen',
    title: 'Innkeeper',
    age: 29,
    personality: 'Warm, precise, and a little teasing once the kettle is respected.',
    loved: ['turnip_soup', 'radish'],
    liked: ['turnip', 'radish_skillet'],
    disliked: ['carrot'],
    refuse: 'Raw carrot on my counter? It can come back when it has met a pot.',
    workplace: 'inn',
    hireLock: 'The inn is standing. Reach Friend and she will mind the heart of the place.',
    perk: 'Warm plates: filling an order gives +1 heart.',
    romance: false,
    hp: 36,
    atk: 6,
    look: { hair: '#1d3a28', skin: '#f6d3b8', cloth: '#f4f7f2', eye: '#2f8a45', extra: 'braid' },
    lines: lines([
      'The kettle is already hot. I’m Elowen. Sit if you have something worth cooking.',
      'One braid, one ladle, one rule: the skillet gets a minute of quiet.',
      'The inn sign creaks. Garrick will scold it. I like the creak. It means people are coming.',
      'Hire me and every plate you carry lands with a little more friendship on it.',
      'I left a louder wood once. This kitchen, and the braid I refused to cut, are why I stayed.',
      'Anniversary stew is on the day the inn was raised. You are invited. Bring a spoon and a story.',
      'Best friend is the right size of promise. I will keep your bowl on the hook by the door.',
    ]),
  },
  garrick: {
    id: 'garrick',
    name: 'Garrick',
    title: 'Carpenter',
    age: 35,
    personality: 'A gentle giant with a tool belt and an endless supply of dad jokes.',
    loved: ['radish', 'turnip'],
    liked: ['turnip_soup'],
    disliked: ['berry_cup'],
    refuse: 'Pretty, and it would not survive my pocket. Bring me something that can take a hammer.',
    workplace: 'house',
    hireLock: 'Your house is already up. Friend, and he will build on your clock.',
    perk: 'Building timers finish 20% sooner.',
    romance: false,
    hp: 42,
    atk: 8,
    look: { hair: '#3a3532', skin: '#d7a57a', cloth: '#c47a45', eye: '#6b4a2a', extra: 'beard' },
    lines: lines([
      'House was leaning. I straightened it before you woke up in it. Garrick. I build, and I apologize for the jokes in advance.',
      'Nails, levels, and a bridge that wants mending. You can hand me lumber or just hand me company.',
      'A good beam is a promise. You seem like you keep those. The village could use more.',
      'Hire me and every raise of a wall takes a shorter breath.',
      'I lost a workshop in a flood once. This belt is the part I carried out. You can ask about the rest when the saw is quiet.',
      'There is a treehouse that only exists in my head. We could give it legs.',
      'Best friend. I’ll carve it somewhere discreet, like a lintel only we look up at.',
    ]),
  },
  aldric: {
    id: 'aldric',
    name: 'Mayor Aldric',
    title: 'Village mayor',
    age: 45,
    personality: 'Fussy, proud of the charter, and deeply caring underneath the sash.',
    loved: ['turnip_soup', 'carrot_tea'],
    liked: ['turnip'],
    disliked: ['radish'],
    refuse: 'A radish is a fine vegetable and a poor gift for a mayor. Surprise me with a bowl.',
    workplace: 'hall',
    hireLock: 'The Town Hall is his second home. Friend, and he will hurry its next floor.',
    perk: 'Town Hall upgrades finish 15% sooner.',
    romance: false,
    hp: 32,
    atk: 5,
    look: { hair: '#f4f1ea', skin: '#e7c2a4', cloth: '#3f6b45', eye: '#6a4632', extra: 'mustache' },
    lines: lines([
      'Mayor Aldric. The charter is older than my mustache and only slightly more formal. Welcome to the ledger.',
      'Walk the square with me. House, inn, field, hall. Four things, and a tax that believes in us.',
      'When you sign the next improvement, sign it like you live here. Because you do.',
      'Advise me. Hire is a grand word for it. You would simply stand on the side of the village.',
      'The founding of this place involves a phone and a promise. I will tell you which one came first when the hall is taller.',
      'I would name you deputy if the sash had a second pin. Consider this the pin.',
      'Best friend of the mayor is a civic title. I am making it up, and I am keeping it.',
    ]),
  },
  rokha: {
    id: 'rokha',
    name: 'Rokha',
    title: 'Town keeper',
    age: 31,
    personality: 'Steady and dry. She keeps the square swept and the leaning things on a list.',
    loved: ['turnip_soup', 'radish'],
    liked: ['turnip', 'cabbage'],
    disliked: ['berry_cup'],
    refuse: 'Too sweet for a morning round. Bring me something that survives a walk.',
    workplace: 'hall',
    hireLock: 'The square is already her round. Reach Friend and she will hurry the walls.',
    perk: 'Town rounds: building timers finish 10% sooner.',
    romance: false,
    hp: 38,
    atk: 8,
    look: { hair: '#241c18', skin: '#7ea86a', cloth: '#6a4632', eye: '#5a3a28', extra: 'none' },
    lines: lines([
      'Rokha. I keep the square, the steps, and the list of things that lean. You just arrived, so you are on the list.',
      'The beds can slide. The hall cannot. If you move the garden, leave me a path around it.',
      'Elowen’s sign creaks on purpose. I have decided not to fix that one.',
      'Hire me and the raising of a wall takes a shorter breath. Garrick still gets the credit. I get the round.',
      'I walked a louder city once. This square is small enough to know by heart. I would like help knowing it.',
      'Dusk is when the lane is honest. Walk it with me when the tax clock is quiet.',
      'Best friend. I will save you the dry step by the hall, the one that does not puddle.',
    ]),
  },
  lila: {
    id: 'lila',
    name: 'Lila',
    title: 'Café owner',
    age: 24,
    personality: 'A bubbly perfectionist who stress-bakes.',
    loved: ['berry_cup', 'strawberry'],
    liked: ['carrot_tea', 'carrot'],
    disliked: ['radish'],
    refuse: 'Radishes are honest and they are not on my menu. Try me with fruit.',
    workplace: 'cafe',
    hireLock: 'The café has to open. Town Hall 2, then a Friend who can run a rush hour.',
    perk: 'Café dishes sell for 15% more glim.',
    romance: true,
    hp: 30,
    atk: 6,
    look: { hair: '#8a5a3c', skin: '#f0c8aa', cloth: '#f4efe6', eye: '#3d7a45', extra: 'none' },
    lines: lines([
      'We are out of milk and I refuse to panic where customers can see. I’m Lila. You look like someone who carries things.',
      'Taste this. If you wince I will start over, and I will smile the entire time.',
      'Rush hour is a sport. I would like a teammate who does not drop the pretty plates.',
      'Hire me and the café’s prices stand up a little straighter.',
      'A rival café opened in my head at 2 a.m. Then I baked until it closed. Stay for the end of the tray.',
      'The kitchen after close is the softest room in town. I saved you the corner stool.',
      'Heartmark. I will put it on the specials board in very small letters, which is how I say large things.',
    ]),
  },
  ren: {
    id: 'ren',
    name: 'Ren',
    title: 'Barista',
    age: 26,
    personality: 'Quiet, precise, dry humor, glasses always a little fogged.',
    loved: ['carrot_tea', 'turnip_soup'],
    liked: ['carrot'],
    disliked: ['radish'],
    refuse: 'I respect a radish. I do not drink one.',
    workplace: 'cafe',
    hireLock: 'He works once the café has a counter. Friend, and the kettles hurry.',
    perk: 'Careful hands: cooking grants extra XP.',
    romance: true,
    hp: 28,
    atk: 6,
    look: { hair: '#1c1c1c', skin: '#e8c4a4', cloth: '#2c2c2c', eye: '#5d6570', extra: 'glasses' },
    lines: lines([
      'Ren. I pull the bitterest cup in the village. You may order it. You may also admit defeat.',
      'I drew your face in the foam. It lasted four seconds. A personal record.',
      'Bake with me. I will pretend the scores are not the point. They are a little the point.',
      'Hire me and every dish you cook teaches you a bit more.',
      'I burned out in a louder kitchen. This one has a window. I would like you to stand in that window sometimes.',
      'After hours, the tasting is quiet on purpose. Your name is on the list. The list is me.',
      'Heartmark. I will not make a speech. I warmed a cup, and I am still here.',
    ]),
  },
  hana: {
    id: 'hana',
    name: 'Hana',
    title: 'Garden keeper',
    age: 26,
    personality: 'Shy, poetic, and on speaking terms with the plants.',
    loved: ['strawberry', 'berry_cup'],
    liked: ['radish'],
    disliked: ['turnip'],
    refuse: 'Turnips shout. My beds prefer a whisper. Flowers, fruit, something gentle.',
    workplace: 'garden',
    hireLock: 'The garden opens with Town Hall 2. Friend, and she will share the beds.',
    perk: 'Strawberry harvests yield one extra.',
    romance: true,
    hp: 30,
    atk: 6,
    look: { hair: '#2a2428', skin: '#f0c6aa', cloth: '#dfe6c8', eye: '#6a4ad4', extra: 'sunhat' },
    lines: lines([
      'The community bed is wilting and I was talking to it. I’m Hana. You can talk to me instead, if that’s easier.',
      'I named a flower after the way you stand still. It is a small flower. It is trying.',
      'There is a bulb that only shows itself to patient people. We can be patient together.',
      'Hire me and the strawberries remember to bring a friend.',
      'A blight came through last year. I stayed up with a lantern. I would share that lantern now.',
      'The meadow keeps fireflies like secrets. Walk out with me when they start gossiping.',
      'Heartmark. I will not say it louder than the bees. I did say it.',
    ]),
  },
  theo: {
    id: 'theo',
    name: 'Theo',
    title: 'Herbalist',
    age: 27,
    personality: 'Sunny, earnest, and unable to stop talking about soil.',
    loved: ['carrot', 'carrot_tea'],
    liked: ['radish'],
    disliked: ['berry_cup'],
    refuse: 'Dessert is a celebration. I brought you a lecture about compost. Trade me?',
    workplace: 'garden',
    hireLock: 'He argues with Hana in the garden once Town Hall 2 is up. Friend, and the watering lasts.',
    perk: 'A drink on the roots hurries a crop even more.',
    romance: true,
    hp: 32,
    atk: 6,
    look: { hair: '#e2c07a', skin: '#f3d0b0', cloth: '#7ea35a', eye: '#3e7a32', extra: 'hat' },
    lines: lines([
      'Theo. The compost is correct and Hana is also correct and I am having a wonderful disagreement.',
      'I tested your soil. It likes you. That is not a metaphor, though I am happy to provide one.',
      'A greenhouse is a pocket of weather you get to keep. Help me imagine the glass.',
      'Hire me and every watering soaks in deeper.',
      'Drought plans are love letters to next month. I would like your handwriting on mine.',
      'Picnic. Greenhouse. I packed the earnest sandwiches. There are two.',
      'Heartmark. I will press it in a book next to a leaf, which is the highest shelf I own.',
    ]),
  },
  kenji: {
    id: 'kenji',
    name: 'Kenji',
    title: 'Rancher',
    age: 28,
    personality: 'Laid-back, loyal, and bad at words in a way he has made peace with.',
    loved: ['turnip', 'radish'],
    liked: ['turnip_soup'],
    disliked: ['berry_cup'],
    refuse: 'Too pink, too sweet. The cows would side with me.',
    workplace: 'barn',
    hireLock: 'The barn opens at Town Hall 2. Friend, and he will stand between you and a bad day.',
    perk: 'Fresh harvests toss you an extra glim.',
    romance: true,
    hp: 40,
    atk: 9,
    look: { hair: '#6b4a32', skin: '#e0b48e', cloth: '#8f4a3a', eye: '#7a8a45', extra: 'hat' },
    lines: lines([
      'Cow got out. Again. I’m Kenji. If you see a polite animal with opinions, send her toward the barn.',
      'I named a calf after the way you say good morning. She does not answer to it. I still like it.',
      'Barn raising is just holding things until they agree to stay. You are good at staying.',
      'Hire me. I’ll walk the field with you, and ripe crops will leave a coin in your palm.',
      'Wolves came once. We stayed up. I can tell it plain, if you want the plain version.',
      'Hayride, stars, no speech. I will bring the blanket and forget half the words. The good half can stay.',
      'Heartmark. I warmed the bench. That is the whole sentence I practiced.',
    ]),
  },
}

export const TH1_IDS: VillagerId[] = ['miri', 'lumi', 'elowen', 'garrick', 'aldric', 'rokha']
export const TH2_IDS: VillagerId[] = ['lila', 'ren', 'hana', 'theo', 'kenji']
export const VILLAGER_IDS = Object.keys(VILLAGERS) as VillagerId[]

export function villagerDef(id: VillagerId): VillagerDef {
  return VILLAGERS[id]
}

export function isHired(state: { villagers: Pick<VillagerState, 'id' | 'hired'>[] }, id: VillagerId): boolean {
  return state.villagers.some((villager) => villager.id === id && villager.hired)
}

export const TIERS_INFO: { id: FriendshipTier; label: string; min: number }[] = [
  { id: 'stranger', label: 'Stranger', min: 0 },
  { id: 'acquaintance', label: 'Acquaintance', min: 10 },
  { id: 'friendly', label: 'Friendly', min: 25 },
  { id: 'friend', label: 'Friend', min: HIRE_AT },
  { id: 'close', label: 'Close', min: 60 },
  { id: 'trusted', label: 'Trusted', min: 75 },
  { id: 'heartmark', label: 'Heartmark', min: HEARTMARK_AT },
]

export function tierFor(friendship: number): (typeof TIERS_INFO)[number] {
  let current = TIERS_INFO[0]
  for (const tier of TIERS_INFO) {
    if (friendship >= tier.min) current = tier
  }
  return current
}

export function tierLabel(friendship: number, romance: boolean): string {
  const tier = tierFor(friendship)
  if (tier.id === 'heartmark' && !romance) return 'Best Friend'
  return tier.label
}

export function tasteOf(id: VillagerId, item: ItemId): Taste {
  const villager = VILLAGERS[id]
  if (villager.loved.includes(item)) return 'loved'
  if (villager.liked.includes(item)) return 'liked'
  if (villager.disliked.includes(item)) return 'disliked'
  return 'neutral'
}

export function dialogueFor(id: VillagerId, friendship: number, day: number): string {
  const pool = VILLAGERS[id].lines[tierFor(friendship).id]
  return pool[Math.abs(day) % pool.length] ?? pool[0] ?? ''
}

export function cropUnlocked(crop: CropId, hallLevel: number): boolean {
  return hallLevel >= CROPS[crop].hall
}

export function xpToNext(level: number): number {
  return 40 + (level - 1) * 25
}

export type HallNext = {
  level: number
  cost: number
  ms: number
  unlocks: string
}

const HALL_LADDER: HallNext[] = [
  { level: 2, cost: 500, ms: 2 * 60_000, unlocks: 'Café, barn, and the potting shed. Lila, Ren, Hana, Theo, and Kenji arrive.' },
  { level: 3, cost: 2_000, ms: 15 * 60_000, unlocks: 'Forge, forest gate, the weekend caravan, and festivals.' },
  { level: 4, cost: 6_000, ms: 60 * 60_000, unlocks: 'Boutique, clinic, and bakery. The garden beds stay six by six.' },
  { level: 5, cost: 15_000, ms: 2 * 60 * 60_000, unlocks: 'Harbor, fishing pier, and rooms for visitors.' },
  { level: 6, cost: 35_000, ms: 4 * 60 * 60_000, unlocks: 'The mountain shrine, an orchard, and pumpkins.' },
  { level: 7, cost: 75_000, ms: 6 * 60 * 60_000, unlocks: 'The Signal Tower story, a greenhouse, and moonflowers.' },
  { level: 8, cost: 150_000, ms: 8 * 60 * 60_000, unlocks: 'A second island and the kingdom road.' },
  { level: 9, cost: 300_000, ms: 10 * 60 * 60_000, unlocks: 'The mansion house, and a chapel for a later promise.' },
  { level: 10, cost: 600_000, ms: 12 * 60 * 60_000, unlocks: 'The Gate. An ending, when that chapter is written.' },
]

export function nextHall(level: number): HallNext | null {
  return HALL_LADDER.find((row) => row.level === level + 1) ?? null
}

export function hallDuration(level: number, state: { villagers: Pick<VillagerState, 'id' | 'hired'>[] }): number {
  const next = nextHall(level)
  if (!next) return 0
  let ms = next.ms
  if (isHired(state, 'aldric')) ms = Math.round(ms * 0.85)
  if (isHired(state, 'garrick')) ms = Math.round(ms * 0.8)
  return ms
}

export type BuildingTier = {
  level: number
  cost: number
  ms: number
  hall: number
  effect: string
}

export type BuildingDef = {
  id: BuildingId
  name: string
  blurb: string
  tiers: BuildingTier[]
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  house: {
    id: 'house',
    name: 'Cottage',
    blurb: 'Your thatched house, already standing, with a lantern by the door.',
    tiers: [
      { level: 2, cost: 30, ms: 40_000, hall: 1, effect: 'A warmer hearth and a second lantern.' },
      { level: 3, cost: 140, ms: 3 * 60_000, hall: 2, effect: 'A spare room under the eaves.' },
    ],
  },
  inn: {
    id: 'inn',
    name: 'Inn',
    blurb: 'Elowen’s kettle. Radish skillets and turnip soup start here.',
    tiers: [
      { level: 2, cost: 40, ms: 50_000, hall: 1, effect: 'A wider kettle. Meals sell for a little more.' },
      { level: 3, cost: 180, ms: 3 * 60_000, hall: 2, effect: 'A dining room that can hold a festival spillover.' },
    ],
  },
  cafe: {
    id: 'cafe',
    name: 'Café',
    blurb: 'Lila’s counter. Opens with Town Hall 2, along with sweeter recipes.',
    tiers: [
      { level: 1, cost: 200, ms: 90_000, hall: 2, effect: 'The café opens. Carrot tea and berry cups.' },
      { level: 2, cost: 450, ms: 4 * 60_000, hall: 3, effect: 'A pastry case and a second kettle.' },
    ],
  },
  barn: {
    id: 'barn',
    name: 'Barn',
    blurb: 'Kenji’s barn. The cows are a promise for a later week. The walls can rise now.',
    tiers: [
      { level: 1, cost: 180, ms: 90_000, hall: 2, effect: 'The barn stands. Kenji can be hired.' },
      { level: 2, cost: 400, ms: 4 * 60_000, hall: 3, effect: 'A hayloft and a wider door.' },
    ],
  },
  garden: {
    id: 'garden',
    name: 'Garden',
    blurb: 'The potting shed beside the beds. The six-by-six soil can move. Hana and Theo take a job here.',
    tiers: [
      { level: 1, cost: 160, ms: 75_000, hall: 2, effect: 'The garden opens for Hana and Theo.' },
      { level: 2, cost: 360, ms: 4 * 60_000, hall: 3, effect: 'A potting shed and deeper beds.' },
    ],
  },
}

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[]

export function nextTier(id: BuildingId, level: number): BuildingTier | null {
  return BUILDINGS[id].tiers.find((tier) => tier.level === level + 1) ?? null
}

export function buildingDuration(id: BuildingId, level: number, state: { villagers: Pick<VillagerState, 'id' | 'hired'>[] }): number {
  const tier = nextTier(id, level)
  if (!tier) return 0
  let ms = tier.ms
  if (isHired(state, 'garrick')) ms = Math.round(ms * 0.8)
  if (isHired(state, 'rokha')) ms = Math.round(ms * 0.9)
  return ms
}

export const GUILD_MASTER = {
  id: 'vale' as const,
  name: 'Vale',
  title: 'Guildmaster',
  age: 36,
  personality: 'Steady, wry, and impossible to rush. She files swords and taxes with the same hand.',
  look: { hair: '#8a3d2a', skin: '#c68642', cloth: '#6e8b4e', eye: '#2f6b45', extra: 'clasp' as const },
  greeting:
    'Vale Hart, guildmaster. The king taxes every village with a pulse. Sign the ledger and I will point you at work that pays in glim, experience, and the odd wobbling souvenir.',
  signed:
    'Your name is in the book. Slimes first. They have been sitting in the south lane like they pay rent. Goblins come after, and they do not.',
}

export type EnemyKind = 'slime' | 'goblin'

export const ENEMIES: Record<EnemyKind, { name: string; hp: number; atk: number; def: number; tint: string }> = {
  slime: { name: 'Garden Slime', hp: 18, atk: 5, def: 1, tint: '#8fd06a' },
  goblin: { name: 'Lane Goblin', hp: 26, atk: 7, def: 2, tint: '#6d8a45' },
}

export type MissionDef = {
  id: MissionId
  name: string
  detail: string
  enemies: EnemyKind[]
  glim: number
  xp: number
  stardust: number
  materials: { id: 'slime_gel' | 'goblin_scrap'; qty: number }[]
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'slime_patch',
    name: 'Slime in the patch',
    detail: 'One garden slime has claimed a radish top. Introduce yourself.',
    enemies: ['slime'],
    glim: 18,
    xp: 20,
    stardust: 0,
    materials: [{ id: 'slime_gel', qty: 1 }],
  },
  {
    id: 'slime_pair',
    name: 'Two slimes',
    detail: 'They split. Or they were always a pair. Either way, the lane is sticky.',
    enemies: ['slime', 'slime'],
    glim: 28,
    xp: 32,
    stardust: 0,
    materials: [{ id: 'slime_gel', qty: 2 }],
  },
  {
    id: 'goblin_scout',
    name: 'Goblin scout',
    detail: 'A scout with a bent buckle and too much confidence.',
    enemies: ['goblin'],
    glim: 40,
    xp: 48,
    stardust: 1,
    materials: [{ id: 'goblin_scrap', qty: 1 }],
  },
  {
    id: 'mixed_lane',
    name: 'Sticky company',
    detail: 'A slime and a goblin are collaborating. Poorly.',
    enemies: ['slime', 'goblin'],
    glim: 55,
    xp: 60,
    stardust: 0,
    materials: [
      { id: 'slime_gel', qty: 1 },
      { id: 'goblin_scrap', qty: 1 },
    ],
  },
  {
    id: 'goblin_pair',
    name: 'Goblin pair',
    detail: 'Two of them, and a rumor of a third who had somewhere else to be.',
    enemies: ['goblin', 'goblin'],
    glim: 75,
    xp: 80,
    stardust: 1,
    materials: [{ id: 'goblin_scrap', qty: 2 }],
  },
]

export function missionUnlocked(cleared: Partial<Record<MissionId, number>>, id: MissionId): boolean {
  const index = MISSIONS.findIndex((mission) => mission.id === id)
  if (index <= 0) return true
  const prev = MISSIONS[index - 1]
  return (cleared[prev.id] ?? 0) > 0
}

export function playerCombat(level: number): { hp: number; atk: number; def: number } {
  return { hp: 56 + (level - 1) * 6, atk: 9 + (level - 1), def: 2 }
}

const REQUESTS: Record<VillagerId, Request[]> = {
  miri: [
    { item: 'radish_skillet', reward: 28, hearts: 6 },
    { item: 'turnip', reward: 16, hearts: 4 },
    { item: 'turnip_soup', reward: 30, hearts: 5 },
  ],
  lumi: [
    { item: 'turnip', reward: 16, hearts: 4 },
    { item: 'radish_skillet', reward: 24, hearts: 5 },
  ],
  elowen: [
    { item: 'turnip_soup', reward: 30, hearts: 5 },
    { item: 'radish', reward: 12, hearts: 3 },
  ],
  rokha: [
    { item: 'radish', reward: 12, hearts: 3 },
    { item: 'turnip_soup', reward: 26, hearts: 4 },
  ],
  garrick: [
    { item: 'radish', reward: 12, hearts: 3 },
    { item: 'turnip', reward: 16, hearts: 4 },
  ],
  aldric: [
    { item: 'turnip_soup', reward: 26, hearts: 4 },
    { item: 'turnip', reward: 16, hearts: 3 },
  ],
  lila: [
    { item: 'strawberry', reward: 30, hearts: 5 },
    { item: 'berry_cup', reward: 52, hearts: 6 },
  ],
  ren: [
    { item: 'carrot_tea', reward: 26, hearts: 5 },
    { item: 'carrot', reward: 20, hearts: 4 },
  ],
  hana: [
    { item: 'strawberry', reward: 30, hearts: 5 },
    { item: 'radish', reward: 12, hearts: 3 },
  ],
  theo: [
    { item: 'carrot', reward: 20, hearts: 4 },
    { item: 'carrot_tea', reward: 26, hearts: 5 },
  ],
  kenji: [
    { item: 'turnip', reward: 16, hearts: 4 },
    { item: 'radish', reward: 12, hearts: 3 },
  ],
}

const DAY_ONE: Partial<Record<VillagerId, ItemId>> = {
  miri: 'radish_skillet',
  lumi: 'turnip',
  elowen: 'turnip_soup',
  rokha: 'radish',
  garrick: 'radish',
  aldric: 'turnip_soup',
}

function hash(text: string): number {
  return [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rollRequest(id: VillagerId, day: number): Request {
  const pool = REQUESTS[id]
  if (day <= 1) {
    const item = DAY_ONE[id]
    return pool.find((request) => request.item === item) ?? pool[0]
  }
  const rng = mulberry32(hash(id) * 13 + day * 97)
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]
}

export function makeGoals(day: number, extra: boolean): Goal[] {
  const goals: Goal[] = [
    {
      id: `d${day}-harvest`,
      metric: 'harvest',
      target: 1,
      progress: 0,
      rewardGlim: 8,
      rewardXp: 8,
      claimed: false,
      title: 'Bring something in',
      detail: 'Harvest a crop.',
    },
    {
      id: `d${day}-hello`,
      metric: 'talk',
      target: 1,
      progress: 0,
      rewardGlim: 6,
      rewardXp: 6,
      claimed: false,
      title: 'Say hello',
      detail: 'Talk with a neighbor.',
    },
  ]
  if (extra) {
    goals.push({
      id: `d${day}-cook`,
      metric: 'cook',
      target: 1,
      progress: 0,
      rewardGlim: 8,
      rewardXp: 8,
      claimed: false,
      title: 'A warm plate',
      detail: 'Cook a dish. Lumi kept this goal from slipping.',
    })
  }
  return goals
}

export type Mark = { label: string; state: 'done' | 'now' | 'soon' }

export function tutorialMarks(step: TutorialStep, ready: boolean): Mark[] {
  const past = (done: boolean, current: boolean): Mark['state'] => (done ? 'done' : current ? 'now' : 'soon')
  return [
    { label: 'Plant a radish', state: past(step !== 'plant', step === 'plant') },
    { label: 'Wait for it to grow', state: past(step !== 'plant' && !(step === 'grow' && !ready), step === 'grow' && !ready) },
    { label: 'Harvest it', state: past(step === 'cook' || step === 'deliver' || step === 'done', step === 'grow' && ready) },
    { label: 'Cook it at the inn', state: past(step === 'deliver' || step === 'done', step === 'cook') },
    { label: 'Serve or sell it for glim', state: past(step === 'done', step === 'deliver') },
  ]
}

export function seasonLabel(season: SeasonId): string {
  if (season === 'early-spring') return 'Early spring'
  return season
}

export function growDuration(crop: CropId, watered: boolean, villagers: Pick<VillagerState, 'id' | 'hired'>[]): number {
  let ms = CROPS[crop].ms
  if (watered) ms = Math.round(ms * (isHired({ villagers }, 'theo') ? 0.6 : 0.8))
  if (isHired({ villagers }, 'miri')) ms = Math.round(ms * 0.9)
  return ms
}

export function growthOf(plot: Plot, villagers: Pick<VillagerState, 'id' | 'hired'>[], now: number) {
  if (!plot.crop || plot.plantedAt == null) return null
  const ms = growDuration(plot.crop, plot.watered, villagers)
  const elapsed = Math.max(0, now - plot.plantedAt)
  return {
    ms,
    ready: elapsed >= ms,
    stale: elapsed >= ms * 2,
    remainingMs: Math.max(0, ms - elapsed),
    fraction: Math.min(1, elapsed / ms),
  }
}

export function priceOf(
  id: ItemId,
  stale: boolean,
  villagers: Pick<VillagerState, 'id' | 'hired'>[],
  innLevel: number,
): number {
  const base = itemDef(id).sell
  if (base == null) return 0
  let price = base
  if (itemDef(id).kind === 'meal' && isHired({ villagers }, 'lila')) price = Math.round(price * 1.15)
  if (itemDef(id).kind === 'meal' && innLevel >= 2) price = Math.round(price * 1.1)
  if (stale) price = Math.max(1, Math.floor(price / 2))
  return price
}

export function timerLabel(ms: number): string {
  return formatLeft(ms)
}
