// Snake: classic or wrap-around mode, levels with obstacle layouts, extra obstacles while playing, bonus food.
import { circle, line, overlay, rect, text } from '../../engine/draw';
import { Effects } from '../../engine/effects';
import { ANY_DIR, dpad, input, type Button } from '../../engine/input';
import { randInt, type Vec } from '../../engine/math';
import type { Scene } from '../../engine/scene';
import { loadBest, saveBest } from '../../engine/storage';
import { ChoiceMenu } from '../../engine/ui';
import { levelWalls, N } from './levels';

const START_STEP = 0.15; // seconds per move at level 1
const MIN_STEP = 0.06;
const STEP_DECAY = 0.004; // faster after each food
const LEVEL_SPEEDUP = 0.008; // each level starts a bit faster
const LEVEL_FOOD = 12; // food to eat to finish a level
const OBSTACLE_EVERY = 5; // one more obstacle every 5 food
const BONUS_CHANCE = 1 / 6;
const BONUS_TIME = 5;
const BONUS_POINTS = 5;
const LEVEL_PAUSE = 1.5; // "LEVEL n" message before the next level starts

type Mode = 'classic' | 'wrap';
type State = 'choose' | 'play' | 'level' | 'over';

const tileKey = (p: Vec) => p.y * N + p.x;
const same = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

export class Snake implements Scene {
  pausable = true;
  private state: State = 'choose';
  private mode: Mode = 'classic';
  private body: Vec[] = [];
  private dir: Vec = { x: 1, y: 0 };
  private queue: Vec[] = [];
  private food: Vec = { x: 0, y: 0 };
  private bonus: { pos: Vec; time: number } | null = null;
  private walls = new Set<number>();
  private timer = 0;
  private step = START_STEP;
  private score = 0;
  private level = 1;
  private eaten = 0; // food eaten in this level
  private levelTimer = 0;
  private best: Record<Mode, number> = { classic: loadBest('snake'), wrap: loadBest('snake-wrap') };
  private fx = new Effects();
  private menu = new ChoiceMenu(
    'SNAKE',
    () => [
      { label: `Classic (walls) · best ${this.best.classic}`, onPick: () => this.start('classic') },
      { label: `Wrap-around · best ${this.best.wrap}`, onPick: () => this.start('wrap') },
    ],
    () => (input.isTouch ? 'Swipe or use the d-pad · ❚❚ to pause' : 'Arrows / WASD to turn · P to pause'),
  );

