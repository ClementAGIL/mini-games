// Polygon Horde: survive endless hordes. Weapons fire by themselves; you move, pick level-up cards (weapons, stats).
import { stick as drawStick } from '../../engine/draw';
import { ANY_DIR, input, type Button } from '../../engine/input';
import type { Vec } from '../../engine/math';
import type { Scene } from '../../engine/scene';
import { loadBest, saveBest } from '../../engine/storage';
import { tapButtons, type RectButton } from '../../engine/ui';
import { VIEW } from './data';
import { Run } from './game';
import { drawHud } from './hud';
import { levelUpCards } from './inventory';
import type { Card } from './model';
import { drawWorld } from './render';
import { cardButtons, describeCard, drawGameOver, drawLevelUp, type CardView } from './screens';

type Screen = 'play' | 'levelup' | 'over';

const STICK_R = 45; // px: dragging this far from the touch point is full speed
const STICK_DEAD = 6;
const INPUT_DELAY = 0.4; // s: a new screen ignores input this long, so a finger still moving can't pick by mistake

/** Key n presses button n, a tap presses the button under it. */
function choose(buttons: RectButton[]) {
  const key = buttons.findIndex((_, i) => input.hit(`Digit${i + 1}`));
  if (key >= 0) buttons[key].onTap();
  else tapButtons(buttons, input.taps);
}

export class Horde implements Scene {
  pausable = true;
  private run = new Run();
  private best = loadBest('horde');
  private w = 0;
  private h = 0;
  private zoom = 1;
  private screen: Screen = 'play';
  private wait = 0;
  private cards: Card[] = [];
  private views: CardView[] = [];

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
    if (this.screen === 'levelup') choose(this.cardButtons());
    else if (input.confirmed()) this.restart();
  }

  private currentScreen(): Screen {
    const r = this.run;
    if (r.dead) return 'over';
    return r.pendingLevels > 0 ? 'levelup' : 'play';
  }

  private enter(screen: Screen) {
    this.screen = screen;
    this.wait = INPUT_DELAY;
    if (screen === 'levelup') this.dealCards();
    if (screen === 'over' && this.run.time > this.best) saveBest('horde', (this.best = Math.floor(this.run.time)));
  }

  private dealCards() {
    this.cards = levelUpCards(this.run.weapons, this.run.cardLuck);
    this.views = this.cards.map((c) => describeCard(c, this.run));
  }

  private cardButtons() {
    return cardButtons(this.w, this.h, this.cards.length, (i) => {
      this.run.pickCard(this.cards[i]);
      if (this.run.pendingLevels > 0) this.dealCards(); // several levels at once: deal again
      this.wait = INPUT_DELAY / 2;
    });
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
    if (this.screen === 'levelup') drawLevelUp(ctx, w, h, this.cardButtons(), this.views);
    if (this.screen === 'over') drawGameOver(ctx, w, h, this.run, this.best);
  }
}
