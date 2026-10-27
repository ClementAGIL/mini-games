# Polygon Horde

**Status:** 🚧 First playable · **Difficulty to build:** ★★★★ (horde AI, auto weapons, XP/level-up, stat cards with rarity)

## Rules

- You are a **black filled circle** on an endless field. Enemies come from every side, endlessly. You only **move**:
  every weapon fires by itself. The run ends when your HP reaches 0. **Score = time survived** (best time is saved).
- Every run starts from zero: **100 HP**, the **Dart** weapon, no stats.
- **Getting hit**: contact or a bullet removes HP, then you are invulnerable for 0.5 s (you blink).

### Difficulty (endless)

Everything grows with the run clock (`t` in minutes):

| What                  | Growth                                         |
| --------------------- | ---------------------------------------------- |
| Enemies spawned per s | `0.8 + 0.45 t + 0.02 t²` (≈ 6/s at 10 min)     |
| Enemy HP              | ×1.19 per minute (×5.7 at 10 min, ×13.6 at 15) |
| Enemy damage          | +10% per minute                                |
| Enemy speed           | +2% per minute, at most +40%                   |

At most 350 enemies at once. Enemies that fall far behind are moved back near you.
New enemy types join over time (see the table). **Elites** come every minute and a **Boss** every 3 minutes
(no elite on boss minutes); each boss has +60% HP over the previous one on top of the normal growth.

### Enemies (color = role)

| Enemy    | Shape                               | Color  | From | HP  | Behavior                                                                                         |
| -------- | ----------------------------------- | ------ | ---- | --- | ------------------------------------------------------------------------------------------------ |
| Grunt    | triangle                            | red    | 0:00 | 10  | walks straight at you                                                                            |
| Runner   | thin triangle                       | orange | 1:00 | 6   | very fast, comes in packs of 4                                                                   |
| Shooter  | square                              | blue   | 2:00 | 14  | stays ~210 away, strafes, shoots a slow bullet every 2.5 s                                       |
| Dasher   | diamond                             | purple | 3:00 | 16  | stops, shows a warning line for 0.7 s, then charges along it                                     |
| Splitter | pentagon                            | teal   | 4:00 | 30  | splits into 3 Grunts when killed                                                                 |
| Tank     | big hexagon                         | green  | 5:00 | 80  | slow, heavy (no knockback), hits hard                                                            |
| Bomber   | circle with a fuse line             | yellow | 6:00 | 8   | runs at you, lights its fuse (0.6 s) and explodes; killed, it explodes too, hurting only enemies |
| Elite    | any type, ×1.6 size, double outline | same   | 1:00 | ×10 | +50% damage, drops a **chest** (1 free level-up)                                                 |
| Boss     | big star                            | gray   | 3:00 | 900 | cycles: chase → ring of 16 bullets → summons 6 Grunts → charge; drops a chest (3 free level-ups) |

HP values are at 0:00, before the growth. A thin HP bar appears over an enemy once it is hurt; the boss has a bar at
the top of the screen.

### Experience and level-up

- Enemies drop **XP gems** (small black diamonds). They fly to you when you are within 60. Level `n` needs
  `4 + 3n + n²/4` XP.
- Each level-up pauses the game and offers **3 different cards**, drawn at random from one pool:
  - a **new weapon** (while you have fewer than **5**), or **+1 level** on a weapon you have (max **level 5**);
  - a **stat card** (4 random stats are in the pool each time), with a **rarity** rolled for each card.
  - When the pool runs dry: **Heal 30 HP** or **+10 max HP**.
- Stats have **no limit**: every card adds to the stat's total (shown bottom left).

### Stats and rarity

| Stat   | Icon          | Color  | Iron / Bronze / Silver / Gold / Diamond | Effect                                                                         |
| ------ | ------------- | ------ | --------------------------------------- | ------------------------------------------------------------------------------ |
| Speed  | triangle      | cyan   | +4 / 8 / 12 / 18 / 30%                  | move speed                                                                     |
| Haste  | clock         | amber  | +5 / 10 / 15 / 25 / 50%                 | attack speed (all cooldowns)                                                   |
| Might  | thin diamond  | red    | +6 / 12 / 18 / 30 / 60%                 | damage of all weapons                                                          |
| Pierce | line + tip    | brown  | +1 / 1 / 2 / 2 / 3                      | Dart passes through more enemies, Shard bounces more                           |
| Regen  | cross         | pink   | +0.2 / 0.4 / 0.7 / 1.2 / 2.5 HP/s       | health regeneration                                                            |
| Area   | double circle | indigo | +5 / 10 / 15 / 25 / 45%                 | dart/shard size, Pulse and Mine radius, Lance length, Orbit radius and squares |
| Reach  | horseshoe     | lime   | +15 / 30 / 45 / 70 / 120%               | XP and loot pickup range (60 at start)                                         |
| Luck   | clover        | green  | +5 / 10 / 15 / 25 / 50                  | rarer cards and more drops                                                     |

