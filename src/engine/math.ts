export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T>(items: T[]): T => items[randInt(0, items.length - 1)];
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const wrap = (v: number, max: number) => ((v % max) + max) % max;

/** Moves `v` toward `target` by at most `step`, without overshooting. */
export const approach = (v: number, target: number, step: number) =>
  Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step;

/** Signed difference between two angles, in -π..π. */
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Angle (radians) of the direction from `from` to `to`. */
export const angleTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x);

/** Unit vector from `from` toward `to` (length 0 never divides by zero). */
export function unitTo(from: Vec, to: Vec): Vec {
  const d = dist(from, to) || 1;
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
}

/** Moves `p` (in place) toward `target` by at most `step`, without overshooting. */
export function moveToward(p: Vec, target: Vec, step: number) {
  const u = unitTo(p, target);
  const s = Math.min(step, dist(p, target));
  p.x += u.x * s;
  p.y += u.y * s;
}

export const circlesHit = (a: Vec, ra: number, b: Vec, rb: number) => dist(a, b) < ra + rb;

export const inRect = (p: Vec, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Deterministic random numbers in [0, 1) from a seed (mulberry32): the same seed always gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Short number for small spaces: 950, 12.3k, 4.5M. */
export function compact(n: number) {
  if (n < 10000) return `${n}`;
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}
