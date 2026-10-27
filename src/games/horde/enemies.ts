// Enemies: creation with the difficulty growth, behaviors (one function per kind), crowd separation, contact
// damage, enemy bullets and death effects.
import { circlesHit, dist, rand, type Vec } from '../../engine/math';
import {
  BLAST_R,
  BOSS_GROWTH,
  BOSS_PHASE,
  BOSS_RING,
  BOSS_SUMMON,
  damageScale,
  DASH_AIM,
  DASH_RANGE,
  DASH_REST,
  DASH_SPEED,
  DASH_TIME,
  ELITE_DAMAGE,
  ELITE_HP,
  ELITE_SIZE,
  ENEMIES,
  FUSE,
  FUSE_RANGE,
  hpScale,
  PLAYER_R,
  SHOOTER_RANGE,
  SHOOTER_RELOAD,
  SHOT_SPEED,
  speedScale,
  SPLIT_INTO,
  type EnemyKind,
} from './data';
import type { Run } from './game';
import type { Enemy } from './model';

const KNOCK_KEEP = 0.02; // share of knockback speed kept after one second
const SHOT_LIFE = 4;

export function makeEnemy(kind: EnemyKind, pos: Vec, t: number, opts: { elite?: boolean; bossNumber?: number } = {}) {
  const def = ENEMIES[kind];
  const elite = !!opts.elite;
  const boss = kind === 'boss';
  const hp = def.hp * hpScale(t) * (elite ? ELITE_HP : 1) * (boss ? 1 + BOSS_GROWTH * ((opts.bossNumber ?? 1) - 1) : 1);
  const e: Enemy = {
    kind,
    pos,
    knock: { x: 0, y: 0 },
    r: def.r * (elite ? ELITE_SIZE : 1),
    hp,
    maxHp: hp,
    speed: def.speed * speedScale(t),
    damage: def.damage * damageScale(t) * (elite ? ELITE_DAMAGE : 1),
    xp: def.xp,
    elite,
    boss,
    mode: 'walk',
    phase: 0,
    phaseLeft: BOSS_PHASE,
    timer: rand(0.5, 1.5) * (kind === 'shooter' ? SHOOTER_RELOAD : DASH_REST),
    aim: { x: 0, y: 0 },
    fuse: -1,
    orbitAt: -99,
    flash: 0,
  };
  return e;
}

// ---------- movement helpers ----------

const unitTo = (from: Vec, to: Vec): Vec => {
  const d = dist(from, to) || 1;
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
};

/** Moves `e` toward `target` (away with a negative speed). */
function toward(e: Enemy, target: Vec, speed: number, dt: number) {
  const u = unitTo(e.pos, target);
  e.pos.x += u.x * speed * dt;
  e.pos.y += u.y * speed * dt;
}

function startAim(e: Enemy, target: Vec) {
  e.mode = 'aim';
  e.timer = DASH_AIM;
  e.aim = unitTo(e.pos, target);
}

/** Aim (stand still), then charge along `aim`. Returns true when the charge is over. */
function dashStep(e: Enemy, dt: number) {
  e.timer -= dt;
  if (e.mode === 'aim') {
    if (e.timer <= 0) [e.mode, e.timer] = ['dash', DASH_TIME];
    return false;
  }
  e.pos.x += e.aim.x * DASH_SPEED * dt;
  e.pos.y += e.aim.y * DASH_SPEED * dt;
  if (e.timer > 0) return false;
  [e.mode, e.timer] = ['walk', DASH_REST];
  return true;
}

function shoot(run: Run, e: Enemy, angle: number) {
  const vel = { x: Math.cos(angle) * SHOT_SPEED, y: Math.sin(angle) * SHOT_SPEED };
  run.shots.push({ pos: { ...e.pos }, vel, damage: e.damage, life: SHOT_LIFE });
}

const angleTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x);

// ---------- behaviors ----------

type Behavior = (e: Enemy, run: Run, dt: number) => void;

const chase: Behavior = (e, run, dt) => toward(e, run.player.pos, e.speed, dt);

// Keeps its distance: closes in, backs off, or strafes around the player, and shoots now and then.
const shooter: Behavior = (e, run, dt) => {
  const p = run.player.pos;
  const d = dist(e.pos, p);
  if (d > SHOOTER_RANGE + 30) toward(e, p, e.speed, dt);
  else if (d < SHOOTER_RANGE - 30) toward(e, p, -e.speed, dt);
  else {
    const u = unitTo(e.pos, p);
    e.pos.x -= u.y * e.speed * 0.6 * dt;
    e.pos.y += u.x * e.speed * 0.6 * dt;
  }
  e.timer -= dt;
  if (e.timer > 0 || d > SHOOTER_RANGE * 1.8) return;
  e.timer = SHOOTER_RELOAD;
  shoot(run, e, angleTo(e.pos, p));
};

const dasher: Behavior = (e, run, dt) => {
  if (e.mode !== 'walk') return void dashStep(e, dt);
  chase(e, run, dt);
  e.timer -= dt;
  if (e.timer <= 0 && dist(e.pos, run.player.pos) < DASH_RANGE) startAim(e, run.player.pos);
};

// Runs in, lights the fuse when close, slows down and blows up (hurting the player and other enemies).
const bomber: Behavior = (e, run, dt) => {
  if (e.fuse < 0) {
    chase(e, run, dt);
    if (dist(e.pos, run.player.pos) < FUSE_RANGE + e.r) e.fuse = FUSE;
    return;
  }
  toward(e, run.player.pos, e.speed * 0.4, dt);
  if ((e.fuse -= dt) > 0) return;
  e.hp = 0; // a self-destruct gives no XP
  explode(run, e, true);
};

