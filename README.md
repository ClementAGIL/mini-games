# Mini Games

Simple versions of classic games, drawn with nothing but black outlines on white —
circles, squares and triangles. Runs in any browser and as an Android app.

| Game          | Status      | Doc                                                                  |
| ------------- | ----------- | -------------------------------------------------------------------- |
| Snake         | ✅ Playable | [src/games/snake/README.md](src/games/snake/README.md)               |
| Asteroids     | ✅ Playable | [src/games/asteroids/README.md](src/games/asteroids/README.md)       |
| Bomberman     | ✅ Playable | [src/games/bomberman/README.md](src/games/bomberman/README.md)       |
| Tower Defense | ✅ Playable | [src/games/towerdefense/README.md](src/games/towerdefense/README.md) |
| Polygon Horde | ✅ Playable | [src/games/horde/README.md](src/games/horde/README.md) |

## Requirements

- Node.js 20+ (tested with 22)
- For the Android APK: JDK 17 and the Android SDK (`ANDROID_HOME` set). Android Studio is optional.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 on your computer.
To try it on your phone, connect it to the same Wi-Fi and open the **Network** URL that Vite prints.

## Building the Android app

```bash
npm run apk
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

(or copy the file to the phone and open it — allow "install unknown apps").
To open the native project in Android Studio: `npm run android && npx cap open android`.

## Controls

|                         | Keyboard                 | Touch                                |
| ----------------------- | ------------------------ | ------------------------------------ |
| Menu                    | Arrows + Enter, or click | Tap a game                           |
| Back to menu            | Escape                   | ✕ button (top-left)                  |
| Pause / resume          | P                        | ❚❚ button (next to ✕), tap to resume |
| Restart after game over | Enter / Space            | Tap                                  |

Each game's own controls are in its doc.

## Tech

TypeScript + HTML5 Canvas, bundled with Vite, packaged for Android with Capacitor 6.
No framework and no assets — everything is drawn with a few shape helpers in `src/engine/draw.ts`.

```
src/
  main.ts          game list + scene switching
  engine/          canvas, loop, drawing, input (keyboard + touch), buttons, math, storage
  menu/            menu screen
  games/<game>/    one folder per game: <game>.ts + README.md (Tower Defense and Polygon Horde are split
                   into several files by role)
android/           Capacitor Android project
```

## Contributing

Coding rules, architecture and the review checklist are in [CLAUDE.md](CLAUDE.md). In short:

- Keep each game in its own folder, implementing the `Scene` interface. Files under ~300 lines, functions under ~40,
  no copy-paste: shared code goes in `src/engine/`.
- Shapes only, black on white; keyboard **and** touch for every game.
- `npm run format` formats the code (Prettier); `npm run check` (types + formatting) and `npm run build` must pass.
- Play-test on desktop and phone before merging (there are no automated tests).
- Update the game's `README.md` when its rules or controls change.
