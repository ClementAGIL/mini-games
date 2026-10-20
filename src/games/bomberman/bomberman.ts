// Bomberman: solo levels (enemies, hidden exit, time limit, level codes) or a 2-player duel on one keyboard.
import { fitSize, overlay, text } from '../../engine/draw';
import { Effects } from '../../engine/effects';
import { dpad, input, type Button } from '../../engine/input';
import { dist } from '../../engine/math';
import { requestLayout, type Scene } from '../../engine/scene';
import { loadBest, saveBest } from '../../engine/storage';
import { ChoiceMenu, type Choice } from '../../engine/ui';
import { moveEnemy, movePlayer, pickup } from './actors';
import { burning, dangerTiles, detonate, placeBomb, updateBombs } from './bombs';
import { drawWorld } from './draw';
import { generateLevel, levelCode, newSeed, parseLevelCode, STARTS } from './level';
import {
  COLS,
  DUEL_KEYS,
  DUEL_TIME,
  ENEMY_SCORE,
  LEVEL_TIME,
  newPlayer,
  ROWS,
  SOLO_KEYS,
  tileOf,
  TIME_BONUS,
  type Player,
  type World,
} from './model';

type State = 'choose' | 'play' | 'dead' | 'clear' | 'round';

const emptyWorld = (): World => ({
  grid: [],
  bombs: [],
  flames: new Map(),
  powerups: new Map(),
  door: -1,
  doorOpen: false,
  enemies: [],
  players: [],
});

export class Bomberman implements Scene {
  pausable = true;
  private state: State = 'choose';
  private duel = false;
  private world = emptyWorld();
  private level = 1;
  private seed = newSeed();
  private score = 0;
  private best = loadBest('bomberman');
  private timeLeft = LEVEL_TIME;
  private bonus = 0; // time bonus of the last cleared level
  private wins = [0, 0];
  private winner = 0; // duel round result: 1, 2, or 0 for a draw
  private time = 0;
  private fx = new Effects();
  private menu = new ChoiceMenu(
    'BOMBERMAN',
    () => this.choices(),
    () => this.help(),
  );

  private w = 0;
  private h = 0;
  private ox = 0;
  private oy = 0;
  private tile = 0;

  layout(w: number, h: number): Button[] {
    this.w = w;
    this.h = h;
    const touch = input.isTouch;
    const size = !touch
      ? Math.min((w - 40) / COLS, (h - 90) / ROWS)
      : w >= h
        ? Math.min((w - 440) / COLS, (h - 70) / ROWS)
        : Math.min((w - 20) / COLS, (h - 340) / ROWS);
    this.tile = Math.floor(size);
    this.ox = Math.floor((w - this.tile * COLS) / 2);
    this.oy = w >= h || !touch ? Math.floor((h - this.tile * ROWS) / 2 + 26) : 80;
    if (!touch || this.state === 'choose') return [];
    const cy = w >= h ? h / 2 + 30 : h - 130;
    return [
      ...dpad(110, cy),
      { id: 'Space', x: w - 80, y: cy, r: 40, label: '●' },
      { id: 'KeyE', x: w - 80, y: cy - 90, r: 28, label: '✸' }, // detonate (Remote power-up)
    ];
  }

  // ---------- start screen ----------

  private choices(): Choice[] {
    const list: Choice[] = [{ label: '1 player', onPick: () => this.startSolo(1, newSeed()) }];
    if (!input.isTouch) list.push({ label: '2 players (one keyboard)', onPick: () => this.startDuel() });
    list.push({ label: 'Play a level code…', onPick: () => this.askCode() });
    return list;
  }

  private help() {
    if (input.isTouch) return 'D-pad to move · ● bomb · ✸ detonate remote bombs';
    return '1P: arrows/WASD, Space, E · 2P: WASD + Space + E against arrows + Enter + Right Shift';
  }

