# Asteroids

**Status:** ✅ Playable · **Difficulty to build:** ★★☆☆ (free movement, rotation, velocity, wrap-around)

## Rules

- Fly a ship in space and shoot the asteroids. Large asteroids split into 2 medium, medium into 2 small, small are destroyed.
- Score: large 20, medium 50, small 100, UFO 200 (points float up where you scored). Clear all asteroids to start the
  next level with one more asteroid.
- 3 lives, plus **one extra life every 10 000 points**. After being hit the ship respawns in the center and blinks
  (invulnerable) for 2 seconds.
- **UFO**: from level 3, a flying saucer crosses the screen every 20–30 s, weaving up and down. It shoots at the ship
  every 1.5 s, more accurately at higher levels. Touching it or its bullets costs a life.
- **Hyperspace**: jump to a random place (3 s cooldown). No protection: landing next to an asteroid is the risk.
- **Power-ups**: a destroyed small asteroid drops one 10% of the time. Fly into it to take it (it blinks before it
  disappears after 8 s). Each lasts 10 s, shown with its time left under the score:
  - **Shield** (circle): a circle around the ship absorbs one hit.
  - **Triple shot** (three dots): 3 bullets in a fan.
  - **Rapid fire** (two small triangles): fires twice as fast.

## Controls

| Action                   | Keyboard       | Touch: buttons  | Touch: joystick                      |
| ------------------------ | -------------- | --------------- | ------------------------------------ |
| Choose touch controls    | —              | Tap "Buttons"   | Tap "Joystick"                       |
| Rotate                   | ← / → (A / D)  | ↺ ↻ (left side) | Drag on the left half: aims the ship |
| Thrust                   | ↑ (W)          | ▲               | Drag far from where you touched      |
| Fire (hold to auto-fire) | Space          | ● (right side)  | ●                                    |
| Hyperspace               | H              | ⤴ (above ●)    | ⤴                                   |
| Pause                    | P              | ❚❚ (top left)   | ❚❚                                   |
| Restart / back           | Enter / Escape | Tap / ✕         | Tap / ✕                              |

## Shapes

- Ship: triangle (small line flame while thrusting, circle around it with the shield)
- Asteroids: irregular outlined polygons · Bullets: small filled circles · UFO: flat ellipse with a dome, its bullets
  are small outlined circles · Power-ups: circles with an icon · Explosions: short lines flying out

## Code layout

| File           | Role                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `entities.ts`  | Tuning constants, object types, creating rocks/levels/UFOs/power-ups |
| `ship.ts`      | Steering (keys or joystick), thrust and drag, shooting, hyperspace   |
| `ufo.ts`       | UFO movement and aiming                                              |
| `draw.ts`      | Drawing of every object, the HUD and the joystick                    |
| `asteroids.ts` | The scene: start screen, update order, collisions, scoring, lives    |

## Design notes

- Ship has velocity + friction; everything except the UFO wraps around the screen edges (`moveWrapped`).
- Collisions are circle vs circle. Rocks are put in a **spatial grid** (`engine/grid.ts`) every frame, so bullets and
  the ship only test the rocks near them instead of all of them.
- Bullets have a lifetime (~1 s), a fire cooldown and a max count on screen (6, or 18 with triple shot).
- Drag is frame-rate independent: velocity is multiplied by `DRAG ^ dt` (45% kept per second).
- The joystick uses `input.drags()`: any finger that went down outside the buttons, on the left half of the screen.

## Possible improvements

All the earlier ideas (pause, explosions, score popups, joystick, UFO, hyperspace, extra lives, power-ups, collision
grid) are done. New ideas:

1. **Bigger UFO bosses** every 5 levels, with more HP.
2. **Wave timer**: rocks speed up slowly if a level lasts too long.
3. **Two-player co-op** on one keyboard.
