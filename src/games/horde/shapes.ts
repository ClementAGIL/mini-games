// Polygon Horde shapes: enemies (colored by role) and pickups. Stat and weapon icons are in icons.ts.
import { bar, circle, INK, line, PAPER, poly, regular, starPoints, triangle } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import { ENEMIES, type Shape } from './data';
import { drawStat } from './icons';
import type { Enemy, Pickup } from './model';
import { FIRE_COLOR, FROST_COLOR } from './visuals';

const MAGNET_COLOR = '#d32f2f';
const CHEST_COLOR = '#ffca28';
const RELIC_COLOR = '#ab47bc';

/** Corners of an enemy shape facing `rot`, or null for the circle. */
function shapePoints(shape: Shape, x: number, y: number, r: number, rot: number): Vec[] | null {
  const at = (a: number, k: number) => ({ x: x + Math.cos(rot + a) * r * k, y: y + Math.sin(rot + a) * r * k });
  switch (shape) {
    case 'triangle':
      return regular(x, y, r * 1.15, 3, rot);
    case 'thin':
      return [at(0, 1.3), at(2.6, 0.9), at(-2.6, 0.9)];
    case 'square':
      return regular(x, y, r * 1.2, 4, rot + Math.PI / 4);
    case 'diamond':
      return regular(x, y, r * 1.25, 4, rot);
    case 'pentagon':
      return regular(x, y, r * 1.1, 5, rot);
    case 'hexagon':
      return regular(x, y, r * 1.05, 6, rot);
    case 'circle':
      return null;
    case 'star':
      return starPoints(x, y, r);
  }
}

/** A colored outline circle (status rings). */
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.strokeStyle = color;
  circle(ctx, x, y, r);
  ctx.strokeStyle = INK;
}

/** Fills with `color`, then outlines in black. */
function paint(ctx: CanvasRenderingContext2D, pts: Vec[] | null, x: number, y: number, r: number, color: string) {
  for (const fill of [true, false]) {
    ctx.fillStyle = fill ? color : INK;
    if (pts) poly(ctx, pts, fill);
    else circle(ctx, x, y, r, fill);
  }
}

/** An enemy facing `rot`: flashes white when hit, elites get a second outline, bombers a fuse. */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, rot: number, time: number) {
  const { x, y } = e.pos;
  const def = ENEMIES[e.kind];
  const lit = e.fuse >= 0 && Math.floor(time * 12) % 2 === 0;
  paint(ctx, shapePoints(def.shape, x, y, e.r, rot), x, y, e.r, e.flash > 0 || lit ? PAPER : def.color);
  if (e.elite) {
    const outer = shapePoints(def.shape, x, y, e.r + 5, rot);
    if (outer) poly(ctx, outer);
    else circle(ctx, x, y, e.r + 5);
  }
  if (e.kind === 'bomber') line(ctx, x, y - e.r, x + e.r * 0.5, y - e.r * 1.6);
  if (e.slowLeft > 0) ring(ctx, x, y, e.r + 3, FROST_COLOR);
  if (e.burnLeft > 0) {
    ctx.fillStyle = FIRE_COLOR;
    triangle(ctx, x, y - e.r - 4, 4, -Math.PI / 2, true);
    ctx.fillStyle = INK;
  }
  if (!e.boss && e.hp < e.maxHp) bar(ctx, x - e.r, y - e.r - 9, e.r * 2, e.hp / e.maxHp);
}

// ---------- pickups ----------

export function drawPickup(ctx: CanvasRenderingContext2D, k: Pickup, time: number) {
  const { x, y } = k.pos;
  if (k.kind === 'xp') return poly(ctx, regular(x, y, k.value >= 5 ? 6 : 3.5, 4, 0), true);
  const bob = Math.sin(time * 4) * 2;
  if (k.kind === 'heal') return drawStat(ctx, 'regen', x, y + bob, 8);
  if (k.kind === 'bomb') {
    circle(ctx, x, y + bob, 7, true);
    return line(ctx, x + 4, y + bob - 5, x + 8, y + bob - 10);
  }
  if (k.kind === 'magnet') {
    ctx.strokeStyle = MAGNET_COLOR;
    ctx.lineWidth *= 2;
    ctx.beginPath();
    ctx.arc(x, y + bob, 7, 0, Math.PI);
    ctx.stroke();
    ctx.lineWidth /= 2;
    ctx.strokeStyle = INK;
    return;
  }
  // Chest: elite (small, yellow) or boss (big, purple)
  const size = k.kind === 'relic' ? 17 : 12;
  paint(ctx, regular(x, y + bob, size, 4, Math.PI / 4), x, y, size, k.kind === 'relic' ? RELIC_COLOR : CHEST_COLOR);
  line(ctx, x - size * 0.65, y + bob - 2, x + size * 0.65, y + bob - 2);
}
