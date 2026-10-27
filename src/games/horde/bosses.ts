// The 7 bosses (one every 3 minutes, in rotation, faster on each loop): their attack phases, their minions
// (eggs, decoys) and their hazards (shockwaves, lasers).
import { dist, rand, type Vec } from '../../engine/math';
import { BOSS_GROWTH, PLAYER_R, type Shape } from './data';
import { angleTo, chase, dashStep, makeEnemy, shoot, startAim, toward, type Behavior } from './foes';
import type { Run } from './game';
import type { Enemy } from './model';
import { segmentDist } from './targeting';

export type BossKind = 'starlord' | 'queen' | 'prism' | 'spiral' | 'juggernaut' | 'twins' | 'mirror';

export interface BossDef {
  name: string;
  shape: Shape;
  color: string;
  r: number;
  hpShare: number; // share of the boss HP (the twins split it)
  phases: Behavior[]; // played in a loop, PHASE seconds each
}

const PHASE = 4;
const FURY_PER_LOOP = 0.25; // +25% speed of everything a boss does, each time the rotation starts again
const RING = 16;
const SUMMON = 6;
const EGGS = 4;
const EGG_HATCH = 3; // seconds
const HATCH_INTO = 3; // runners per egg
const ENCIRCLE = 12; // grunts in the closing ring
const ENCIRCLE_R = 230;
const LASER_WARN = 0.8;
const LASER_SWEEP = 1.6; // radians swept
const LASER_TIME = 2;
const LASER_LENGTH = 650;
const SPIRAL_EVERY = 0.09;
const SPIRAL_TURN = 0.38;
const WAVE_R = 170;
const WAVE_GROW = 0.6; // seconds
const TWIN_R = 200;
const DECOY_LIFE = 6;
const BLINK_R = 200;

/** Runs `fn` once per phase (phases reset `timer` to 0 when they start). */
function once(e: Enemy, fn: () => void) {
  if (e.timer > 0) return;
  e.timer = PHASE * 2;
  fn();
}

/** Every `every` seconds of the phase, runs `fn` (uses `timer` as the countdown). */
function every(e: Enemy, dt: number, period: number, fn: () => void) {
  if ((e.timer -= dt) > 0) return;
  e.timer += period;
  fn();
}

const around = (c: Vec, r: number, i: number, n: number, turn = 0): Vec => ({
  x: c.x + Math.cos(turn + (i / n) * Math.PI * 2) * r,
  y: c.y + Math.sin(turn + (i / n) * Math.PI * 2) * r,
});

function spawnAround(run: Run, kind: 'grunt' | 'egg', c: Vec, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const e = makeEnemy(kind, around(c, r, i, n, rand(0, 1)), run);
    if (kind === 'egg') e.ttl = EGG_HATCH;
    run.enemies.push(e);
  }
}

// ---------- phases ----------

const ring: Behavior = (e, run, dt) =>
  every(e, dt, PHASE / 2, () => {
    const a0 = rand(0, Math.PI);
    for (let i = 0; i < RING; i++) shoot(run, e, a0 + (i / RING) * Math.PI * 2);
  });

const summon: Behavior = (e, run, dt) => {
  toward(e, run.player.pos, e.speed * 0.5, dt);
  once(e, () => spawnAround(run, 'grunt', e.pos, e.r * 2, SUMMON));
};

const charge: Behavior = (e, run, dt) => {
  if (e.mode === 'walk') startAim(e, run.player.pos);
  else dashStep(e, dt);
};

const layEggs: Behavior = (e, run, dt) => {
  toward(e, run.player.pos, e.speed * 0.4, dt);
  once(e, () => spawnAround(run, 'egg', e.pos, e.r * 1.6, EGGS));
};

// A ring of Grunts appears around the player and closes in.
const encircle: Behavior = (e, run) => once(e, () => spawnAround(run, 'grunt', run.player.pos, ENCIRCLE_R, ENCIRCLE));

