# Snake

**Status:** ✅ Playable · **Difficulty to build:** ★☆☆☆ (warm-up, introduces the grid + game loop)

## Rules

- Choose a mode on the start screen:
  - **Classic**: hitting the edge of the board ends the game.
  - **Wrap-around** (dashed border): going off one edge comes back on the other side.
- Guide the snake around a 20×20 board and eat the food (circle): +1 score, the snake grows and speeds up a little.
- **Levels**: every 12 food you reach the next level, with a new obstacle layout (bars, pillars, corner boxes, then
  both bars and pillars; after level 5 the layouts repeat). Each level starts a little faster, with a short snake.
- **Obstacles** (squares with an X): besides the level layout, a new obstacle appears every 5 food, never right in
  front of the snake.
- **Bonus food** (a dot with a ring): after each food there is a 1 in 6 chance that it appears. It is worth +5 and
  disappears after 5 seconds; the ring shows the time left.
- Hitting an obstacle or your own body ends the game. The best score is saved for each mode.
- The HUD shows score, best, level and a speed indicator (1–10). Points float up where you eat; the screen flashes
  when the game ends.

## Controls

| Action        | Keyboard          | Touch                                              |
| ------------- | ----------------- | -------------------------------------------------- |
| Choose a mode | 1 / 2             | Tap a mode                                         |
| Turn          | Arrow keys / WASD | Swipe, or the d-pad (right side in landscape)      |
| Pause         | P                 | ❚❚ (top left, next to ✕); tap or P again to resume |
| Continue      | Enter / Space     | Tap (back to the start screen after a game over)   |
| Back to menu  | Escape            | ✕                                                  |

## Shapes

- Board: outlined square (dashed in wrap-around mode) · Body: outlined squares · Head: filled square
- Food: circle · Bonus food: filled dot with a shrinking ring · Obstacles: squares with an X

## Design notes

- The snake moves on a timer (`step`, starts at 0.15 s, −0.004 s per food, min 0.06 s), independent of frame rate.
- Turns are buffered (up to 2) so fast double-taps like "up, left" are not lost; reversing into yourself is ignored.
- The tail cell is excluded from the self-collision check because it moves away on the same tick.
- Level layouts are in `levels.ts`; they always keep the start row clear. Tuning constants are at the top of `snake.ts`.
- Shared engine pieces used here: `ChoiceMenu` (start screen), `Effects` (popups, flash), `input.dirHit(ANY_DIR)`
  (arrows, WASD and swipes), and the shared pause in `main.ts`.

## Possible improvements

All the earlier ideas (swipe, pause, popups, speed indicator, wrap-around mode, obstacles, bonus food, levels, shared
direction keys) are done. New ideas:

1. **Two snakes** on one keyboard (WASD vs arrows).
2. **Poison food** that shrinks the snake but scores double.
3. **Daily board**: the same random obstacles for everyone on a given day (seeded like Bomberman's level codes).
