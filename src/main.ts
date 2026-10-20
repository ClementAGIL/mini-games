import { onResize, setupCanvas, view } from './engine/canvas';
import { circle, clear, overlay, rect, triangle } from './engine/draw';
import { input, type Button } from './engine/input';
import { startLoop } from './engine/loop';
import { onLayoutRequest, type GameEntry, type Scene } from './engine/scene';
import { Asteroids } from './games/asteroids/asteroids';
import { Bomberman } from './games/bomberman/bomberman';
import { Snake } from './games/snake/snake';
import { TowerDefense } from './games/towerdefense/towerdefense';
import { Menu } from './menu/menu';

const games: GameEntry[] = [
  {
    name: 'Snake',
    icon: (ctx, x, y, s) => {
      for (let i = -1; i <= 1; i++) rect(ctx, x + i * s * 0.7 - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6);
    },
    create: () => new Snake(),
  },
  {
    name: 'Asteroids',
    icon: (ctx, x, y, s) => {
      triangle(ctx, x - s * 0.5, y, s * 0.6, 0);
      circle(ctx, x + s * 0.7, y - s * 0.3, s * 0.5);
    },
    create: () => new Asteroids(),
  },
  {
    name: 'Bomberman',
    icon: (ctx, x, y, s) => {
      circle(ctx, x, y, s * 0.6);
      rect(ctx, x - s * 0.15, y - s * 0.95, s * 0.3, s * 0.3);
    },
    create: () => new Bomberman(),
  },
  {
    name: 'Tower Defense',
    icon: (ctx, x, y, s) => {
      rect(ctx, x - s * 0.9, y - s * 0.5, s, s);
      circle(ctx, x + s * 0.6, y, s * 0.35);
    },
    create: () => new TowerDefense(),
    keep: true,
  },
];

const BACK: Button = { id: 'Escape', x: 30, y: 30, r: 20, label: '✕' };
const PAUSE: Button = { id: 'KeyP', x: 80, y: 30, r: 20, label: '❚❚' };

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = setupCanvas(canvas);
input.attach(canvas);

const menu = new Menu(games, open);
let scene: Scene = menu;
let paused = false; // the shared pause, for scenes with `pausable`
/** Scenes of games with `keep: true`, reused when the player comes back from the menu. */
const kept = new Map<GameEntry, Scene>();

function open(game: GameEntry) {
  const next = kept.get(game) ?? game.create();
  if (game.keep) kept.set(game, next);
  goto(next);
}

function relayout() {
  const buttons = scene.layout?.(view.w, view.h) ?? [];
  const shared = scene.pausable ? [BACK, PAUSE] : [BACK];
  input.buttons = scene === menu ? buttons : [...(input.isTouch ? buttons : []), ...shared];
}

function goto(next: Scene) {
  scene = next;
  paused = false;
  input.reset();
  relayout();
}

/** One fixed step: back to the menu, the shared pause, or the scene's own update. */
function step(dt: number) {
  if (scene !== menu && input.hit('Escape')) {
    scene.leave?.();
    goto(menu);
  } else if (paused) {
    if (input.hit('KeyP') || input.confirmed()) paused = false;
  } else if (scene.pausable && input.hit('KeyP')) {
    paused = true;
  } else {
    scene.update(dt);
  }
}

onResize(relayout);
onLayoutRequest(relayout);
relayout();

startLoop(
  (dt) => {
    step(dt);
    input.endFrame();
  },
  () => {
    clear(ctx, view.w, view.h);
    scene.draw(ctx, view.w, view.h);
    if (paused) overlay(ctx, view.w, view.h, 'PAUSED', input.hint('resume'));
    input.draw(ctx);
  },
);
