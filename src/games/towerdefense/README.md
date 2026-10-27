# Tower Defense

**Status:** ✅ Playable · **Difficulty to build:** ★★★★ (path generation, waves, targeting, economy, combos, placement UI, save)

## Rules

- Each game generates a new **semi-random path** on a 29×17 grid. The path never loops on itself, starts on the
  left edge and ends on another side, and is **73–120 tiles long** (about 113 on average). Between two parts of the
  path there are **mostly 2 or 3 free tiles** (sometimes 1), so you can build on every side of it, and the path winds
  over the whole map: of 300 generated paths, the one with the most tiles within 3 tiles of it is kept.
- Build towers on any free tile (not on the path) with coins. You start with **300 coins** and **20 lives**.
  Game over at 0 lives. Endless: your best wave is saved.
- **Waves** start on a timer (the first one after 20 s), even if the previous wave is still alive. The timer grows with
  the number of enemies: **30 s** at wave 1, 38 s at wave 10, 47 s at wave 20, **60 s from wave 35** (75 enemies).
  A full wave takes about 26 s to spawn, so the last boss of a wave has about 30 s before the next wave starts.
  As soon as every enemy is dead, the next wave starts after a 2 s breather instead of waiting for the clock.
  **Send** starts the next wave right away and pays 1 coin per second skipped.
- **Next wave preview**: the strip above the map shows the next wave's size, its share of each enemy type and its bosses.
- **Pause and menu**: ❚❚ (or P) pauses at any moment. Going back to the menu (✕) pauses the game and keeps it while
  the app is open: coming back to Tower Defense continues exactly where you were.
- **Save and resume**: the game is saved **once per wave, just before the wave starts**. After closing the app,
  Tower Defense asks "Resume wave N?" → **Continue** restarts that wave from its beginning (paused) or **New game**.
  There is no save in the middle of a wave. The save is deleted at game over.

## Shapes: towers and enemies

Each shape is both a tower and an enemy. A tower does **×1.5 damage to its own shape** and **×0.6 to the others**.

| Shape    | Color  | Tower    | Attack                                                                                                                                                      | Cost | Range | Rate  | Damage |
| -------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ----- | ------ |
| Circle   | green  | Pulse    | hits every enemy in range                                                                                                                                   | 60   | 1.5   | 0.8/s | 10     |
| Diamond  | red    | Flame    | cone toward the target + burn (2 s)                                                                                                                         | 80   | 1.5   | 5/s   | 1.6    |
| Triangle | yellow | Rifle    | fast homing bullets                                                                                                                                         | 50   | 2.5   | 2/s   | 5      |
| Square   | blue   | Sniper   | instant long-range shot                                                                                                                                     | 100  | 4.9   | 0.5/s | 21     |
| Star     | purple | Poison   | homing dart; each hit adds a poison stack (dps = dart damage, 4 s, up to 5 stacks)                                                                          | 70   | 2.1   | 1/s   | 5.8    |
| Pentagon | orange | Piercer  | straight arrow that passes through **3 enemies** (9 from level 10)                                                                                          | 45   | 2.1   | 1.2/s | 4.6    |
| Hexagon  | cyan   | Frost    | small damage to all in range + **slow 25%** for 1.5 s (39% from level 10)                                                                                   | 70   | 1.5   | 1/s   | 5      |
| Octagon  | pink   | Electric | lightning: 100% to the target, then **70% to the next 2 enemies behind it** on the path (8 from level 10); each jump reaches at most 1.5 tiles further back | 75   | 2     | 0.9/s | 8      |

| Enemy    | Power                                                                                      | HP  | Speed | Coins per kill | Lives lost at the end |
| -------- | ------------------------------------------------------------------------------------------ | --- | ----- | -------------- | --------------------- |
| Circle   | **Regeneration**: heals 2 HP/s                                                             | 30  | 1.6   | 4              | 1                     |
| Diamond  | **Shield**: 32-point shield absorbs damage first, refills after 2 s without being hit      | 28  | 1.5   | 5              | 2                     |
| Triangle | **Speed**: very fast, low HP                                                               | 26  | 3.6   | 5              | 1                     |
| Square   | **Tank**: lots of HP, slow                                                                 | 210 | 0.95  | 8              | 3                     |
| Star     | **Armor**: every direct hit is reduced by 5 (at least 20% still goes through)              | 58  | 1.5   | 6              | 2                     |
| Pentagon | **Splitter**: on death splits into 3 small, faster copies (1 coin, 1 life each)            | 48  | 1.6   | 4              | 1                     |
| Hexagon  | **Blink**: teleports 3 tiles forward every 4 s (slowed enemies blink less often)           | 40  | 1.7   | 6              | 2                     |
| Octagon  | **Summoner**: drops a small minion behind itself every 2 s (15% of its HP, 1 coin, 1 life) | 64  | 1.4   | 6              | 2                     |

