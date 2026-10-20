// Tower Defense game state, player actions, combos, waves and economy. One `simulate(dt)` step drives
// enemies (enemies.ts) and towers (combat.ts). No drawing and no input here; the scene calls the actions.
import type { Vec } from '../../engine/math';
import { loadBest, saveBest } from '../../engine/storage';
import { updateArrows, updateBullets, updateTower } from './combat';
import {
  BOSS_WAVE_HEAL,
  COMBO_PER_PARTNER,
  comboPartners,
  INTEREST_CAP,
  INTEREST_RATE,
  SELL_RATIO,
  START_COINS,
  START_LIVES,
  STREAK_BONUS,
  STREAK_STEP,
  TOWERS,
  upgradeCost,
  xpNeeded,
  type Bonus,
  type Kind,
} from './data';
import { removeDead, updateEnemies, updateSpawners } from './enemies';
import {
  AREA_TOWERS,
  TARGET_MODES,
  type Arrow,
  type Bullet,
  type Enemy,
  type Fx,
  type GameStats,
  type Note,
  type QueuedEnemy,
  type Spawner,
  type TargetMode,
  type Tower,
} from './model';
import { COLS, generatePath, ROWS } from './path';
import { CLEARED_DELAY, FIRST_WAVE_DELAY, makeQueue, waveTime } from './waves';

/** What placing a tower of `kind` on a tile would change: its own bonus and the boost given to each partner. */
export interface ComboPreview {
  self: number; // total bonus, e.g. 0.2 for two partners
  bonus: Bonus; // the same, by stat
  partners: { tower: Tower; gain: number }[];
}

export class TdGame {
  path: Vec[] = [];
  pathTiles = new Set<number>();
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  arrows: Arrow[] = [];
  fx: Fx[] = [];
  notes: Note[] = [];
  spawners: Spawner[] = [];
  nextQueue: QueuedEnemy[] = []; // the next wave, decided in advance so it can be previewed
  wave = 0;
  waveTimer = FIRST_WAVE_DELAY;
  coins = START_COINS;
  lives = START_LIVES;
  streak = 0; // waves in a row without losing a life
  bossWaves: number[] = []; // boss waves not finished yet
  best = loadBest('towerdefense');
  time = 0;
  over = false;
  defaultMode: TargetMode = 'first'; // for new towers, set from the 'All towers' button
  stats: GameStats = { livesLost: {}, damage: {} };
  /** Called just before a wave starts (the scene saves the game there). */
  onWaveStart: (() => void) | null = null;

  constructor() {
    this.reset();
  }

  reset() {
    this.setPath(generatePath());
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.arrows = [];
    this.fx = [];
    this.notes = [];
    this.spawners = [];
    this.nextQueue = makeQueue(1);
    this.wave = 0;
    this.waveTimer = FIRST_WAVE_DELAY;
    this.coins = START_COINS;
    this.lives = START_LIVES;
    this.streak = 0;
    this.bossWaves = [];
    this.time = 0;
    this.over = false;
    this.defaultMode = 'first';
    this.stats = { livesLost: {}, damage: {} };
  }

  setPath(path: Vec[]) {
    this.path = path;
    this.pathTiles = new Set(path.map((t) => t.y * COLS + t.x));
  }

  /** Position, in tile units, of the point `d` tiles along the path. */
  posAt(d: number): Vec {
    const i = Math.min(Math.floor(d), this.path.length - 2);
    const f = d - i;
    const a = this.path[i];
    const b = this.path[i + 1];
    return { x: a.x + (b.x - a.x) * f + 0.5, y: a.y + (b.y - a.y) * f + 0.5 };
  }

  // ---------- player actions ----------

  towerAt(tx: number, ty: number) {
    return this.towers.find((t) => t.tx === tx && t.ty === ty);
  }

  isFree(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && !this.pathTiles.has(ty * COLS + tx) && !this.towerAt(tx, ty);
  }

  build(kind: Kind, tx: number, ty: number) {
    const cost = TOWERS[kind].cost;
    if (!this.isFree(tx, ty) || this.coins < cost) return null;
    this.coins -= cost;
    const tower: Tower = {
      kind,
      mode: this.defaultMode,
      tx,
      ty,
      level: 1,
      spent: cost,
      xp: 0,
      cooldown: 0,
      angle: 0,
      bonus: {},
      partners: 0,
      damageDone: 0,
    };
    this.towers.push(tower);
    this.refreshCombos();
    return tower;
  }

  upgrade(t: Tower) {
    const cost = this.upgradePrice(t);
    if (this.coins < cost) return;
    this.coins -= cost;
    t.spent += cost;
    t.level++;
    t.xp = 0; // the experience was used as the discount
  }

  // Experience already earned discounts the upgrade: a half-full bar halves the price.
  upgradePrice(t: Tower) {
    return Math.ceil(upgradeCost(t.kind, t.level) * (1 - t.xp / xpNeeded(t.level)));
  }

  sellValue(t: Tower) {
    return Math.floor(t.spent * SELL_RATIO);
  }

  sell(t: Tower) {
    this.coins += this.sellValue(t);
    this.towers.splice(this.towers.indexOf(t), 1);
    this.refreshCombos();
  }

