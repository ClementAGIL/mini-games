# Bomberman

**Status:** ✅ Playable · **Difficulty to build:** ★★★☆ (tile map, timers, chain explosions, enemy AI, level codes)

## Modes

The start screen offers:

1. **1 player**: levels against enemies.
2. **2 players (one keyboard)**: a duel, no enemies, last one standing wins the round (keyboard only).
3. **Play a level code…**: type a code like `3-48213` to play exactly that level again (or share it).

## Rules (1 player)

- A 13×11 tile arena: solid pillars on every other tile, breakable blocks placed from the level code.
- Drop bombs; they explode in a cross after 2 seconds (range 1 at start). The flames **spread out** from the bomb, one
  tile every 35 ms, destroying blocks, enemies — and you, if you're in the blast. Explosions set off other bombs.
- **Exit**: a door is hidden under one of the blocks. Kill every enemy **and** walk onto the door to clear the level.
  The HUD tells you "find the exit" / "go to the exit" once the enemies are gone.
- **Time limit**: 3 minutes per level. Time left when you clear the level is worth 10 points per second; running out
  of time ends the game.
- Enemies (2 + level of them, 100 points each):
  - **Wanderer** (outlined triangle): walks randomly.
  - **Chaser** (filled triangle, a bit faster): runs at you when it sees you in a straight, clear line (6 tiles).
  - **Careful** (triangle with a smaller one inside): avoids tiles that a bomb is about to hit.
  - Level 1: wanderers only; level 2: one chaser; from level 3: a mix of all three.
- Destroyed blocks sometimes drop a **power-up** (squares with an icon):
  - **+1 bomb** (dot) · **+1 range** (cross) · **speed** (chevrons)
  - **kick** (triangle): walking into a bomb sends it sliding until it hits something
  - **remote** (dot in a ring): your bombs wait (dashed ring) until you press detonate
  - **pass** (dashed square): walk through breakable blocks
- Power-ups are kept from one level to the next. Getting touched by an enemy or a blast ends the game.
- The level code is shown in the HUD and on the game-over screen. The best score is saved on the device.

## Rules (2 players)

- Same arena (players start in opposite corners), no enemies, no exit, 2 minutes per round, power-ups as above.
- The last player standing wins the round; both dying (or the time running out) is a draw. Wins are counted.

## Controls

| Action       | 1 player          | Player 1 (duel) | Player 2 (duel) | Touch         |
| ------------ | ----------------- | --------------- | --------------- | ------------- |
| Move         | Arrow keys / WASD | WASD            | Arrow keys      | D-pad         |
| Drop bomb    | Space             | Space           | Enter           | ●             |
| Detonate     | E                 | E               | Right Shift     | ✸             |
| Pause        | P                 | P               | P               | ❚❚ (top left) |
| Continue     | Enter / Space     |                 |                 | Tap           |
| Back to menu | Escape            |                 |                 | ✕             |

## Shapes

- Solid wall: filled square · Breakable block: outlined square with an X · Exit: door with a knob
- Player 1: circle · Player 2: circle with a dot · Enemies: triangles (see above)
- Bomb: pulsing filled circle with a ring that empties as the timer runs (dashed ring for remote bombs)
- Blast: two concentric squares on each burning tile

## Code layout

| File           | Role                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `model.ts`     | Constants, key bindings, the world types (players, bombs, flames, enemies) |
| `level.ts`     | Seeded level generator and level codes                                     |
| `bombs.ts`     | Placing, remote detonation, kicked bombs, chain explosions, danger tiles   |
| `actors.ts`    | Player movement, kicking, power-up pickup, enemy AI                        |
| `draw.ts`      | Drawing of the arena and everything on it                                  |
| `bomberman.ts` | The scene: start screen, modes, update order, hits, win/lose, HUD          |

## Design notes

- Player moves smoothly but is snapped toward the tile center on the perpendicular axis, so corners are easy to take.
- Positions are in tile units (tile centers are integers), so collision is a simple grid lookup.
- A level code is `level-seed`; the seed feeds a deterministic random generator (`seededRandom` in `engine/math.ts`), so
  the same code always builds the same blocks, exit and enemies. Power-up drops stay random.
- Chain reactions: a blast sets other bombs' timers to 0 and the explode loop runs until no bomb is due.
- `blast()` computes the tiles a bomb reaches; it is used both to explode and to tell careful enemies where not to go.

## Possible improvements

All the earlier ideas (pause, bomb countdown, spreading flames, death/clear flash, exit door, smarter enemies, more
power-ups, time limit, two players, seeded levels) are done. New ideas:

1. **Bosses** every 5 levels (a big enemy that takes several hits).
2. **Touch duel**: two d-pads on a tablet in landscape.
3. **Level editor** that produces a shareable code.
