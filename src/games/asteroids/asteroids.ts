// Asteroids: ship, rocks that split, UFO, hyperspace, power-ups, extra lives; buttons or a virtual joystick on touch.
import { circle, overlay, text } from '../../engine/draw';
import { Effects } from '../../engine/effects';
import { SpatialGrid } from '../../engine/grid';
import { input, type Button } from '../../engine/input';
import { circlesHit, rand, type Vec } from '../../engine/math';
import { requestLayout, type Scene } from '../../engine/scene';
import { loadBest, saveBest } from '../../engine/storage';
import { ChoiceMenu } from '../../engine/ui';
import { drawHud, drawItem, drawRock, drawShip, drawStick, drawUfo } from './draw';
import {
  DROP_CHANCE,
  dropItem,
  EXTRA_LIFE_EVERY,
  FIRE_COOLDOWN,
  HYPER_COOLDOWN,
  INVULNERABLE,
  ITEM_R,
  LIVES,
  levelRocks,
  makeRock,
  makeUfo,
  MAX_BULLETS,
  moveWrapped,
  POWER_KINDS,
  POWER_TIME,
  ROCK_R,
  ROCK_SCORE,
  SHIP_R,
  UFO_FROM_LEVEL,
  UFO_R,
  UFO_SCORE,
  type Bullet,
  type Item,
  type PowerKind,
  type Rock,
  type Ship,
  type Ufo,
} from './entities';
import { hyperspaceJump, pushShip, shoot, steerWithKeys, steerWithStick, STICK_R } from './ship';
import { ufoGone, updateUfo } from './ufo';

type Controls = 'buttons' | 'joystick';
const noPowers = (): Record<PowerKind, number> => ({ shield: 0, triple: 0, rapid: 0 });

