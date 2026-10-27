// What the weapons leave in the world: Pulse / Frost rings, mines, meteor strikes, black holes; and the update order
// of everything the player's weapons do.
import { circlesHit, dist, moveToward } from '../../engine/math';
import { updateAuras } from './auras';
import { knockBack } from './enemies';
import type { Run } from './game';
import { updateMissiles } from './projectiles';
import { blast } from './targeting';

const RING_GROW = 0.35; // seconds for a ring to reach its radius
const LIFEWAVE_HEAL = 0.5; // HP per enemy hit by an evolved Pulse ...
const LIFEWAVE_MAX = 10; // ... at most this much per ring
const SLOW_TIME = 2.5;
const MINE_TRIGGER = 18;
const VORTEX_TICK = 0.5;
const VORTEX_PULL = 140; // units per second

export function updateAttacks(run: Run, dt: number) {
  updateMissiles(run, dt);
  updateRings(run, dt);
  updateMines(run, dt);
  updateStrikes(run, dt);
  updateVortices(run, dt);
  updateAuras(run, dt);
}

function updateRings(run: Run, dt: number) {
  const p = run.player.pos;
  for (const ring of run.rings) {
    ring.r += (ring.maxR / RING_GROW) * dt;
    for (const e of run.grid.near(p.x, p.y, ring.r)) {
      if (e.hp <= 0 || ring.hit.has(e) || dist(e.pos, p) > ring.r + e.r) continue;
      ring.hit.add(e);
      run.damage(e, ring.damage, ring.weapon);
      if (ring.push) knockBack(e, p, ring.push);
      if (ring.slow) [e.slow, e.slowLeft] = [Math.max(e.slow, ring.slow), SLOW_TIME];
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
    blast(run, m.pos, m.radius, m.damage, m.weapon);
  }
  run.mines = run.mines.filter((m) => m.life > 0);
}

function updateStrikes(run: Run, dt: number) {
  for (const s of run.strikes) if ((s.delay -= dt) <= 0) blast(run, s.pos, s.radius, s.damage, s.weapon);
  run.strikes = run.strikes.filter((s) => s.delay > 0);
}

// A black hole pulls the enemies around it toward its center and hurts them every VORTEX_TICK.
function updateVortices(run: Run, dt: number) {
  for (const v of run.vortices) {
    v.life -= dt;
    const tick = (v.tick -= dt) <= 0;
    if (tick) v.tick = VORTEX_TICK;
    for (const e of run.grid.near(v.pos.x, v.pos.y, v.radius)) {
      const d = dist(e.pos, v.pos);
      if (d > v.radius || e.boss) continue;
      moveToward(e.pos, v.pos, VORTEX_PULL * dt);
      if (tick) run.damage(e, v.damage, v.weapon);
    }
  }
  run.vortices = run.vortices.filter((v) => v.life > 0);
}
