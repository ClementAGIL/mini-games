// What the weapons leave in the world: darts and shards in flight, Pulse rings, mines, Orbit squares; their hits.
import { circlesHit, dist, type Vec } from '../../engine/math';
import { INK } from '../../engine/draw';
import type { WeaponStats } from './arsenal';
import { knockBack } from './enemies';
import type { Run } from './game';
import type { Missile, OwnedWeapon } from './model';
import { nearest, statsOf } from './weapons';

const SHARD_JUMP = 180; // a shard only bounces to an enemy this close
const PULSE_GROW = 0.35; // seconds for a ring to reach its radius
const PULSE_KNOCK = 260;
const LIFEWAVE_HEAL = 0.5; // HP per enemy hit by an evolved Pulse ...
const LIFEWAVE_MAX = 10; // ... at most this much per ring
const MINE_TRIGGER = 18;
const ORBIT_SPIN = 3.2; // radians per second
const ORBIT_SQUARE = 7; // half size, grown by Lens
const ORBIT_KNOCK = 120;

export function updateAttacks(run: Run, dt: number) {
  run.orbitAngle += ORBIT_SPIN * dt;
  for (const m of run.missiles) moveMissile(run, m, dt);
  run.missiles = run.missiles.filter((m) => m.life > 0);
  updateRings(run, dt);
  updateMines(run, dt);
  for (const w of run.weapons) if (w.kind === 'orbit') orbitHits(run, w, statsOf(run, w));
}

function moveMissile(run: Run, m: Missile, dt: number) {
  m.pos.x += m.vel.x * dt;
  m.pos.y += m.vel.y * dt;
  m.life -= dt;
  for (const e of run.grid.near(m.pos.x, m.pos.y, m.r)) {
    if (m.life <= 0) return;
    if (e.hp <= 0 || m.hit.has(e) || !circlesHit(m.pos, m.r, e.pos, e.r)) continue;
    m.hit.add(e);
    run.damage(e, m.damage, m.weapon);
    if (m.left-- <= 0) m.life = 0;
    else if (m.bounce) bounce(run, m);
  }
}

function bounce(run: Run, m: Missile) {
  const next = nearest(run, m.pos, SHARD_JUMP, m.hit);
  if (!next) return void (m.life = 0);
  const speed = Math.hypot(m.vel.x, m.vel.y);
  const d = dist(m.pos, next.pos) || 1;
  m.vel = { x: ((next.pos.x - m.pos.x) / d) * speed, y: ((next.pos.y - m.pos.y) / d) * speed };
  m.life = Math.max(m.life, 1);
}

function updateRings(run: Run, dt: number) {
  const p = run.player.pos;
  for (const ring of run.rings) {
    ring.r += (ring.maxR / PULSE_GROW) * dt;
    for (const e of run.grid.near(p.x, p.y, ring.r)) {
      if (e.hp <= 0 || ring.hit.has(e) || dist(e.pos, p) > ring.r + e.r) continue;
      ring.hit.add(e);
      run.damage(e, ring.damage, ring.weapon);
      knockBack(e, p, PULSE_KNOCK);
      if (ring.heals && ring.hit.size * LIFEWAVE_HEAL <= LIFEWAVE_MAX) run.heal(LIFEWAVE_HEAL);
    }
  }
  run.rings = run.rings.filter((r) => r.r < r.maxR);
}

function updateMines(run: Run, dt: number) {
  for (const m of run.mines) {
    m.arm -= dt;
    m.life -= dt;
    const near = [...run.grid.near(m.pos.x, m.pos.y, MINE_TRIGGER)];
    const touched = m.arm <= 0 && near.some((e) => e.hp > 0 && circlesHit(m.pos, MINE_TRIGGER, e.pos, e.r));
    if (!touched && m.life > 0) continue;
    m.life = 0;
    run.blasts.push({ pos: m.pos, r: m.radius, life: 0.25, color: INK });
    for (const e of run.grid.near(m.pos.x, m.pos.y, m.radius)) {
      if (dist(e.pos, m.pos) < m.radius + e.r) run.damage(e, m.damage, m.weapon);
    }
  }
  run.mines = run.mines.filter((m) => m.life > 0);
}

export const orbitHalf = (run: Run) => ORBIT_SQUARE * (1 + run.mods.area);

/** Centers of an Orbit weapon's squares, evenly spaced on a circle around the player. */
export function orbitSquares(run: Run, s: WeaponStats): Vec[] {
  const p = run.player.pos;
  return Array.from({ length: s.count }, (_, i) => {
    const a = run.orbitAngle + (i / s.count) * Math.PI * 2;
    return { x: p.x + Math.cos(a) * s.size, y: p.y + Math.sin(a) * s.size };
  });
}

// An enemy touched by a square is hurt, then safe from the squares for `cooldown` seconds.
function orbitHits(run: Run, w: OwnedWeapon, s: WeaponStats) {
  const half = orbitHalf(run);
  for (const c of orbitSquares(run, s)) {
    for (const e of run.grid.near(c.x, c.y, half)) {
      if (e.hp <= 0 || run.time - e.orbitAt < s.cooldown || !circlesHit(c, half, e.pos, e.r)) continue;
      e.orbitAt = run.time;
      run.damage(e, s.damage, w);
      knockBack(e, run.player.pos, ORBIT_KNOCK);
    }
  }
}