// Stays at range and fires 3-bullet fans.
const snipe: Behavior = (e, run, dt) => {
  const d = dist(e.pos, run.player.pos);
  if (Math.abs(d - 260) > 30) toward(e, run.player.pos, d > 260 ? e.speed : -e.speed, dt);
  every(e, dt, 1.2, () => [-0.2, 0, 0.2].forEach((da) => shoot(run, e, angleTo(e.pos, run.player.pos) + da)));
};

const laser: Behavior = (e, run) =>
  once(e, () => {
    const dir = Math.sign(rand(-1, 1)) || 1;
    const angle = angleTo(e.pos, run.player.pos) - (dir * LASER_SWEEP) / 2;
    run.hazards.push({
      kind: 'laser',
      owner: e,
      pos: { ...e.pos },
      r: LASER_LENGTH,
      maxR: LASER_LENGTH,
      angle,
      spin: (dir * LASER_SWEEP) / LASER_TIME,
      warn: LASER_WARN,
      life: LASER_WARN + LASER_TIME,
      damage: e.damage,
      hit: false,
    });
  });

// Two arms of bullets turning around the boss.
const spiral: Behavior = (e, run, dt) =>
  every(e, dt, SPIRAL_EVERY, () => {
    e.aim.x += SPIRAL_TURN;
    shoot(run, e, e.aim.x);
    shoot(run, e, e.aim.x + Math.PI);
  });

const flower: Behavior = (e, run, dt) => {
  chase(e, run, dt * 0.5);
  every(e, dt, 1, () => {
    e.aim.y += Math.PI / 12;
    for (let i = 0; i < 12; i++) shoot(run, e, e.aim.y + (i / 12) * Math.PI * 2, 120);
  });
};

// Charges again and again; each charge ends with a shockwave.
const rampage: Behavior = (e, run, dt) => {
  if (e.mode === 'walk') startAim(e, run.player.pos, 0.4);
  else if (dashStep(e, dt, 520)) addWave(run, e);
};

function addWave(run: Run, e: Enemy) {
  run.hazards.push({
    kind: 'wave',
    owner: e,
    pos: { ...e.pos },
    r: 0,
    maxR: WAVE_R,
    angle: 0,
    spin: 0,
    warn: 0,
    life: WAVE_GROW,
    damage: e.damage,
    hit: false,
  });
}

// The twins circle the player on opposite sides and shoot lines of bullets; alone, the survivor gets closer and faster.
const twin: Behavior = (e, run, dt) => {
  const alone = !run.enemies.some((o) => o !== e && o.bossKind === 'twins' && o.boss && o.hp > 0);
  const spot = around(run.player.pos, alone ? TWIN_R * 0.65 : TWIN_R, e.slot, 2, run.time * 0.7);
  toward(e, spot, e.speed * 1.5, dt);
  every(e, dt, alone ? 0.8 : 1.6, () =>
    [150, 185, 220].forEach((v) => shoot(run, e, angleTo(e.pos, run.player.pos), v)),
  );
};

// Teleports next to the player and leaves two decoys that look the same.
const blink: Behavior = (e, run) =>
  once(e, () => {
    run.fx.burst(e.pos.x, e.pos.y, 10, 120);
    const turn = rand(0, Math.PI * 2);
    e.pos = around(run.player.pos, BLINK_R, 0, 3, turn);
    for (let i = 1; i < 3; i++) {
      const decoy = makeEnemy('decoy', around(run.player.pos, BLINK_R, i, 3, turn), run);
      Object.assign(decoy, { bossKind: 'mirror', r: e.r, ttl: DECOY_LIFE });
      run.enemies.push(decoy);
    }
  });

const burst: Behavior = (e, run, dt) => {
  chase(e, run, dt * 0.6);
  every(e, dt, 0.6, () => [-0.15, 0, 0.15].forEach((da) => shoot(run, e, angleTo(e.pos, run.player.pos) + da)));
};

const slowChase: Behavior = (e, run, dt) => chase(e, run, dt * 0.6);

