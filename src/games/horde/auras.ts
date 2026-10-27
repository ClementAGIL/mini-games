// Contact weapons that are always active: Orbit squares around the player and the Lighthouse beams.
import { circlesHit, type Vec } from '../../engine/math';
import type { WeaponStats } from './arsenal';
import { knockBack } from './enemies';
import type { Run } from './game';
import type { OwnedWeapon } from './model';
import { contactHit, segmentDist, statsOf, pointAt } from './targeting';

const ORBIT_SPIN = 3.2; // radians per second
const ORBIT_SQUARE = 7; // half size, grown by Area
const ORBIT_KNOCK = 120;
const LIGHT_SPIN = 1.6;
export const LIGHT_WIDTH = 6;

export const orbitHalf = (run: Run) => ORBIT_SQUARE * (1 + run.mods.area);

/** Centers of an Orbit weapon's squares, evenly spaced on a circle around the player. */
export function orbitSquares(run: Run, s: WeaponStats): Vec[] {
  return Array.from({ length: s.count }, (_, i) =>
    pointAt(run.player.pos, run.orbitAngle + (i / s.count) * Math.PI * 2, s.size),
  );
}

/** Angles of the Lighthouse beams, evenly spaced and turning. */
export const lightAngles = (run: Run, s: WeaponStats) =>
  Array.from({ length: s.count }, (_, i) => run.time * LIGHT_SPIN + (i / s.count) * Math.PI * 2);

function orbit(run: Run, w: OwnedWeapon, s: WeaponStats) {
  const half = orbitHalf(run);
  for (const c of orbitSquares(run, s)) {
    for (const e of run.grid.near(c.x, c.y, half)) {
      if (!circlesHit(c, half, e.pos, e.r)) continue;
      if (contactHit(run, e, w, s.damage, s.cooldown)) knockBack(e, run.player.pos, ORBIT_KNOCK);
    }
  }
}

function lighthouse(run: Run, w: OwnedWeapon, s: WeaponStats) {
  const p = run.player.pos;
  const width = LIGHT_WIDTH * (1 + run.mods.area);
  for (const a of lightAngles(run, s)) {
    const end = pointAt(p, a, s.size);
    for (const e of run.enemies)
      if (segmentDist(e.pos, p, end) < width / 2 + e.r) contactHit(run, e, w, s.damage, s.cooldown);
  }
}

export function updateAuras(run: Run, dt: number) {
  run.orbitAngle += ORBIT_SPIN * dt;
  for (const w of run.weapons) {
    if (w.kind === 'orbit') orbit(run, w, statsOf(run, w));
    if (w.kind === 'lighthouse') lighthouse(run, w, statsOf(run, w));
  }
}