const ring: Behavior = (e, run, dt) => {
  if ((e.timer -= dt) > 0) return;
  e.timer = BOSS_PHASE / 2;
  const a0 = rand(0, Math.PI);
  for (let i = 0; i < BOSS_RING; i++) shoot(run, e, a0 + (i / BOSS_RING) * Math.PI * 2);
};

const summon: Behavior = (e, run, dt) => {
  toward(e, run.player.pos, e.speed * 0.5, dt);
  if (e.timer > 0) return;
  e.timer = BOSS_PHASE;
  for (let i = 0; i < BOSS_SUMMON; i++) {
    const a = (i / BOSS_SUMMON) * Math.PI * 2;
    const pos = { x: e.pos.x + Math.cos(a) * e.r * 2, y: e.pos.y + Math.sin(a) * e.r * 2 };
    run.enemies.push(makeEnemy('grunt', pos, run.time));
  }
};

const charge: Behavior = (e, run, dt) => {
  if (e.mode === 'walk') startAim(e, run.player.pos);
  else dashStep(e, dt);
};

const BOSS_PHASES: Behavior[] = [chase, ring, summon, charge];

const boss: Behavior = (e, run, dt) => {
  if ((e.phaseLeft -= dt) <= 0) {
    e.phase = (e.phase + 1) % BOSS_PHASES.length;
    e.phaseLeft = BOSS_PHASE;
    [e.mode, e.timer] = ['walk', 0];
  }
  BOSS_PHASES[e.phase](e, run, dt);
};

const BEHAVIOR: Record<EnemyKind, Behavior> = {
  grunt: chase,
  runner: chase,
  shooter,
  dasher,
  splitter: chase,
  tank: chase,
  bomber,
  boss,
};

// ---------- update ----------

export function updateEnemies(run: Run, dt: number) {
  const keep = Math.pow(KNOCK_KEEP, dt);
  for (const e of run.enemies) {
    e.flash -= dt;
    BEHAVIOR[e.kind](e, run, dt);
    e.pos.x += e.knock.x * dt;
    e.pos.y += e.knock.y * dt;
    e.knock.x *= keep;
    e.knock.y *= keep;
  }
  run.grid.clear();
  for (const e of run.enemies) run.grid.insert(e, e.pos.x, e.pos.y, e.r);
  separate(run);
  touchPlayer(run);
  updateShots(run, dt);
}

/** Pushes `e` away from `from` (heavy enemies don't move). */
export function knockBack(e: Enemy, from: Vec, speed: number) {
  if (ENEMIES[e.kind].heavy) return;
  const u = unitTo(from, e.pos);
  e.knock.x += u.x * speed;
  e.knock.y += u.y * speed;
}

// Overlapping enemies push each other apart (the smaller one moves more), so the horde spreads into a crowd.
function separate(run: Run) {
  for (const e of run.enemies) {
    if (ENEMIES[e.kind].heavy) continue;
    for (const o of run.grid.near(e.pos.x, e.pos.y, e.r)) {
      const dx = e.pos.x - o.pos.x;
      const dy = e.pos.y - o.pos.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const overlap = e.r + o.r - d;
      if (o === e || overlap <= 0) continue;
      const share = (overlap * o.r) / (e.r + o.r);
      e.pos.x += (dx / d) * share;
      e.pos.y += (dy / d) * share;
    }
  }
}

function touchPlayer(run: Run) {
  const p = run.player.pos;
  for (const e of run.grid.near(p.x, p.y, PLAYER_R)) {
    if (e.hp > 0 && circlesHit(e.pos, e.r, p, PLAYER_R)) run.hurtPlayer(e.damage);
  }
}

function updateShots(run: Run, dt: number) {
  for (const s of run.shots) {
    s.pos.x += s.vel.x * dt;
    s.pos.y += s.vel.y * dt;
    s.life -= dt;
    if (circlesHit(s.pos, 4, run.player.pos, PLAYER_R)) {
      run.hurtPlayer(s.damage);
      s.life = 0;
    }
  }
  run.shots = run.shots.filter((s) => s.life > 0);
}

// ---------- death ----------

/** A blast around `e`: hurts other enemies, and the player too when `hurtsPlayer`. */
function explode(run: Run, e: Enemy, hurtsPlayer: boolean) {
  run.blasts.push({ pos: { ...e.pos }, r: BLAST_R, life: 0.3, color: ENEMIES[e.kind].color });
  if (hurtsPlayer && dist(e.pos, run.player.pos) < BLAST_R + PLAYER_R) run.hurtPlayer(e.damage);
  for (const o of run.grid.near(e.pos.x, e.pos.y, BLAST_R)) {
    if (o !== e && dist(o.pos, e.pos) < BLAST_R + o.r) run.damage(o, e.damage * 1.5, null);
  }
}

/** Splitters break into Grunts, bombers explode (hurting only enemies when killed by the player). */
export function onDeath(run: Run, e: Enemy) {
  if (e.kind === 'bomber') explode(run, e, false);
  if (e.kind !== 'splitter') return;
  for (let i = 0; i < SPLIT_INTO; i++) {
    const pos = { x: e.pos.x + rand(-e.r, e.r), y: e.pos.y + rand(-e.r, e.r) };
    run.enemies.push(makeEnemy('grunt', pos, run.time));
  }
}