export const BOSSES: Record<BossKind, BossDef> = {
  starlord: {
    name: 'Star Lord',
    shape: 'star',
    color: '#888',
    r: 40,
    hpShare: 1,
    phases: [chase, ring, summon, charge],
  },
  queen: {
    name: 'Hive Queen',
    shape: 'octagon',
    color: '#ff8f00',
    r: 40,
    hpShare: 1,
    phases: [slowChase, layEggs, encircle, slowChase],
  },
  prism: {
    name: 'Prism',
    shape: 'triangle',
    color: '#00acc1',
    r: 42,
    hpShare: 1,
    phases: [snipe, laser, snipe, laser],
  },
  spiral: {
    name: 'Spiral',
    shape: 'hexagon',
    color: '#d81b60',
    r: 38,
    hpShare: 1,
    phases: [spiral, chase, flower, chase],
  },
  juggernaut: {
    name: 'Juggernaut',
    shape: 'square',
    color: '#2e7d32',
    r: 44,
    hpShare: 1.3,
    phases: [rampage, slowChase, rampage, chase],
  },
  twins: { name: 'Twins', shape: 'circle', color: '#5e35b1', r: 30, hpShare: 0.6, phases: [twin] },
  mirror: {
    name: 'Mirror',
    shape: 'diamond',
    color: '#90a4ae',
    r: 36,
    hpShare: 1,
    phases: [blink, burst, blink, slowChase],
  },
};

export const BOSS_ORDER = Object.keys(BOSSES) as BossKind[];

/** Boss number `n` (1, 2, …): the next one in the rotation, stronger each time. */
export function spawnBoss(run: Run, n: number, at: Vec) {
  const kind = BOSS_ORDER[(n - 1) % BOSS_ORDER.length];
  const def = BOSSES[kind];
  const hpMult = (1 + BOSS_GROWTH * (n - 1)) * def.hpShare;
  const fury = 1 + FURY_PER_LOOP * Math.floor((n - 1) / BOSS_ORDER.length);
  const count = kind === 'twins' ? 2 : 1;
  for (let slot = 0; slot < count; slot++) {
    const boss = makeEnemy('boss', { x: at.x + slot * 80, y: at.y }, run, { hpMult });
    Object.assign(boss, { bossKind: kind, r: def.r, fury, slot, phaseLeft: PHASE });
    run.enemies.push(boss);
  }
}

export const bossBehavior: Behavior = (e, run, dt) => {
  const phases = BOSSES[e.bossKind ?? 'starlord'].phases;
  dt *= e.fury;
  if ((e.phaseLeft -= dt) <= 0) {
    e.phase = (e.phase + 1) % phases.length;
    e.phaseLeft = PHASE;
    [e.mode, e.timer] = ['walk', 0];
  }
  phases[e.phase](e, run, dt);
};

/** Decoys chase and shoot; eggs wait to hatch. */
export const decoyBehavior: Behavior = (e, run, dt) => burst(e, run, dt);
export const eggBehavior: Behavior = () => {};

/** An enemy whose `ttl` ran out: eggs hatch into Runners, decoys vanish. Gives no XP. */
export function expire(run: Run, e: Enemy) {
  e.hp = 0;
  run.fx.burst(e.pos.x, e.pos.y, 5, 60);
  if (e.kind === 'egg') {
    for (let i = 0; i < HATCH_INTO; i++) run.enemies.push(makeEnemy('runner', around(e.pos, 12, i, HATCH_INTO), run));
  }
}

export function updateHazards(run: Run, dt: number) {
  const p = run.player.pos;
  for (const h of run.hazards) {
    h.life -= dt;
    if (h.kind === 'wave') {
      h.r += (h.maxR / WAVE_GROW) * dt;
      if (!h.hit && Math.abs(dist(p, h.pos) - h.r) < PLAYER_R + 4) {
        h.hit = true;
        run.hurtPlayer(h.damage);
      }
      continue;
    }
    h.pos = { ...h.owner.pos };
    if ((h.warn -= dt) > 0) continue;
    h.angle += h.spin * dt;
    const end = { x: h.pos.x + Math.cos(h.angle) * h.r, y: h.pos.y + Math.sin(h.angle) * h.r };
    if (segmentDist(p, h.pos, end) < PLAYER_R + 6) run.hurtPlayer(h.damage);
  }
  run.hazards = run.hazards.filter((h) => h.life > 0 && h.owner.hp > 0);
}
