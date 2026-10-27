// Enemies: behaviors (one function per kind, bosses in bosses.ts), crowd separation, contact damage, enemy bullets
// and death effects.
import { circlesHit, dist, rand, type Vec } from '../../engine/math';
import { HOURGLASS } from './artifacts';
import { bossBehavior, decoyBehavior, eggBehavior, expire, updateHazards } from './bosses';
import {
  BLAST_R,
  DASH_RANGE,
  ENEMIES,
  FUSE,
  FUSE_RANGE,
  PLAYER_R,
  SHOOTER_RANGE,
  SHOOTER_RELOAD,
  SPLIT_INTO,
  type EnemyKind,
} from './data';
import { chase, dashStep, makeEnemy, shoot, startAim, toward, unitTo, angleTo, type Behavior } from './foes';
import type { Run } from './game';
import type { Enemy } from './model';

const KNOCK_KEEP = 0.02; // share of knockback speed kept after one second

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

const BEHAVIOR: Record<EnemyKind, Behavior> = {
  grunt: chase,
  runner: chase,
  shooter,
  dasher,
  splitter: chase,
  tank: chase,
  bomber,
  boss: bossBehavior,
  egg: eggBehavior,
  decoy: decoyBehavior,
};

// ---------- update ----------

export function updateEnemies(run: Run, dt: number) {
  const keep = Math.pow(KNOCK_KEEP, dt);
  const pace = run.relics.has('hourglass') ? HOURGLASS : 1;
  for (const e of run.enemies) {
    e.flash -= dt;
    if ((e.ttl -= dt) <= 0) expire(run, e);
    // A chilled enemy lives slower: it moves, aims and reloads at a reduced pace.
    BEHAVIOR[e.kind](e, run, pace * (e.slowLeft > 0 ? dt * (1 - e.slow) : dt));
    if ((e.slowLeft -= dt) <= 0) e.slow = 0;
    if (e.burnLeft > 0) {
      e.burnLeft -= dt;
      run.damage(e, e.burn * dt, e.burnBy, true);
    } else e.burn = 0;
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
  updateHazards(run, dt);
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
