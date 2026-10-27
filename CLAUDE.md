# CLAUDE.md

Guidance for Claude (and any contributor) working in this repository.

## What this project is

A collection of **small, quick-to-demo versions of classic games**, in one app with a menu:
Snake → Asteroids → Bomberman → Tower Defense → Polygon Horde (from simplest to hardest).
It runs in the browser and ships as an **Android APK** through Capacitor.

**Visual rule (do not break):** only basic shapes (circle, square/rect, triangle, polygon, line), drawn as
**black outlines on a white background**. Filled black shapes are allowed for emphasis (snake head, solid walls).
No images, textures, sprites, or sound assets. Colors only where a game needs them for gameplay:
Tower Defense gives each shape a hue (towers get darker when upgraded); Polygon Horde colors enemies by role,
stats by kind and rarities (weapons, player and XP stay black). Everything else stays black and white.

## Stack

- TypeScript (strict) + HTML5 Canvas 2D, bundled with **Vite 6**. No UI framework.
- **Capacitor 6** for Android (chosen over 7 because the machine has JDK 17; Capacitor 7 needs JDK 21).
- No test suite on purpose: verify by playing (see "Verifying a change").

## Commands

| Command           | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`     | Dev server, also exposed on the LAN (open the printed Network URL on the phone)       |
| `npm run build`   | Type-check (`tsc --noEmit`) + production build into `dist/`                           |
| `npm run check`   | Type-check + Prettier format check (run before calling a change done)                 |
| `npm run format`  | Format all of `src/` with Prettier (`.prettierrc.json`: single quotes, 120 columns)   |
| `npm run android` | Build + copy `dist/` into the Android project (`npx cap sync android`)                |
| `npm run apk`     | Above + `gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk` |

## Architecture

```
src/
  main.ts                 game registry (menu entries), scene switching, back button, shared pause
  engine/
    canvas.ts             full-screen canvas, DPR scaling, `view.{w,h}` in CSS pixels, onResize
    loop.ts               fixed-step update (60 Hz) + draw per animation frame
    draw.ts               drawing: shapes (circle, rect, poly, polyline, regular, starPoints, triangle, line), text,
                          font, textWidth, fitSize, label (boxed text), overlay (message box), bar (thin progress
                          bar), stick (virtual joystick)
    input.ts              keyboard + pointer; on-screen touch Buttons; `dpad()`; swipes act as arrow presses;
                          direction keys (ARROWS, WASD, ANY_DIR) with dirHit()/dirDown(); drags() for joysticks;
                          confirmed() / hint() for "press Enter or tap to …"
    ui.ts                 rectangular buttons (RectButton, drawButton, tapButtons) and ChoiceMenu (start screens)
    effects.ts            Effects: score popups, explosion sparks, screen flash (drawParticles inside a camera)
    grid.ts               SpatialGrid: bucket objects by cell for cheap collision checks
    math.ts               Vec, Rect, rand/randInt/pick/clamp/dist/wrap/approach/angleDiff/shuffle, collisions, inRect,
                          seededRandom (same seed → same numbers), compact (950, 12.3k, 4.5M)
    scene.ts              Scene + GameEntry interfaces; requestLayout() to refresh a scene's touch buttons
    storage.ts            loadJson/saveJson/removeKey and loadBest/saveBest (never throw)
  menu/menu.ts            game selection screen (+ build info at the bottom)
  games/<game>/<game>.ts  one Scene per game; bigger games split by role (asteroids/, bomberman/, towerdefense/,
                          see the "Code layout" of each README)
  games/<game>/README.md  short doc per game (rules, controls, design notes)
  games/towerdefense/     the big one, split by role (see its README "Code layout"):
    data.ts waves.ts      balance tables / wave schedule and enemy growth
    model.ts              shared types
    game.ts               state + player actions + economy; enemies.ts and combat.ts hold the simulation parts
    render.ts overlays.ts shapes.ts panel.ts   drawing
    save.ts               save / resume
    towerdefense.ts       the scene: input, layout, selection, resume prompt
  games/horde/            Polygon Horde (survivors-like), split by role, see its README "Code layout"
