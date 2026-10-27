// Helpers shared by the weapons: final stats of a weapon, finding targets, geometry.
import { INK } from '../../engine/draw';
import { dist, type Vec } from '../../engine/math';
import { weaponStats } from './arsenal';
import type { Run } from './game';
import type { Enemy, OwnedWeapon } from './model';

export const statsOf = (run: Run, w: OwnedWeapon) =>
  weaponStats(w.kind, w.level, w.evolved, run.mods, run.relics.has('twin') ? 1 : 0);

/** Nearest living enemy to `from` within `range`, skipping `skip`. */
export function nearest(run: Run, from: Vec, range: number, skip?: Set<Enemy>): Enemy | null {
  let best: Enemy | null = null;
  let bestD = range;
  for (const e of run.enemies) {
    const d = dist(e.pos, from);
    if (d < bestD && e.hp > 0 && !skip?.has(e)) [best, bestD] = [e, d];
  }
  return best;
}

/** Up to `n` different targets, nearest first. */
export function nearestN(run: Run, from: Vec, range: number, n: number): Enemy[] {
  const taken = new Set<Enemy>();
  for (let i = 0; i < n; i++) {
    const e = nearest(run, from, range, taken);
    if (!e) break;
    taken.add(e);
  }
  return [...taken];
}

export const facingAngle = (run: Run) => Math.atan2(run.player.facing.y, run.player.facing.x);

/** Distance from `p` to the segment a–b. */
export function segmentDist(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Point at `length` from `from` in direction `angle`. */
export const pointAt = (from: Vec, angle: number, length: number): Vec => ({
  x: from.x + Math.cos(angle) * length,
  y: from.y + Math.sin(angle) * length,
});

/**
 * Contact weapons (Orbit, Saw, Lighthouse) hurt an enemy at most once per `every` seconds.
 * Returns true when it hit.
 */
export function contactHit(run: Run, e: Enemy, w: OwnedWeapon, damage: number, every: number) {
  const last = e.hitAt[w.kind] ?? -99;
  if (e.hp <= 0 || run.time - last < every) return false;
  e.hitAt[w.kind] = run.time;
  run.damage(e, damage, w);
  return true;
}

/** Hurts every enemy within `radius` of `pos` (credited to `weapon`, if any) and shows the blast. */
export function blast(run: Run, pos: Vec, radius: number, damage: number, weapon: OwnedWeapon | null, color = INK) {
  run.blasts.push({ pos: { ...pos }, r: radius, life: 0.3, color });
  for (const e of run.grid.near(pos.x, pos.y, radius)) {
    if (dist(e.pos, pos) < radius + e.r) run.damage(e, damage, weapon);
  }
}