export class Asteroids implements Scene {
  pausable = true;
  private state: 'choose' | 'play' | 'over' = input.isTouch ? 'choose' : 'play';
  private controls: Controls = 'buttons';
  private w = 0;
  private h = 0;
  private ship: Ship = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, angle: 0 };
  private rocks: Rock[] = [];
  private bullets: Bullet[] = [];
  private ufo: Ufo | null = null;
  private ufoBullets: Bullet[] = [];
  private ufoTimer = 0;
  private items: Item[] = [];
  private powers = noPowers();
  private thrusting = false;
  private cooldown = 0;
  private hyperCooldown = 0;
  private invulnerable = 0;
  private lives = LIVES;
  private nextLife = EXTRA_LIFE_EVERY;
  private score = 0;
  private best = loadBest('asteroids');
  private level = 0;
  private levelTimer = 0;
  private time = 0;
  private fx = new Effects();
  private grid = new SpatialGrid<Rock>(64);
  private menu = new ChoiceMenu(
    'ASTEROIDS',
    () => [
      { label: 'Buttons (turn / thrust / fire)', onPick: () => this.start('buttons') },
      { label: 'Joystick (drag left side)', onPick: () => this.start('joystick') },
    ],
    () => 'Choose your touch controls',
  );

  layout(w: number, h: number): Button[] {
    const first = this.w === 0;
    this.w = w;
    this.h = h;
    if (first && this.state === 'play') this.reset();
    if (!input.isTouch || this.state === 'choose') return [];
    const r = 34;
    const y = h - r - 20;
    const fire: Button = { id: 'Space', x: w - r - 20, y, r, label: '●' };
    const hyper: Button = { id: 'KeyH', x: w - r - 20, y: y - r * 2 - 16, r: r * 0.75, label: '⤴' };
    if (this.controls === 'joystick') return [fire, hyper];
    return [
      { id: 'ArrowLeft', x: r + 20, y, r, label: '↺' },
      { id: 'ArrowRight', x: r * 3 + 40, y, r, label: '↻' },
      { id: 'ArrowUp', x: w - r * 3 - 40, y, r, label: '▲' },
      fire,
      hyper,
    ];
  }

  private start(controls: Controls) {
    this.controls = controls;
    this.state = 'play';
    this.reset();
    requestLayout();
  }

  private reset() {
    this.lives = LIVES;
    this.nextLife = EXTRA_LIFE_EVERY;
    this.score = 0;
    this.level = 0;
    this.bullets = [];
    this.ufo = null;
    this.ufoBullets = [];
    this.items = [];
    this.powers = noPowers();
    this.fx.clear();
    this.state = 'play';
    this.respawn();
    this.nextLevel();
  }

  private respawn() {
    this.ship = { pos: { x: this.w / 2, y: this.h / 2 }, vel: { x: 0, y: 0 }, angle: -Math.PI / 2 };
    this.invulnerable = INVULNERABLE;
  }

  private nextLevel() {
    this.level++;
    this.levelTimer = 1.5;
    this.ufoTimer = rand(20, 30);
    this.rocks = levelRocks(this.level, this.w, this.h, this.ship.pos);
  }

  // ---------- update ----------

  update(dt: number) {
    this.time += dt;
    this.fx.update(dt);
    if (this.state === 'choose') return this.menu.update(this.w, this.h);
    if (this.state === 'over') {
      if (input.confirmed()) this.reset();
      return;
    }
    this.levelTimer -= dt;
    this.updateShip(dt);
    this.moveAll(dt);
    this.updateUfo(dt);
    this.collide();
    for (const k of POWER_KINDS) this.powers[k] = Math.max(0, this.powers[k] - dt);
    if (!this.rocks.length) this.nextLevel();
  }

  private updateShip(dt: number) {
    const stick = this.controls === 'joystick' ? this.stick() : null;
    this.thrusting = stick ? steerWithStick(this.ship, stick, dt) : steerWithKeys(this.ship, dt);
    pushShip(this.ship, this.thrusting, dt, this.w, this.h);
    this.cooldown -= dt;
    this.hyperCooldown -= dt;
    this.invulnerable -= dt;
    // Holding fire auto-repeats, which is friendlier on touch screens.
    if (input.down('Space') && this.cooldown <= 0) this.fire();
    if (input.hit('KeyH') && this.hyperCooldown <= 0) this.hyperspace();
  }

  /** The joystick drag: a finger held down that started on the left half of the screen. */
  private stick() {
    return input.drags().find((d) => d.start.x < this.w / 2) ?? null;
  }

  private fire() {
    const triple = this.powers.triple > 0;
    if (this.bullets.length >= MAX_BULLETS * (triple ? 3 : 1)) return;
    this.cooldown = FIRE_COOLDOWN * (this.powers.rapid > 0 ? 0.5 : 1);
    this.bullets.push(...shoot(this.ship, triple));
  }

  private hyperspace() {
    const s = this.ship;
    this.fx.burst(s.pos.x, s.pos.y, 10, 80);
    hyperspaceJump(s, this.w, this.h);
    this.fx.burst(s.pos.x, s.pos.y, 10, 80);
    this.hyperCooldown = HYPER_COOLDOWN;
  }

  private moveAll(dt: number) {
    for (const r of this.rocks) {
      moveWrapped(r, dt, this.w, this.h);
      r.angle += r.spin * dt;
    }
    for (const b of [...this.bullets, ...this.ufoBullets, ...this.items]) moveWrapped(b, dt, this.w, this.h);
    this.bullets = this.bullets.filter((b) => (b.life -= dt) > 0);
    this.ufoBullets = this.ufoBullets.filter((b) => (b.life -= dt) > 0);
    this.items = this.items.filter((i) => (i.life -= dt) > 0);
  }

  // From level 3 a UFO crosses the screen every 20–30 s.
  private updateUfo(dt: number) {
    if (!this.ufo) {
      if (this.level >= UFO_FROM_LEVEL && (this.ufoTimer -= dt) <= 0) this.ufo = makeUfo(this.w, this.h);
      return;
    }
    const shot = updateUfo(this.ufo, dt, this.ship.pos, this.level);
    if (shot) this.ufoBullets.push(shot);
    if (ufoGone(this.ufo, this.w)) this.removeUfo();
  }

  private removeUfo() {
    this.ufo = null;
    this.ufoTimer = rand(20, 30);
  }

  // ---------- collisions ----------

  private collide() {
    this.grid.clear();
    for (const r of this.rocks) this.grid.insert(r, r.pos.x, r.pos.y, ROCK_R[r.size]);
    this.collideBullets();
    this.collideShip();
    for (const it of this.items) {
      if (!circlesHit(it.pos, ITEM_R, this.ship.pos, SHIP_R)) continue;
      it.life = 0;
      this.powers[it.kind] = POWER_TIME;
      this.fx.popup(it.kind, it.pos.x, it.pos.y);
    }
  }

  private collideBullets() {
    for (const b of this.bullets) {
      const rock = [...this.grid.near(b.pos.x, b.pos.y, 2)].find(
        (r) => this.rocks.includes(r) && circlesHit(b.pos, 2, r.pos, ROCK_R[r.size]),
      );
      if (rock) {
        b.life = 0;
        this.breakRock(rock);
      } else if (this.ufo && circlesHit(b.pos, 2, this.ufo.pos, UFO_R)) {
        b.life = 0;
        this.addScore(UFO_SCORE, this.ufo.pos);
        this.fx.burst(this.ufo.pos.x, this.ufo.pos.y, 14, 160);
        this.removeUfo();
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  // Split into two smaller rocks; small rocks may drop a power-up.
  private breakRock(rock: Rock) {
    this.rocks.splice(this.rocks.indexOf(rock), 1);
    this.addScore(ROCK_SCORE[rock.size], rock.pos);
    this.fx.burst(rock.pos.x, rock.pos.y, rock.size * 4, 60 + rock.size * 30);
    if (rock.size > 1) {
      this.rocks.push(makeRock({ ...rock.pos }, rock.size - 1), makeRock({ ...rock.pos }, rock.size - 1));
    } else if (Math.random() < DROP_CHANCE) {
      this.items.push(dropItem(rock.pos));
    }
  }

  private collideShip() {
    if (this.invulnerable > 0) return;
    const p = this.ship.pos;
    const r = SHIP_R * 0.8;
    const rock = [...this.grid.near(p.x, p.y, r)].some((k) => circlesHit(p, r, k.pos, ROCK_R[k.size]));
    const shot = this.ufoBullets.find((b) => circlesHit(p, r, b.pos, 2));
    const ufo = this.ufo && circlesHit(p, r, this.ufo.pos, UFO_R);
    if (shot) shot.life = 0;
    if (ufo) this.removeUfo();
    if (rock || shot || ufo) this.shipHit();
  }

  private shipHit() {
    const p = this.ship.pos;
    if (this.powers.shield > 0) {
      this.powers.shield = 0; // the shield absorbs one hit
      this.invulnerable = 1;
      this.fx.burst(p.x, p.y, 8, 100);
      return;
    }
    this.fx.burst(p.x, p.y, 16, 180);
    this.fx.flash(0.3);
    this.lives--;
    if (this.lives > 0) return this.respawn();
    this.state = 'over';
    if (this.score > this.best) saveBest('asteroids', (this.best = this.score));
  }

  private addScore(points: number, at: Vec) {
    this.score += points;
    this.fx.popup(`+${points}`, at.x, at.y);
    while (this.score >= this.nextLife) {
      this.lives++;
      this.nextLife += EXTRA_LIFE_EVERY;
      this.fx.popup('+1 life', this.ship.pos.x, this.ship.pos.y - 20);
    }
  }

  // ---------- drawing ----------

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.state === 'choose') return this.menu.draw(ctx, w, h);
    for (const r of this.rocks) drawRock(ctx, r);
    for (const b of this.bullets) circle(ctx, b.pos.x, b.pos.y, 2.5, true);
    for (const b of this.ufoBullets) circle(ctx, b.pos.x, b.pos.y, 3);
    for (const it of this.items) drawItem(ctx, it);
    if (this.ufo) drawUfo(ctx, this.ufo);

    const blink = this.invulnerable > 0 && Math.floor(this.time * 10) % 2 === 0;
    const flame = this.thrusting && Math.floor(this.time * 20) % 2 === 0;
    if (this.state === 'play' && !blink) drawShip(ctx, this.ship, flame, this.powers.shield > 0);
    const stick = this.controls === 'joystick' ? this.stick() : null;
    if (stick) drawStick(ctx, stick.start, stick.pos, STICK_R);

    const { score, best, level, lives, powers } = this;
    drawHud(ctx, { score, best, level, lives, powers, hyperReady: this.hyperCooldown <= 0 }, w);
    this.fx.draw(ctx, w, h);
    if (this.levelTimer > 0 && this.state === 'play') text(ctx, `LEVEL ${this.level}`, w / 2, h / 2 - 60, 30);
    if (this.state === 'over') overlay(ctx, w, h, 'GAME OVER', `Score ${this.score} · ${input.hint('restart')}`);
  }
}