  private askCode() {
    const parsed = parseLevelCode(window.prompt('Level code (for example 3-48213)') ?? '');
    if (parsed) this.startSolo(parsed.level, parsed.seed);
    else this.fx.popup('Not a level code', this.w / 2, this.h / 2 - 90);
  }

  // ---------- flow ----------

  private startSolo(level: number, seed: number) {
    this.duel = false;
    this.level = level;
    this.seed = seed;
    this.score = 0;
    this.buildLevel(null);
  }

  private startDuel() {
    this.duel = true;
    this.wins = [0, 0];
    this.seed = newSeed();
    this.buildLevel(null);
  }

  /** Builds the arena from the level code. `carry`: the solo player whose power-ups go on to the next level. */
  private buildLevel(carry: Player | null) {
    const plan = generateLevel(this.seed, this.level, this.duel);
    const solo = carry ? { ...carry, pos: { ...STARTS[0] }, alive: true } : newPlayer(1, { ...STARTS[0] }, SOLO_KEYS);
    const players = this.duel ? DUEL_KEYS.map((keys, i) => newPlayer(i + 1, { ...STARTS[i] }, keys)) : [solo];
    this.world = {
      ...emptyWorld(),
      grid: plan.grid,
      door: plan.door,
      enemies: plan.enemies.map((e) => ({
        kind: e.kind,
        pos: { ...e.pos },
        target: { ...e.pos },
        dir: { x: 0, y: 0 },
      })),
      players,
    };
    this.timeLeft = this.duel ? DUEL_TIME : LEVEL_TIME;
    this.fx.clear();
    this.setState('play');
  }

  private setState(state: State) {
    const relayout = (state === 'choose') !== (this.state === 'choose');
    this.state = state;
    if (relayout) requestLayout(); // touch buttons only show while playing
  }

  update(dt: number) {
    this.time += dt;
    this.fx.update(dt);
    if (this.state === 'choose') return this.menu.update(this.w, this.h);
    if (this.state === 'play') return this.play(dt);
    if (!input.confirmed()) return;
    if (this.state === 'dead') this.setState('choose');
    else if (this.state === 'clear') this.nextLevel();
    else this.nextRound();
  }

  private nextLevel() {
    this.level++;
    this.seed = newSeed();
    this.buildLevel(this.world.players[0]);
  }

  private nextRound() {
    this.seed = newSeed();
    this.buildLevel(null);
  }

  private play(dt: number) {
    const w = this.world;
    for (const p of w.players) if (p.alive) this.controlPlayer(p, dt);
    updateBombs(w, dt);
    const danger = dangerTiles(w);
    for (const e of w.enemies) moveEnemy(w, e, dt, danger);
    this.checkHits();
    if ((this.timeLeft -= dt) <= 0) this.timeUp();
    this.checkEnd();
  }

  private controlPlayer(p: Player, dt: number) {
    movePlayer(this.world, p, dt);
    if (input.hit(...p.keys.bomb)) placeBomb(this.world, p);
    if (p.remote && input.hit(...p.keys.detonate)) detonate(this.world, p);
    const got = pickup(this.world, p);
    if (got) this.popupAt(p.pos, got);
  }

  /** Enemies and players in burning tiles die; an enemy touching a player kills the player. */
  private checkHits() {
    const w = this.world;
    for (const e of w.enemies.filter((e) => burning(w, tileOf(e.pos)))) {
      w.enemies.splice(w.enemies.indexOf(e), 1);
      if (!this.duel) this.score += ENEMY_SCORE;
      this.popupAt(e.pos, `+${ENEMY_SCORE}`, true);
    }
    for (const p of w.players) {
      if (!p.alive) continue;
      const touched = w.enemies.some((e) => dist(e.pos, p.pos) < 0.7);
      if (!burning(w, tileOf(p.pos)) && !touched) continue;
      p.alive = false;
      this.popupAt(p.pos, '', true);
    }
  }