  cycleTarget(t: Tower) {
    if (!AREA_TOWERS.includes(t.kind)) t.mode = nextMode(t.mode);
  }

  /** Next mode for every tower at once; also used by towers built from now on. */
  cycleAllTargets() {
    this.defaultMode = nextMode(this.defaultMode);
    for (const t of this.towers) t.mode = this.defaultMode;
  }

  // Sending a wave early pays one coin per second skipped.
  sendNow() {
    this.coins += Math.floor(this.waveTimer);
    this.startWave();
  }

  streakMult() {
    return 1 + STREAK_BONUS * Math.floor(this.streak / STREAK_STEP);
  }

  gainXp(t: Tower, amount: number) {
    t.xp += amount;
    while (t.xp >= xpNeeded(t.level)) {
      t.xp -= xpNeeded(t.level);
      t.level++;
      this.fx.push({ type: 'ring', pos: { x: t.tx + 0.5, y: t.ty + 0.5 }, range: 0.8, kind: t.kind, life: 0.25 });
    }
  }

  /** Short message shown on the map for a moment. */
  note(text: string) {
    this.notes.push({ text, life: 2.5 });
  }

  // ---------- combos ----------

  /** Towers on the 8 tiles around (tx, ty). */
  neighbors(tx: number, ty: number) {
    return this.towers.filter((t) => Math.max(Math.abs(t.tx - tx), Math.abs(t.ty - ty)) === 1);
  }

  /** Bonus a tower of `kind` gets on (tx, ty): +10% of its combo stat per partner tower around it. */
  private comboBonus(kind: Kind, tx: number, ty: number) {
    const links = comboPartners(kind);
    const partners = this.neighbors(tx, ty).filter((o) => links.some((l) => l.partner === o.kind));
    const bonus: Bonus = {};
    for (const o of partners) {
      const stat = links.find((l) => l.partner === o.kind)!.stat;
      bonus[stat] = (bonus[stat] ?? 0) + COMBO_PER_PARTNER;
    }
    return { bonus, partners };
  }

  /** Recomputes every tower's combo bonus; called when towers are built, sold or loaded. */
  refreshCombos() {
    for (const t of this.towers) {
      const { bonus, partners } = this.comboBonus(t.kind, t.tx, t.ty);
      t.bonus = bonus;
      t.partners = partners.length;
    }
  }

  comboPreview(kind: Kind, tx: number, ty: number): ComboPreview {
    const { bonus, partners } = this.comboBonus(kind, tx, ty);
    return {
      self: partners.length * COMBO_PER_PARTNER,
      bonus,
      partners: partners.map((tower) => ({ tower, gain: COMBO_PER_PARTNER })),
    };
  }

  // ---------- simulation ----------

  simulate(dt: number) {
    this.time += dt;
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) this.startWave();

    updateSpawners(this, dt);
    updateEnemies(this, dt);
    for (const t of this.towers) updateTower(this, t, dt);
    updateBullets(this, dt);
    updateArrows(this, dt);
    this.fx = this.fx.filter((f) => (f.life -= dt) > 0);
    this.notes = this.notes.filter((n) => (n.life -= dt) > 0);
    removeDead(this);
    this.healAfterBossWaves();

    // Wave cleared: don't make the player wait for the clock.
    const cleared = this.wave > 0 && !this.enemies.length && !this.spawners.length;
    if (cleared) this.waveTimer = Math.min(this.waveTimer, CLEARED_DELAY);

    if (this.lives <= 0) this.gameOver();
  }

  private gameOver() {
    this.lives = 0;
    this.over = true;
    if (this.wave > this.best) saveBest('towerdefense', (this.best = this.wave));
  }

  private startWave() {
    this.onWaveStart?.();
    if (this.wave > 0) this.streak++;
    this.wave++;
    this.waveTimer = waveTime(this.wave);
    this.payInterest();
    if (this.nextQueue.some((q) => q.boss)) this.bossWaves.push(this.wave);
    this.spawners.push({ queue: this.nextQueue, wave: this.wave, timer: 0 });
    this.nextQueue = makeQueue(this.wave + 1);
  }

  private payInterest() {
    const interest = Math.min(INTEREST_CAP, Math.floor(this.coins * INTEREST_RATE));
    if (interest <= 0) return;
    this.coins += interest;
    this.note(`+${interest} coins interest`);
  }

  // Finishing a boss wave (every enemy of it gone, split copies included) gives back 30% of the lost lives, rounded up.
  private healAfterBossWaves() {
    this.bossWaves = this.bossWaves.filter((w) => {
      const pending = this.spawners.some((s) => s.wave === w) || this.enemies.some((e) => e.wave === w);
      if (pending) return true;
      // Rounded up, so any missing life gives at least 1 back (epsilon guards float error, e.g. 10 × 0.3).
      const heal = this.lives > 0 ? Math.ceil((START_LIVES - this.lives) * BOSS_WAVE_HEAL - 1e-9) : 0;
      if (heal > 0) {
        this.lives += heal;
        this.note(`Boss wave cleared: +${heal} lives`);
      }
      return false;
    });
  }
}

const nextMode = (m: TargetMode) => TARGET_MODES[(TARGET_MODES.indexOf(m) + 1) % TARGET_MODES.length];
