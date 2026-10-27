// Polygon Horde shapes: enemies (colored by role), items (colored, tier by outline), weapon icons and pickups.
import { bar, circle, INK, line, PAPER, poly, rect, regular, starPoints, triangle } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import type { WeaponKind } from './arsenal';
import { ENEMIES, ITEMS, type ItemKind, type Shape } from './data';
import type { Enemy, Item, Pickup } from './model';

const MAGNET_COLOR = '#d32f2f';
const CHEST_COLOR = '#ffca28';

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
  if (!e.boss && e.hp < e.maxHp) bar(ctx, x - e.r, y - e.r - 9, e.r * 2, e.hp / e.maxHp);
}

// ---------- items ----------

/** Builds (without drawing) the path of an item's shape. */
function itemPath(ctx: CanvasRenderingContext2D, kind: ItemKind, x: number, y: number, r: number) {
  const ring = (k: number) => (ctx.moveTo(x + r * k, y), ctx.arc(x, y, r * k, 0, Math.PI * 2));
  const shape = (pts: Vec[]) => pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.beginPath();
  if (kind === 'boots') shape(regular(x, y, r, 3, 0));
  else if (kind === 'blade')
    shape([
      { x, y: y - r },
      { x: x + r * 0.4, y },
      { x, y: y + r },
      { x: x - r * 0.4, y },
    ]);
  else if (kind === 'lens') [1, 0.5].forEach(ring);
  else if (kind === 'clock') {
    ring(0.9);
    shape([
      { x, y: y - r * 0.6 },
      { x, y },
      { x: x + r * 0.45, y },
    ]);
  } else if (kind === 'heart') {
    const a = r * 0.35;
    const cross = [
      [-a, -r],
      [a, -r],
      [a, -a],
      [r, -a],
      [r, a],
      [a, a],
      [a, r],
      [-a, r],
      [-a, a],
      [-r, a],
      [-r, -a],
      [-a, -a],
    ];
    shape(cross.map(([dx, dy]) => ({ x: x + dx, y: y + dy })));
  } else {
    shape([
      { x: x - r * 0.8, y: y + r * 0.8 },
      { x: x + r * 0.3, y: y - r * 0.3 },
    ]);
    shape(regular(x + r * 0.55, y - r * 0.55, r * 0.4, 3, -Math.PI / 4));
  }
  ctx.closePath();
}

/** Item icon: tier I colored outline, tier II double colored outline, tier III filled with the color. */
export function drawItem(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number, r: number) {
  const color = ITEMS[it.kind].color;
  const lw = ctx.lineWidth;
  itemPath(ctx, it.kind, x, y, r);
  if (it.tier >= 3) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw * 1.6;
    ctx.stroke();
    if (it.tier === 2) {
      itemPath(ctx, it.kind, x, y, r * 0.55);
      ctx.stroke();
    }
  }
  [ctx.fillStyle, ctx.strokeStyle, ctx.lineWidth] = [INK, INK, lw];
}

// ---------- weapons ----------

/** Black icon of a weapon (the shape it fires). */
export function drawWeapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, x: number, y: number, r: number) {
  if (kind === 'dart') triangle(ctx, x, y, r * 0.8, -Math.PI / 4, true);
  else if (kind === 'orbit') {
    circle(ctx, x, y, r * 0.25, true);
    for (const p of regular(x, y, r * 0.7, 3, 0)) rect(ctx, p.x - r * 0.18, p.y - r * 0.18, r * 0.36, r * 0.36, true);
  } else if (kind === 'pulse') {
    circle(ctx, x, y, r * 0.3, true);
    circle(ctx, x, y, r * 0.8);
  } else if (kind === 'lance') {
    line(ctx, x - r * 0.8, y + r * 0.8, x + r * 0.8, y - r * 0.8);
    line(ctx, x - r * 0.5, y + r * 0.9, x + r * 0.9, y - r * 0.5);
  } else if (kind === 'mine') rect(ctx, x - r * 0.5, y - r * 0.5, r, r, true);
  else poly(ctx, starPoints(x, y, r * 0.85), true);
}

// ---------- pickups ----------

export function drawPickup(ctx: CanvasRenderingContext2D, k: Pickup, time: number) {
  const { x, y } = k.pos;
  if (k.kind === 'xp') return poly(ctx, regular(x, y, k.value >= 5 ? 6 : 3.5, 4, 0), true);
  const bob = Math.sin(time * 4) * 2;
  if (k.kind === 'item' && k.item) {
    ctx.fillStyle = PAPER;
    circle(ctx, x, y + bob, 11, true);
    ctx.fillStyle = INK;
    return drawItem(ctx, k.item, x, y + bob, 8);
  }
  if (k.kind === 'heal') return drawItem(ctx, { kind: 'heart', tier: 3 }, x, y + bob, 8);
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
  paint(ctx, regular(x, y + bob, 12, 4, Math.PI / 4), x, y, 12, CHEST_COLOR); // chest
  line(ctx, x - 8, y + bob - 2, x + 8, y + bob - 2);
}