android/                  generated Capacitor project (only hand-edit: AndroidManifest orientation)
```

### Key conventions

- **A game is a `Scene`** (`update(dt)`, `draw(ctx, w, h)`, optional `layout(w, h)` returning touch buttons,
  optional `leave()` called when going back to the menu, `pausable = true` for the shared pause: P key and a ❚❚ button
  next to ✕, handled by `main.ts`). A `GameEntry` with `keep: true` keeps its scene while the app runs (Tower Defense:
  back to the menu pauses it, coming back continues the same game).
- A game with options starts on a `ChoiceMenu` (Snake modes, Asteroids touch controls, Bomberman players/level code).
  Call `requestLayout()` when the touch buttons depend on the state (e.g. none on the start screen).
  Register it in the `games` array in `src/main.ts` with a name, an icon drawn from shapes, and `create`.
- A game bigger than the screen uses a camera (Polygon Horde: world units, zoom from the screen size, the scene
  draws inside `ctx.translate/scale`), and `Effects.drawParticles` inside it, `drawFlash` outside.
- **Input is unified:** a touch `Button` has `id` = a keyboard code (`'ArrowLeft'`, `'Space'`, ...).
  Games only call `input.down(code)` (held) / `input.hit(code)` (just pressed) / read `input.taps`.
  Never add separate touch and keyboard code paths in a game.
- `layout()` is called on enter and on every resize: compute all sizes/positions there from `w, h`,
  support both landscape and portrait, and keep touch controls clear of the play area.
  Touch buttons are only shown on touch devices; the ✕ back button (also `Escape`) is added by `main.ts`.
- `update(dt)` receives a fixed `dt = 1/60` s. Express speeds in units per second (multiply by `dt`).
- Every game has: score/HUD, a game-over (or win) state using `overlay()` with `input.hint('restart')`, and restart
  with `input.confirmed()` (Enter/Space/tap).
- All persistence goes through `engine/storage.ts` (`loadBest`/`saveBest`, `loadJson`/`saveJson`); never touch
  `localStorage` directly. Today: best scores, and Tower Defense's save/resume (`towerdefense/save.ts`).
- Reuse engine helpers before writing new ones; if two games need the same thing, move it into `engine/`.

## Code quality rules

- **Short files:** aim for under ~300 lines. When a game grows past that, split it by role like `towerdefense/`
  (balance data, types, simulation, drawing, UI, scene).
- **Short functions:** aim for under ~40 lines and one job each. Split long ones into named steps (e.g. Bomberman's
  `draw` → `drawTile` / `drawPowerup`, TD's `updateEnemies` → `applyEffects` / `moveEnemy` / `leak`).
- **No copy-paste:** if the same code appears twice, make it a function; if two games need it, put it in `engine/`.
  Prefer a lookup table over a long `switch` when each case is a small behavior (see `ATTACKS` in TD `combat.ts`).
- Prefer readable over clever.
- TypeScript `strict`, no `any`, no unused locals/params (the build fails on them).
- Constants in `UPPER_SNAKE_CASE` at the top of the file (grid size, speeds, costs) so tuning is easy.
- Private state as class fields; small, single-purpose private methods (`reset`, `spawnX`, `collide...`).
- Comments explain **why**, not what. No commented-out code.
- No new dependencies without a clear need — the engine is intentionally tiny.
- Every file starts with a one- or two-line comment saying what it is for; exported functions get a `/** */` doc
  when their name alone doesn't say everything (units, side effects, return value).
- Formatting is Prettier's job: run `npm run format`; `npm run check` must pass.

## Verifying a change (no automated tests)

1. `npm run check` passes (type-check + formatting), then `npm run build`.
2. `npm run dev`, play the game on desktop with the keyboard: start, score, lose, restart, back to menu.
3. Open the LAN URL on the Android phone (landscape): touch controls work and don't cover the play area.
4. For a release: `npm run apk`, then `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
   The menu shows the build info at the bottom (`v<version> · <commit>[+ if uncommitted] · <build time>`, injected by
   `vite.config.ts`), to check which build is on the phone.

## Review checklist

Before calling a change done, check:

- [ ] Shapes only, black on white, readable on a small phone screen.
- [ ] Works with keyboard **and** touch, in landscape and portrait, after resizing.
- [ ] Movement is frame-rate independent (uses `dt`).
- [ ] Game over / restart / back-to-menu all work, and no state leaks between restarts.
- [ ] No duplicated logic; new shared code lives in `engine/`. No file over ~300 lines, no function over ~40.
- [ ] The game's `README.md` is up to date (rules, controls, notes).
- [ ] `npm run check` and `npm run build` are clean.

## Roadmap

1. ✅ Engine + menu
2. ✅ Snake
3. ✅ Asteroids — see `src/games/asteroids/README.md`
4. ✅ Bomberman — see `src/games/bomberman/README.md`
5. ✅ Tower Defense (rules designed with the user; see its README before changing gameplay)
6. 🚧 Polygon Horde — first playable (rules designed with the user; see `src/games/horde/README.md`)

Build one game at a time and demo it before starting the next.