- **Rarity odds** (border color of the card): Iron 50%, Bronze 28%, Silver 15%, Gold 6%, Diamond 1%.
- **Luck**: the weight of rarity `i` (Iron = 0 … Diamond = 4) is multiplied by `(1 + luck/100)^i`. At 50 luck:
  Iron 33%, Bronze 28%, Silver 22%, Gold 13%, Diamond 3%. Luck also multiplies the heal / magnet / bomb drop chances by
  `1 + luck/100`.

### Weapons (black, auto-fire)

17 weapons, **5 slots**. Level 1 → level 5, then an evolution once you have taken a card of its stat.

| Weapon     | Shape                  | What it does (Lv 1 → Lv 5)                                                       | Evolves with | Evolution                                |
| ---------- | ---------------------- | -------------------------------------------------------------------------------- | ------------ | ---------------------------------------- |
| Dart       | small triangle         | fires at the nearest enemy · 15 → 36 dmg, 1 → 3 darts, 0.8 → 0.6 s               | Haste        | **Storm**: 3 darts / 0.3 s               |
| Orbit      | squares around you     | contact damage · 8 → 24 dmg, 2 → 5 squares                                       | Area         | **Halo**: 8 big squares                  |
| Pulse      | expanding circle       | ring every 3 → 2.2 s, pushes enemies back · 15 → 44 dmg, radius 90 → 140         | Regen        | **Lifewave**: heals 0.5 HP per enemy hit |
| Lance      | line                   | piercing beam where you move · 20 → 56 dmg, 1 → 3 beams (front, back…)           | Pierce       | **Railgun**: 4 long beams                |
| Mine       | filled square          | dropped where you stand, explodes on contact · 24 → 64 dmg                       | Might        | **Minefield**: 3 mines / 0.7 s           |
| Shard      | star                   | bounces between enemies · 12 → 28 dmg, 2 → 7 bounces, 1 → 3 stars                | Speed        | **Comet**: 4 stars, 10 bounces           |
| Boomerang  | wide V                 | thrown at the nearest enemy, comes back (hits on the way out and back) · 14 → 36 | Reach        | **Moonblade**: 4 boomerangs              |
| Chain      | zigzag                 | lightning hits the nearest enemy and jumps 3 → 6 times · 16 → 38 dmg             | Luck         | **Tempest**: 4 bolts, 8 jumps            |
| Flamer     | small orange triangles | short cone of flames, each sets enemies on fire for 2 s · 10 → 30 burn/s         | Might        | **Inferno**: 4 flames, longer cone       |
| Saw        | gear                   | bounces on the screen edges for 3.5 s, re-hits every 0.4 s · 12 → 30 dmg         | Speed        | **Buzzsaw**: 4 big saws                  |
| Frost      | snowflake              | blue ring that slows enemies by 40% for 2.5 s · 5 → 15 dmg, radius 100 → 165     | Area         | **Blizzard**: 70% slow, radius 220       |
| Meteor     | falling circle         | lands on random enemies on screen after a 0.7 s warning · 32 → 72 dmg            | Luck         | **Starfall**: 5 meteors                  |
| Whip       | arc                    | wide slash to one side (alternating), both sides from Lv 3 · 18 → 48 dmg         | Regen        | **Bloodlash**: 70 dmg, longer            |
| Homing     | thin triangle + trail  | missile that seeks its target and explodes · 20 → 50 dmg                         | Luck         | **Swarm**: 5 missiles                    |
| Black hole | spiral                 | appears on a nearby enemy for 3 s, pulls enemies in, hurts every 0.5 s           | Reach        | **Singularity**: bigger, stronger        |
| Lighthouse | rotating line          | beams sweeping around you, re-hit every 0.5 s · 10 → 26 dmg, 1 → 3 beams         | Pierce       | **Beacon**: 4 long beams                 |
| Shotgun    | fan of dots            | burst of 5 → 9 pellets at close range · 14 → 34 dmg each                         | Haste        | **Scattergun**: 12 pellets / 0.5 s       |

Chilled enemies get a blue ring, burning ones a small flame. Bosses are not pulled by black holes.