  private timeUp() {
    this.timeLeft = 0;
    if (this.duel) return this.endRound(0);
    this.world.players[0].alive = false;
  }

  /** Solo: lose when the player dies, win on the exit once every enemy is gone. Duel: last one standing. */
  private checkEnd() {
    const w = this.world;
    if (this.state !== 'play') return;
    if (this.duel) {
      const alive = w.players.filter((p) => p.alive);
      if (alive.length <= 1) this.endRound(alive[0]?.id ?? 0);
      return;
    }
    const p = w.players[0];
    if (!p.alive) return this.lose();
    if (!w.enemies.length && w.doorOpen && tileOf(p.pos) === w.door) this.win();
  }

  private lose() {
    this.setState('dead');
    this.fx.flash(0.5);
    if (this.score > this.best) saveBest('bomberman', (this.best = this.score));
  }

  private win() {
    this.bonus = Math.ceil(this.timeLeft) * TIME_BONUS;
    this.score += this.bonus;
    this.setState('clear');
    this.fx.flash(0.3);
    if (this.score > this.best) saveBest('bomberman', (this.best = this.score));
  }

  private endRound(winner: number) {
    this.winner = winner;
    if (winner) this.wins[winner - 1]++;
    this.setState('round');
    this.fx.flash(0.4);
  }

  // ---------- drawing ----------

  private popupAt(p: { x: number; y: number }, str: string, burst = false) {
    const x = this.ox + (p.x + 0.5) * this.tile;
    const y = this.oy + (p.y + 0.5) * this.tile;
    if (str) this.fx.popup(str, x, y);
    if (burst) this.fx.burst(x, y, 8, 80);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.state === 'choose') {
      this.menu.draw(ctx, w, h);
      return this.fx.draw(ctx, w, h);
    }
    this.drawHud(ctx, w);
    drawWorld(ctx, this.world, { ox: this.ox, oy: this.oy, tile: this.tile, time: this.time });
    this.fx.draw(ctx, w, h);
    const code = levelCode(this.level, this.seed);
    if (this.state === 'dead') overlay(ctx, w, h, 'GAME OVER', `Code ${code} · ${input.hint('continue')}`);
    if (this.state === 'clear') {
      overlay(ctx, w, h, `LEVEL ${this.level} CLEAR`, `+${this.bonus} time bonus · ${input.hint('continue')}`);
    }
    if (this.state === 'round') {
      const title = this.winner ? `PLAYER ${this.winner} WINS` : 'DRAW';
      overlay(ctx, w, h, title, `${this.wins[0]} – ${this.wins[1]} · ${input.hint('play again')}`);
    }
  }

  /** Two lines above the arena: score/time (or duel wins) and each player's power-ups. */
  private drawHud(ctx: CanvasRenderingContext2D, w: number) {
    const secs = Math.ceil(this.timeLeft);
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const world = this.world;
    const code = levelCode(this.level, this.seed);
    const top = this.duel
      ? `P1 ${this.wins[0]} – ${this.wins[1]} P2   Time ${clock}`
      : `Level ${this.level}   Score ${this.score}   Best ${this.best}   Time ${clock}   Code ${code}`;
    const goal = world.doorOpen ? '   → go to the exit' : '   → find the exit';
    const powers = world.players.map(powerText).join('   |   ') + (!this.duel && !world.enemies.length ? goal : '');
    text(ctx, top, w / 2, this.oy - 34, fitSize(ctx, top, w - 120, 15));
    text(ctx, powers, w / 2, this.oy - 14, fitSize(ctx, powers, w - 120, 12));
  }
}

function powerText(p: Player) {
  const extras = [p.kick && 'kick', p.remote && 'remote', p.pass && 'pass'].filter(Boolean).join(' · ');
  return `P${p.id}: bombs ${p.maxBombs} · range ${p.range} · speed ${p.speed.toFixed(1)}${extras ? ` · ${extras}` : ''}`;
}
