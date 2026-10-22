# Isekai'd, into my own phone!?

A mobile-first slow-life town builder. You were only going to check one more thing. Lumi reached through the glass, and the village on the other side has a tax to pay.

This build is the opening of the game: a tile-grid village, a guided first morning, real timers, and the Town Hall guild.

The currency is **glim**. **Stardust** is the rare timer-skip, earned from levels and contracts, never bought.

## Play

Hold the phone sideways. In portrait the game asks you to turn it. Drag to pan, pinch or scroll to zoom, and tap a tile to plant, talk, or open a building. Move garden shows the grid so the beds can slide.

1. **Intro.** Lumi explains the isekai and the king's tax. Miri meets you at the gate. Their portraits sit in the dialogue frame.
2. **First morning.** Plant a radish in the 6×6 garden (about a minute), harvest it, cook a skillet at Elowen's inn, and serve it to Miri or sell it. That pays your first glim. The tax clock is in the top bar. A bare tile can be left tilled, or planted with tomato, pumpkin, carrot, wheat, cabbage, strawberry, watermelon, or sunflower.
3. **Town Hall.** Vale, the guildmaster, signs you into five contracts: slimes, then goblins. Battles are turn-based: Attack, Skill, Defend, and Item. Wins pay glim, XP, and materials. Hired friends can stand with you.
4. **Upgrades.** The Town Hall ladder is the one in the design bible, from a free first floor to the Gate. Early raises are minutes. Later ones stretch toward half a day. Buildings have their own timers. Town Hall 2 opens the café, barn, potting shed, and the next five neighbors. The garden stays a movable 6×6.
5. **Kingdom.** The third tab in the Town Hall says the road opens at Town Hall 8. There is no realm behind it yet.
6. **Friends and the market.** The bottom bar is Goals, Friends, and Market. Hearts rise from a daily chat, a gift, or a filled order. At 40 hearts a neighbor can be hired for a perk. Heartmark at 90 is recorded and left for a later chapter.

Progress is saved in this browser under `localStorage` key `isekaid-into-my-own-phone`. Nothing is uploaded. Older saves from the first chapter do not carry over.

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123/isekai/](http://127.0.0.1:43123/isekai/)

The app is served under `/isekai/` unless `VITE_BASE` is set.

```bash
npm run build
npm run preview
```

Preview server: [http://127.0.0.1:43124/isekai/](http://127.0.0.1:43124/isekai/)

`npm run smoke` walks the tutorial, a tired crop, the tax, a guild fight, and a Town Hall raise with no browser. `npm run lint` runs oxlint.

## Romance hooks

This chapter does not date anyone.

- `GameState.dating` stays `null`.
- Each villager has `romanceRoute: null` and `heartmarkSeen`.
- Hearts run Stranger, Acquaintance (10), Friendly (25), Friend (40, can hire), Close (60), Trusted (75), Heartmark (90). Elowen, Rokha, Garrick, and Mayor Aldric stop at Best Friend.
- At Heartmark the card says a later chapter can open a route. No route id is written.

## Art

The town is a square tile map. Grass, paths, a pond, flower tiles, and building footprints share one grid. Hover and the open panel light a tile. Move garden draws a grid over every cell and a ghost of the 6×6 beds.

Elowen, the elf innkeeper, walks with a transparent four-frame sprite: front, back, left, right, one braid. Rokha, the half-orc town keeper, has her own four-frame sprite. Facing follows the step. The Town Hall and the inn use cropped building sprites. Other roofs are painted blocks on their footprints.

UI type is [Nunito](https://fonts.google.com/specimen/Nunito) by Vernon Adams, bundled under the SIL Open Font License (`src/assets/fonts`).

Lumi and Miri keep their full-size photographs in dialogue. Elowen and Rokha use cut-out portraits at the same resolution. Vale and the other neighbors use painted stand-ins in that frame.

## Who is here

At the start: Miri, Lumi, Elowen, Garrick, Mayor Aldric, and Rokha. Vale keeps the guild ledger inside the Town Hall.

After Town Hall 2: Lila, Ren, Hana, Theo, and Kenji.

## Roadmap

1. **The rest of the ladder.** Forge, harbor, shrine, and the Signal Tower, with the neighbors those floors invite.
2. **Kingdom.** The locked tab, once Town Hall 8 actually has a road to walk.
3. **Romance.** Heart events at Heartmark, with a route id and `dating` set only when a route starts.
4. **Portraits.** High-res art in every dialogue frame. Lumi and Miri are already there.
5. **The forge's materials.** Slime gel and goblin scrap are in the bag, waiting for a building that can spend them.