A level 5 weapon **evolves** as soon as you have taken at least one card of its stat.

### Artifacts (boss chests)

A boss drops a **big purple chest**: the game pauses and offers **3 artifacts** you don't own; pick one. **5 artifact
slots**; once they are full, a boss chest gives 3 lucky level-ups instead. Artifacts show next to the weapons.

| Artifact        | Effect                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Collector drone | a small drone flies to the XP and loot around you (300 range) and takes it |
| Fourth card     | level-ups show 4 cards                                                     |
| Reroll die      | 2 rerolls on every level-up (R key or button)                              |
| Phoenix         | once per run, at 0 HP you come back at 50% HP and the screen is cleared    |
| Twin core       | every weapon with a count (darts, squares, beams…) gets +1                 |
| Vampire fang    | heal 1 HP every 10 kills                                                   |
| Shield orb      | a ring around you blocks one hit, then recharges in 15 s                   |
| Gravity well    | pulls every XP gem to you every 30 s                                       |
| Hourglass       | all enemies 15% slower                                                     |
| Sentinel        | a turret follows you and shoots darts (14 dmg, grows with Might and level) |
| Prism of XP     | +30% XP                                                                    |
| Banish          | 3 times per run, remove a weapon or stat from the level-up pool (B key)    |

### Loot

| Drop         | Where                  | Effect                                     |
| ------------ | ---------------------- | ------------------------------------------ |
| Chest        | elites (1), bosses (3) | free level-ups, cards rolled with +30 luck |
| Heal (cross) | 0.6% of kills          | +25 HP                                     |
| Magnet       | 0.2% of kills          | pulls every XP gem to you                  |
| Bomb         | 0.15% of kills         | kills every normal enemy on screen         |

### Game over

Shows time, kills, level, and the damage dealt by each weapon. Restart with Enter / tap.

## Controls

| Action             | Keyboard         | Touch                                       |
| ------------------ | ---------------- | ------------------------------------------- |
| Move               | arrows / WASD    | touch anywhere and drag (floating joystick) |
| Pick a card / slot | 1 2 3 … or click | tap                                         |
| Pause              | P                | ❚❚                                          |
| Restart / back     | Enter / Escape   | tap / ✕                                     |

## Code layout

| File             | Role                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `data.ts`        | Balance: player, difficulty growth, enemies, stats, rarities, drops    |
| `arsenal.ts`     | Weapon tables (levels, evolutions) and final stats with stat bonuses   |
| `model.ts`       | Shared types                                                           |
| `game.ts`        | `Run`: state, update order, player, damage, XP, pickups                |
| `director.ts`    | Spawning: rate, enemy mix, elites, bosses, recycling far enemies       |
| `enemies.ts`     | Enemy creation and behaviors (lookup table), separation, death effects |
| `weapons.ts`     | Weapon timers and the firing lookup table                              |
| `targeting.ts`   | Shared weapon helpers: final stats, nearest targets, geometry, blasts  |
| `shooters.ts`    | Weapons that fire projectiles (Dart, Shard, Shotgun, Boomerang…)       |
| `casters.ts`     | Weapons acting around you (Pulse, Frost, Lance, Whip, Chain, Mine…)    |
| `projectiles.ts` | Flight and hits of each projectile kind (lookup table)                 |
| `auras.ts`       | Always-on contact weapons: Orbit and Lighthouse                        |
| `attacks.ts`     | Update order of attacks; rings, mines, meteors, black holes            |
| `inventory.ts`   | Level-up cards, rarity roll with luck, evolutions                      |
| `shapes.ts`      | Enemy and pickup shapes                                                |
| `icons.ts`       | Stat and weapon icons (lookup tables)                                  |
| `render.ts`      | The world: camera, grid, enemies, player                               |
| `visuals.ts`     | Drawing of projectiles, rings, beams, bolts, blasts, zones             |
| `hud.ts`         | HUD: XP, HP, time, boss bar, inventory                                 |
| `screens.ts`     | Level-up cards and game-over panels                                    |
| `horde.ts`       | The scene: input, camera zoom, which screen is shown                   |

## Design notes

- The world is in **world units**; the camera zoom makes the shorter screen side show 520 units, so a phone and a
  monitor see the same amount of the field.
- Enemies go in a `SpatialGrid` every frame; weapons, separation and contact only check nearby enemies.
- Enemy behaviors and weapon firing are lookup tables (`BEHAVIOR`, `FIRE`), one small function per type.
- Gems are capped (300): past that, new XP is added to an existing gem.
