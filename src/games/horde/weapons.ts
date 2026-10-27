// Weapon firing: one function per weapon (lookup table). Flight and hits of what they fire are in attacks.ts.
import { dist, rand, type Vec } from '../../engine/math';
import { weaponStats, type WeaponKind, type WeaponStats } from './arsenal';
import type { Run } from './game';
import type { Enemy, OwnedWeapon } from './model';

const TARGET_RANGE = 450; // Dart and Shard only fire at enemies this close
const DART_SPEED = 420;
const DART_LIFE = 1.2;
const DART_FAN = 0.15; // radians between darts of one volley
const SHARD_SPEED = 400;
const SHARD_LIFE = 2.5;
export const LANCE_WIDTH = 8;
const MINE_ARM = 0.4;
const MINE_LIFE = 8;
const MAX_MINES = 24;

export const statsOf = (run: Run, w: OwnedWeapon) => weaponStats(w.kind, w.level, w.evolved, run.mods);

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

function launch(run: Run, w: OwnedWeapon, s: WeaponStats, angle: number, bounce: boolean) {
  const speed = bounce ? SHARD_SPEED : DART_SPEED;
  run.missiles.push({
    weapon: w,
    pos: { ...run.player.pos },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    r: s.size,
    damage: s.damage,
    left: s.extra,
    bounce,
    hit: new Set(),
    life: bounce ? SHARD_LIFE : DART_LIFE,
  });
}

const angleTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x);

/** Distance from `p` to the segment a–b. */
function segmentDist(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Fires once. Returns false when there was nothing to fire at (it tries again next step). */
type Fire = (run: Run, w: OwnedWeapon, s: WeaponStats) => boolean;

const dart: Fire = (run, w, s) => {
  const target = nearest(run, run.player.pos, TARGET_RANGE);
  if (!target) return false;
  const a = angleTo(run.player.pos, target.pos);
  for (let i = 0; i < s.count; i++) launch(run, w, s, a + (i - (s.count - 1) / 2) * DART_FAN, false);
  return true;
};

// Each star goes to a different enemy, nearest first.
const shard: Fire = (run, w, s) => {
  const taken = new Set<Enemy>();
  for (let i = 0; i < s.count; i++) {
    const target = nearest(run, run.player.pos, TARGET_RANGE, taken);
    if (!target) break;
    taken.add(target);
    launch(run, w, s, angleTo(run.player.pos, target.pos), true);
  }
  return taken.size > 0;
};

const pulse: Fire = (run, w, s) => {
  run.rings.push({ weapon: w, r: 0, maxR: s.size, damage: s.damage, hit: new Set(), heals: w.evolved });
  return true;
};

// Beams spread evenly around the move direction: 1 forward, 2 forward and back, 3 a triangle, 4 a cross.
const lance: Fire = (run, w, s) => {
  const p = run.player.pos;
  const width = LANCE_WIDTH * (1 + run.mods.area);
  const base = Math.atan2(run.player.facing.y, run.player.facing.x);
  for (let i = 0; i < s.count; i++) {
    const a = base + (i / s.count) * Math.PI * 2;
    const to = { x: p.x + Math.cos(a) * s.size, y: p.y + Math.sin(a) * s.size };
    run.beams.push({ from: { ...p }, to, width, life: 0.15 });
    for (const e of run.enemies) if (segmentDist(e.pos, p, to) < width / 2 + e.r) run.damage(e, s.damage, w);
  }
  return true;
};

const mine: Fire = (run, w, s) => {
  for (let i = 0; i < s.count && run.mines.length < MAX_MINES; i++) {
    const pos = { x: run.player.pos.x + rand(-15, 15) * i, y: run.player.pos.y + rand(-15, 15) * i };
    run.mines.push({ weapon: w, pos, arm: MINE_ARM, life: MINE_LIFE, damage: s.damage, radius: s.size });
  }
  return true;
};

const FIRE: Record<WeaponKind, Fire> = { dart, orbit: () => false, pulse, lance, mine, shard };

export function updateWeapons(run: Run, dt: number) {
  for (const w of run.weapons) {
    if (w.kind === 'orbit' || (w.timer -= dt) > 0) continue; // Orbit hurts by contact, see attacks.ts
    const s = statsOf(run, w);
    w.timer = FIRE[w.kind](run, w, s) ? s.cooldown : 0;
  }
}