  private w = 0;
  private h = 0;
  private ox = 0;
  private oy = 0;
  private cell = 0;

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    let size: number;
    let buttons: Button[] = [];
    if (!input.isTouch) {
      size = Math.min(w, h - 50) - 40;
      this.oy = (h - size) / 2 + 20;
    } else if (w >= h) {
      size = Math.min(h - 70, w - 420);
      this.oy = (h - size) / 2 + 20;
      buttons = dpad(w - 110, h / 2 + 20);
    } else {
      size = Math.min(w - 20, h - 300);
      this.oy = 70;
      buttons = dpad(w / 2, h - 120);
    }
    this.cell = Math.floor(size / N);
    this.ox = Math.floor((w - this.cell * N) / 2);
    return buttons;
  }

  // ---------- flow ----------

  private start(mode: Mode) {
    this.mode = mode;
    this.score = 0;
    this.level = 1;
    this.fx.clear();
    this.startLevel();
  }

  private startLevel() {
    const m = N / 2;
    this.body = [
      { x: m, y: m },
      { x: m - 1, y: m },
      { x: m - 2, y: m },
    ];
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.step = Math.max(MIN_STEP, START_STEP - (this.level - 1) * LEVEL_SPEEDUP);
    this.timer = 0;
    this.eaten = 0;
    this.walls = new Set(levelWalls(this.level).map(tileKey));
    this.bonus = null;
    this.food = this.freeTile();
    this.state = 'play';
  }

  update(dt: number) {
    this.fx.update(dt);
    if (this.state === 'choose') this.menu.update(this.w, this.h);
    else if (this.state === 'over' && input.confirmed()) this.state = 'choose';
    else if (this.state === 'level' && (this.levelTimer -= dt) <= 0) this.startLevel();
    else if (this.state === 'play') this.play(dt);
  }

  private play(dt: number) {
    const d = input.dirHit(ANY_DIR);
    if (d) this.turn(d);
    if (this.bonus && (this.bonus.time -= dt) <= 0) this.bonus = null;
    this.timer += dt;
    if (this.timer < this.step) return;
    this.timer -= this.step;
    this.advance();
  }

  // Up to two buffered turns so quick inputs are not lost; reversing is ignored.
  private turn(d: Vec) {
    const last = this.queue[this.queue.length - 1] ?? this.dir;
    if (this.queue.length >= 2 || (d.x === -last.x && d.y === -last.y) || same(d, last)) return;
    this.queue.push(d);
  }

  private advance() {
    if (this.queue.length) this.dir = this.queue.shift()!;
    let head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y };
    const outside = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
    if (outside && this.mode === 'wrap') head = { x: (head.x + N) % N, y: (head.y + N) % N };
    // The tail moves away this tick, so it is not counted as a collision.
    const hitsSelf = this.body.slice(0, -1).some((p) => same(p, head));
    if ((outside && this.mode === 'classic') || hitsSelf || this.walls.has(tileKey(head))) return this.die();

    this.body.unshift(head);
    if (same(head, this.food)) this.eat();
    else if (this.bonus && same(head, this.bonus.pos)) this.eatBonus();
    else this.body.pop();
  }

  private eat() {
    this.score++;
    this.eaten++;
    this.step = Math.max(MIN_STEP, this.step - STEP_DECAY);
    this.popupAt(this.food, '+1');
    if (this.eaten >= LEVEL_FOOD) return this.nextLevel();
    if (this.eaten % OBSTACLE_EVERY === 0) this.walls.add(tileKey(this.freeTile(3)));
    if (!this.bonus && Math.random() < BONUS_CHANCE) this.bonus = { pos: this.freeTile(), time: BONUS_TIME };
    this.food = this.freeTile();
  }

  private eatBonus() {
    this.score += BONUS_POINTS;
    this.popupAt(this.bonus!.pos, `+${BONUS_POINTS}`);
    this.bonus = null;
  }

  private nextLevel() {
    this.level++;
    this.state = 'level';
    this.levelTimer = LEVEL_PAUSE;
  }

  private die() {
    this.state = 'over';
    this.fx.flash(0.5);
    if (this.score > this.best[this.mode]) {
      this.best[this.mode] = this.score;
      saveBest(this.mode === 'classic' ? 'snake' : 'snake-wrap', this.score);
    }
  }

  /** A random empty tile, at least `away` moves from the head (so a new obstacle never appears right in front). */
  private freeTile(away = 0): Vec {
    const head = this.body[0];
    const taken = (p: Vec) =>
      this.walls.has(tileKey(p)) ||
      this.body.some((b) => same(b, p)) ||
      same(p, this.food) ||
      (this.bonus !== null && same(p, this.bonus.pos)) ||
      Math.abs(p.x - head.x) + Math.abs(p.y - head.y) < away;
    let p: Vec;
    let tries = 0;
    do p = { x: randInt(0, N - 1), y: randInt(0, N - 1) };
    while (taken(p) && ++tries < 1000);
    return p;
  }

  // ---------- drawing ----------

  private cx = (x: number) => this.ox + (x + 0.5) * this.cell;
  private cy = (y: number) => this.oy + (y + 0.5) * this.cell;

  private popupAt(p: Vec, str: string) {
    this.fx.popup(str, this.cx(p.x), this.cy(p.y));
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.state === 'choose') return this.menu.draw(ctx, w, h);
    const { ox, oy, cell } = this;
    const speed = 1 + Math.round(((START_STEP - this.step) / (START_STEP - MIN_STEP)) * 9);
    const hud = `Score ${this.score}   Best ${this.best[this.mode]}   Level ${this.level}   Speed ${speed}`;
    text(ctx, hud, w / 2, oy - 22, Math.min(18, w / 30));

    if (this.mode === 'wrap') ctx.setLineDash([6, 6]); // dashed edges: you can go through them
    rect(ctx, ox, oy, cell * N, cell * N);
    ctx.setLineDash([]);
    for (const k of this.walls) this.drawWall(ctx, k % N, Math.floor(k / N));
    circle(ctx, this.cx(this.food.x), this.cy(this.food.y), cell * 0.35);
    if (this.bonus) this.drawBonus(ctx, this.bonus.pos, this.bonus.time);
    this.body.forEach((p, i) => rect(ctx, ox + p.x * cell + 2, oy + p.y * cell + 2, cell - 4, cell - 4, i === 0));

    this.fx.draw(ctx, w, h);
    if (this.state === 'level') overlay(ctx, w, h, `LEVEL ${this.level}`, 'Get ready');
    if (this.state === 'over') overlay(ctx, w, h, 'GAME OVER', `Score ${this.score} · ${input.hint('continue')}`);
  }

  // Obstacle: a square with an X (the head of the snake is the only filled square).
  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { cell } = this;
    const px = this.ox + x * cell;
    const py = this.oy + y * cell;
    rect(ctx, px + 1, py + 1, cell - 2, cell - 2);
    line(ctx, px + 3, py + 3, px + cell - 3, py + cell - 3);
    line(ctx, px + cell - 3, py + 3, px + 3, py + cell - 3);
  }

  // Bonus food: a filled dot with a ring that shrinks as time runs out.
  private drawBonus(ctx: CanvasRenderingContext2D, p: Vec, time: number) {
    const c = { x: this.cx(p.x), y: this.cy(p.y) };
    circle(ctx, c.x, c.y, this.cell * 0.25, true);
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.cell * 0.45, -Math.PI / 2, -Math.PI / 2 + (time / BONUS_TIME) * Math.PI * 2);
    ctx.stroke();
  }
}
