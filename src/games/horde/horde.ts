// Polygon Horde: survive endless hordes. Weapons fire by themselves; you move, pick level-up cards (weapons, stats).
import { stick as drawStick } from '../../engine/draw';
import { ANY_DIR, input, type Button } from '../../engine/input';
import type { Vec } from '../../engine/math';
import type { Scene } from '../../engine/scene';
import { loadBest, saveBest } from '../../engine/storage';
import { VIEW } from './data';
import { Run } from './game';
import { drawHud } from './hud';
import { artifactButtons, choose, drawArtifactChoice, LevelUp } from './levelup';
import { drawWorld } from './render';
import { drawGameOver } from './screens';

type Screen = 'play' | 'levelup' | 'artifact' | 'over';

const STICK_R = 45; // px: dragging this far from the touch point is full speed
const STICK_DEAD = 6;
const INPUT_DELAY = 0.4; // s: a new screen ignores input this long, so a finger still moving can't pick by mistake

export class Horde implements Scene {
  pausable = true;
  private run = new Run();
  private best = loadBest('horde');
  private w = 0;
  private h = 0;
  private zoom = 1;
  private screen: Screen = 'play';
  private wait = 0;
  private levelUp = new LevelUp();

  layout(w: number, h: number): Button[] {
    this.w = w;
    this.h = h;
    this.zoom = Math.min(w, h) / VIEW;
    this.run.setView(w / this.zoom, h / this.zoom);
    return [];
  }

  update(dt: number) {
    this.wait -= dt;
    const next = this.currentScreen();
    if (next !== this.screen) this.enter(next);
    if (this.screen === 'play') return this.run.update(dt, this.move());
    if (this.wait > 0) return;
    if (this.screen === 'levelup') this.levelUp.update(this.run, this.w, this.h);
    else if (this.screen === 'artifact') choose(artifactButtons(this.run, this.w, this.h));
    else if (input.confirmed()) this.restart();
  }

  private currentScreen(): Screen {
    const r = this.run;
    if (r.dead) return 'over';
    if (r.artifactChoice) return 'artifact';
    return r.pendingLevels > 0 ? 'levelup' : 'play';
  }

  private enter(screen: Screen) {
    this.screen = screen;
    this.wait = INPUT_DELAY;
    if (screen === 'levelup') this.levelUp.deal(this.run);
    if (screen === 'over' && this.run.time > this.best) saveBest('horde', (this.best = Math.floor(this.run.time)));
  }

  private restart() {
    this.run = new Run();
    this.layout(this.w, this.h);
    this.screen = 'play';
  }

  /** Floating joystick (any drag) or arrows / WASD; length 0..1. */
  private move(): Vec {
    const drag = input.drags()[0];
    if (drag) {
      const dx = drag.pos.x - drag.start.x;
      const dy = drag.pos.y - drag.start.y;
      const len = Math.hypot(dx, dy);
      if (len < STICK_DEAD) return { x: 0, y: 0 };
      const k = Math.min(1, len / STICK_R) / len;
      return { x: dx * k, y: dy * k };
    }
    const x = Number(input.down(...ANY_DIR.right)) - Number(input.down(...ANY_DIR.left));
    const y = Number(input.down(...ANY_DIR.down)) - Number(input.down(...ANY_DIR.up));
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    drawWorld(ctx, this.run, w, h, this.zoom);
    drawHud(ctx, this.run, w, h, this.best);
    const drag = input.drags()[0];
    if (this.screen === 'play' && drag) drawStick(ctx, drag.start, drag.pos, STICK_R);
    if (this.screen === 'levelup') this.levelUp.draw(ctx, this.run, w, h);
    if (this.screen === 'artifact') drawArtifactChoice(ctx, this.run, w, h);
    if (this.screen === 'over') drawGameOver(ctx, w, h, this.run, this.best);
  }
}
