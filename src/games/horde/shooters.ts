// Weapons that fire projectiles: Dart, Shard, Shotgun, Boomerang, Saw, Homing, Flamer. Their flight is in
// projectiles.ts.
import { angleTo, rand, type Vec } from '../../engine/math';
import type { WeaponStats } from './arsenal';
import type { Run } from './game';
import type { Missile, MissileKind, OwnedWeapon } from './model';
import { facingAngle, nearest, nearestN } from './targeting';

/** Fires once. Returns false when there was nothing to fire at (it tries again next step). */
export type Fire = (run: Run, w: OwnedWeapon, s: WeaponStats) => boolean;

const TARGET_RANGE = 450; // most weapons only fire at enemies this close
const DART_FAN = 0.15; // radians between darts of one volley
const SHOTGUN_RANGE = 260;
const SHOTGUN_FAN = 0.6; // total spread of a burst
const BOOMERANG_FAN = 0.5;
const FLAME_SPREAD = 0.3;
const BURN_TIME = 2;
const PIERCE_ALL = 999;

export const SPEED: Record<MissileKind, number> = {
  dart: 420,
  shard: 400,
  pellet: 520,
  boomerang: 330,
  saw: 280,
  homing: 260,
  flame: 260,
};

/** A projectile from the player toward `angle`; `extra` overrides the defaults. */
function launch(run: Run, w: OwnedWeapon, s: WeaponStats, kind: MissileKind, angle: number, extra: Partial<Missile>) {
  run.missiles.push({
    kind,
    weapon: w,
    pos: { ...run.player.pos },
    vel: { x: Math.cos(angle) * SPEED[kind], y: Math.sin(angle) * SPEED[kind] },
    r: s.size,
    damage: s.damage,
    left: PIERCE_ALL,
    hit: new Set(),
    life: 2,
    age: 0,
    target: null,
    range: 0,
    ...extra,
  });
}

/** Angle of `i` of `n` shots spread over `fan` radians around `center`. */
const spread = (center: number, i: number, n: number, fan: number) =>
  n > 1 ? center - fan / 2 + (fan * i) / (n - 1) : center;

const dart: Fire = (run, w, s) => {
  const target = nearest(run, run.player.pos, TARGET_RANGE);
  if (!target) return false;
  const a = angleTo(run.player.pos, target.pos);
  for (let i = 0; i < s.count; i++) {
    launch(run, w, s, 'dart', a + (i - (s.count - 1) / 2) * DART_FAN, { left: s.extra, life: 1.2 });
  }
  return true;
};

// Each star goes to a different enemy, nearest first.
const shard: Fire = (run, w, s) => {
  const targets = nearestN(run, run.player.pos, TARGET_RANGE, s.count);
  for (const t of targets) launch(run, w, s, 'shard', angleTo(run.player.pos, t.pos), { left: s.extra, life: 2.5 });
  return targets.length > 0;
};

const shotgun: Fire = (run, w, s) => {
  const target = nearest(run, run.player.pos, SHOTGUN_RANGE);
  if (!target) return false;
  const a = angleTo(run.player.pos, target.pos);
  const life = s.size / SPEED.pellet;
  for (let i = 0; i < s.count; i++) {
    launch(run, w, s, 'pellet', spread(a, i, s.count, SHOTGUN_FAN), { r: 3, left: s.extra, life });
  }
  return true;
};

const boomerang: Fire = (run, w, s) => {
  const target = nearest(run, run.player.pos, TARGET_RANGE);
  const a = target ? angleTo(run.player.pos, target.pos) : facingAngle(run);
  const r = 9 * (1 + run.mods.area);
  for (let i = 0; i < s.count; i++) {
    launch(run, w, s, 'boomerang', spread(a, i, s.count, BOOMERANG_FAN), { r, range: s.size, life: 4 });
  }
  return true;
};

const saw: Fire = (run, w, s) => {
  for (let i = 0; i < s.count; i++) launch(run, w, s, 'saw', rand(0, Math.PI * 2), { life: 3.5 });
  return true;
};

const homing: Fire = (run, w, s) => {
  const targets = nearestN(run, run.player.pos, TARGET_RANGE, s.count);
  for (const t of targets) {
    const a = angleTo(run.player.pos, t.pos) + rand(-0.8, 0.8);
    launch(run, w, s, 'homing', a, { r: 5, target: t, range: s.size, life: 3, left: 0 });
  }
  return targets.length > 0;
};

const flamer: Fire = (run, w, s) => {
  const target = nearest(run, run.player.pos, s.size * 1.2);
  const a = target ? angleTo(run.player.pos, target.pos) : facingAngle(run);
  const r = 8 * (1 + run.mods.area);
  for (let i = 0; i < s.count; i++) {
    launch(run, w, s, 'flame', a + rand(-FLAME_SPREAD, FLAME_SPREAD), {
      r,
      life: s.size / SPEED.flame,
      range: BURN_TIME,
    });
  }
  return true;
};

/** One dart from `from` toward `at`: the Sentinel's shot. */
export function shootDart(run: Run, w: OwnedWeapon, from: Vec, at: Vec, damage: number) {
  const s = { damage, cooldown: 0, count: 1, size: 5, extra: 0 };
  launch(run, w, s, 'dart', angleTo(from, at), { pos: { ...from }, left: 0, life: 1.2 });
}

export const SHOOTERS = { dart, shard, shotgun, boomerang, saw, homing, flamer };