- Coins per kill also get **+1 every 12 waves** (+1 at wave 12, +5 at wave 60).
- **Bosses**: ×10 HP and coins, ×5 lives lost, ×5 shield/regeneration, ×2 armor, slower, drawn bigger.
  Early bosses are weaker: 60% of that strength at wave 5, 80% at wave 10, full strength from wave 15.
  A Pentagon boss splits into 4 regular splitters; an Octagon boss summons twice as often.
- Damage over time (Flame burn, Poison) ignores armor, which is why Poison counters Armor.

### Boss powers

Each boss also has one **boss power**. A dashed circle in the boss's color shows its zone (2 tiles, 3 for the Square).
Auras only affect **normal enemies** (split copies and minions included, other bosses not), and two bosses of the same
type don't stack.

| Boss     | Power            | Effect                                                                                                                                           |
| -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Triangle | **Haste aura**   | Normal enemies within 2 tiles move **+40% faster**.                                                                                              |
| Circle   | **Healing aura** | Normal enemies within 2 tiles heal **5% of their max HP per second** (on top of their own regeneration).                                         |
| Diamond  | **Shield pulse** | Every **5 s**, normal enemies within 2 tiles get a shield worth **50% of their max HP**. It absorbs hits first and never refills between pulses. |
| Star     | **Armor pulse**  | Every **5 s**, normal enemies within 2 tiles get the armor of a normal Star of that wave for **2.5 s** (so half of the time).                    |
| Square   | **Taunt**        | Towers within **3 tiles** must target it (Pulse and Frost hit everything anyway; Electric still chains from it).                                 |
| Hexagon  | **Stun**         | Each time it blinks, towers within **1.5 tiles** of where it lands **stop for 2 s** (drawn with an X).                                           |
| Pentagon | **Swarm**        | While it lives, every normal enemy dying within 2 tiles of it leaves **1 small copy** (copies and minions don't).                                |
| Octagon  | **Portal**       | Every **6 s** it brings in a **full normal enemy** of a random unlocked type just behind itself (normal coins when killed).                      |

The first pulse or portal comes 2 s after the boss appears. On the map, an enemy with a boss shield has a thin outer
ring and one with boss armor a thick outline; tapping it lists the boss shield, boss armor, hasted and healed.
On the map, a slowed enemy has a dashed outline and a poisoned one a dot in its center.

- **Tap an enemy** to see its HP, speed, power values (shield, regen, armor, splits, blink, summon) and lives cost.

## Targeting

- Select a tower and tap **Target** (or press T): **First** (default, furthest along the path), **Nearest** (closest to
  the tower), or **Own shape** (the first enemy of the tower's own shape, where it does ×1.5 damage; if none is in range,
  it falls back to First). Pulse and Frost hit everything in range, so their row shows a greyed-out "Target: all in range".
- **All towers at once**: with no tower selected, the **All towers** button (or G) switches every tower's mode and
  becomes the mode of towers built afterwards.
- Each tower shows its mode as a small letter in its top-left corner: **F**, **N** or **S**.

## Combos

Two towers that are combo partners boost each other when placed **next to each other** (on one of the 8 tiles around).
Partners stack with **diminishing returns**: the 1st partner adds **+10%**, then +8%, +6%, +4%, +2%, and partners after
the 5th add nothing. Total: +10%, +18%, +24%, +28%, **+30% max** (5 partners). When the partners boost two different
stats, the total is shared between them in proportion (e.g. 3 Rifles + 1 Poison around a Sniper: +28% split into
+21% fire rate and +7% damage). The table shows the bonus of a single partner.
Every tower kind is in 2 combos:

| Combo         | Towers             | Bonus with one partner                     |
| ------------- | ------------------ | ------------------------------------------ |
| Cold snap     | Pulse + Frost      | Pulse +10% damage, Frost +10% slow         |
| Thermal shock | Frost + Flame      | Frost +10% fire rate, Flame +10% damage    |
| Toxic fire    | Flame + Poison     | both +10% damage over time (burn / poison) |
| Weak spot     | Poison + Sniper    | Poison +10% range, Sniper +10% damage      |
| Spotter       | Sniper + Rifle     | Sniper +10% fire rate, Rifle +10% range    |
| Crossfire     | Rifle + Piercer    | both +10% fire rate                        |
| Conductor     | Piercer + Electric | both +10% damage                           |
| Overcharge    | Electric + Pulse   | Electric +10% fire rate, Pulse +10% range  |

- **Placing a tower** is two taps: the first tap on a free tile shows a preview (ghost tower, range, **its combo bonus
  above it**, and **what each neighbouring partner would gain below them**); tap the same tile again to build, or
  another tile to compare. While a tower type is chosen, its partner towers on the map get a dashed outline.
- A tower with an active combo shows a small **★ badge**; selecting it lists its bonuses in the panel.

## Tower levels: upgrades and experience

- **No level limit.** Levels 1–10 add the same bonus each, so that a **level 10 tower does ×3 damage per second** (+200%):
  damage +11.1% per level (×2 at level 10), fire rate +5.6% (×1.5), range +3.3% (×1.3),
  Piercer 3 → 9 enemies, Frost slow 25% → 39%, Electric 2 → 8 jumps.
- **Above level 10**, each level multiplies damage by ×1.1 (fire rate, range, pierce, slow and jumps stay at their
  level-10 values), so a rich player can keep up with the endless enemy growth.
- **Upgrade** with coins: each level costs 35% more than the previous one (60% of the tower price for level 2).
  Example for the Sniper (100): 60, 81, 109, 148, 199, 269, 363, 490, 662.
- **Experience**: every kill is worth 1 XP (a boss 10), **shared by every tower that damaged the enemy**, in proportion
  to the damage each one did (burn and poison count for the tower that applied them). Towers early on the path that
  wear enemies down get experience too. Enemies reaching the end give no XP; a sold tower's share is lost.
  When the bar under the tower is full, the tower gains a **free level** and the bar resets. XP needed per level grows
  ×1.5: 15, 23, 34, 51, 76, 114, 171, 256, 384, 577 (level 10), 33253 (level 20). It grows faster than the upgrade
  price (×1.35), so XP stays a bonus next to coins: one XP saves about 4 coins on a level 1 Sniper upgrade, 1.5 at
  level 10 and 0.5 at level 20 (half that for a 50-coin Rifle).
- **XP discount**: the upgrade price is reduced by how full the bar is (half-full bar = half price). Buying the upgrade
  uses up that experience: the bar goes back to 0.
- The tower's color gets **darker with each level** up to level 10 (light yellow → dark yellow); above 10 the level number
  is written on the tower.
- Selling refunds **50% of the coins spent** on the tower (price + paid upgrades; free XP levels are not refunded).

## Lives and coins

- **Boss wave healing**: when every enemy of a boss wave is gone (split copies and minions included), you get back
  **30% of your lost lives**, rounded up (at least 1 if any life is missing). Examples: 10/20 → +3, 7/20 → +4, 19/20 → +1.
- **Streak**: every **5 waves in a row without losing a life** adds **+5% coins per kill** (+5% at 5 waves, +10% at 10, ...),
  up to **+25%** (25 waves).
  Losing any life resets it. The panel shows the bonus and the current streak.
- **Interest**: when a wave starts you earn **2% of the coins you hold** (no cap). Saving up pays a little.
- Short messages on the map show interest earned and lives healed.
- **Damage dealt**: each tower counts the damage it has done since it was built (shown as "dealt" when selected).
- **Game over summary**: lives lost per enemy type, and the damage done by each tower type (share in % and total).

## Wave progression

- **Enemy types** are introduced every 5 waves: Circle (wave 1), Diamond (6), Triangle (11), Square (16),
  Star (21), Pentagon (26), Hexagon (31), Octagon (36).
- **Number of enemies**: 5 + 2 × wave, max 75 (wave 1: 7, wave 10: 25, wave 20: 45, wave 35+: 75).
  They spawn one by one, 0.9 s apart at wave 1, down to 0.35 s from wave 28 (a full wave takes about 26 s).
- **Mix, waves 1–40**: every 3rd enemy is the newest type, the others are random among the unlocked types:

| Waves | Newest type    | Each other type |
| ----- | -------------- | --------------- |
| 1–5   | 100% Circle    | —               |
| 6–10  | 66.7% Diamond  | 33.3%           |
| 11–15 | 55.6% Triangle | 22.2%           |
| 16–20 | 50.0% Square   | 16.7%           |
| 21–25 | 46.7% Star     | 13.3%           |
| 26–30 | 44.4% Pentagon | 11.1%           |
| 31–35 | 42.9% Hexagon  | 9.5%            |
| 36–40 | 41.7% Octagon  | 8.3%            |

- **Mix, from wave 41**: every wave draws a random share per type (whole numbers, a type can have 0) and a random
  "spread", so some waves are dominated by one or two types and others are an even mix (about 36% of waves have one
  type at 40%+, about 29% have no type above 25%).
- **Enemy HP grows every wave**: ×1.03 per wave until wave 50, then ×1.04 (51–60) and **×1.05 per wave from wave 61**
  (cap). Total: ×1.8 at wave 20, ×2.7 at 35, ×4.3 at 50, ×13 at 75, ×44 at 100.
- **Special powers grow slower**, with the square root of the HP growth (×4 HP → ×2 power): shield, regeneration, armor,
  speed (up to ×2), blink distance (up to ×2), summon speed (up to ×2), and one more split copy per +50% power.
- **Bosses** come with every 5th wave, early enough to have normal enemies around them for their boss power: a single
  boss comes after the first quarter of the wave; several bosses are spread evenly from 25% to 85% of the wave, so
  you never fight two big bosses at the same time.

| Waves     | Bosses                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| 5 → 40    | 1 boss, in intro order: Circle, Diamond, Triangle, Square, Star, Pentagon, Hexagon, Octagon |
| 45 → 180  | 2 bosses: every pair of types (28 combinations)                                             |
| 185 → 460 | 3 bosses: every triple (56 combinations)                                                    |
| ...       | 4, 5, ... bosses the same way, then all 8 together, then one more each time                 |

## Controls

| Action                           | Keyboard   | Touch / mouse                                         |
| -------------------------------- | ---------- | ----------------------------------------------------- |
| Choose a tower to build          | 1–8        | Tap a tower in the side panel (tap again to cancel)   |
| Preview / build                  | —          | Tap a free tile / tap it again                        |
| Select a tower                   | —          | Tap it (shows range, level, XP, damage dealt, combos) |
| Enemy info                       | —          | Tap an enemy                                          |
| Upgrade / sell selected          | U / S      | **Up** / **Sell** buttons                             |
| Change target mode of selected   | T          | **Target** button                                     |
| Change target mode of all towers | G          | **All towers** button (when no tower is selected)     |
| Pause / speed ×2                 | P / F      | ❚❚ / ×2 buttons                                       |
| Send next wave now               | N or Space | **Send**                                              |
| Back to menu                     | Escape     | ✕                                                     |

## Code layout

| File              | Role                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `data.ts`         | **Balance tables**: towers, enemies, boss powers, combos, upgrade/XP costs, economy, colors.               |
| `waves.ts`        | **Wave schedule**: timing, size and mix, enemy stat growth, bosses, the spawn queue of a wave.             |
| `model.ts`        | Shared types (Enemy, Tower, projectiles, effects, stats).                                                  |
| `game.ts`         | Game state, player actions (build, upgrade, sell, targeting), combos, waves, economy; `simulate(dt)`.      |
| `enemies.ts`      | Enemy life cycle: spawning, burn/poison/regen/shield, movement, blink, summon, leaking, deaths and splits. |
|                   | Also the event boss powers: stun (on blink), portal, swarm (on death).                                     |
| `bosses.ts`       | Boss auras: haste and healing (every step), shield and armor pulses.                                       |
| `combat.ts`       | Tower attacks (one function per tower in `ATTACKS`), targeting (and taunt), projectiles, damage, armor and |
|                   | shields.                                                                                                   |
| `save.ts`         | Save / resume in localStorage.                                                                             |
| `render.ts`       | Drawing of the map, towers, enemies, projectiles and effects.                                              |
| `overlays.ts`     | Build preview with combo bonuses, next-wave strip, notes, game-over summary.                               |
| `shapes.ts`       | The 8 shapes, combo star badge, bars, compact numbers.                                                     |
| `panel.ts`        | The side panel: controls, shop, info lines, tower actions.                                                 |
| `towerdefense.ts` | The scene: input, layout, selection, resume prompt, autosave.                                              |
| `path.ts`         | Path generator (randomized depth-first search on a lattice of rows/columns 2–4 tiles apart).               |

## Possible improvements

Ideas not done yet, from the simplest to the biggest:

1. **Specialization at level 10**: choose one of two paths per tower (e.g. Sniper "pierce armor" or "×2 vs bosses").
2. **Sell confirmation** or an undo for the last build, to avoid costly mis-taps on small screens.
3. **Zoom** (pinch) on phones, for more comfortable tile tapping.
4. **Tower stats screen**: list of all towers with level, damage dealt and kills, sortable.
5. **Several map shapes** (different grid sizes, two entrances later in the game).
6. **Difficulty choice** at start (easy / normal / hard: starting coins, lives and growth rate).
7. **Code**: a small headless balance simulator script (like the bot used during development) as an npm script,
   to check the difficulty curve after balance changes.

## Design notes

- Positions are in tile units; enemies store `d`, the distance travelled along the path, which gives their position,
  the "furthest along" targeting and the Electric chain order for free.
- ×2 speed runs the simulation twice per frame, so the fixed 60 Hz timestep is kept.
- The next wave is decided when the current one starts, so the preview always matches what comes.
- Combo bonuses are recomputed only when a tower is built or sold.
- Balance check (headless bot building up to 30 towers at the tiles that cover the most path, upgrading the cheapest
  tower when that costs less than 40% of a new tower): the first leaks come around wave 50–60 and it loses around
  wave 57–76. Before the October 2026 rebalance (longer path, faster and tougher enemies, fewer coins) it reached
  wave 105–120 with almost no leaks.
