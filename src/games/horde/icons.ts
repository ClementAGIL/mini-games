// Icons of Polygon Horde: stats (filled with their color) and weapons (black, the shape they fire).
import { circle, INK, line, poly, rect, regular, starPoints, triangle } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import type { WeaponKind } from './arsenal';
import { STATS, type StatKind } from './data';

type PathFn = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

const shape = (ctx: CanvasRenderingContext2D, pts: Vec[]) => {
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
};
const ring = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
};

/** Path (not drawn) of each stat's icon. */
const STAT_PATHS: Record<StatKind, PathFn> = {
  speed: (ctx, x, y, r) => shape(ctx, regular(x, y, r, 3, 0)),
  haste: (ctx, x, y, r) => {
    ring(ctx, x, y, r * 0.9);
    ctx.moveTo(x, y - r * 0.6);
    ctx.lineTo(x, y);
    ctx.lineTo(x + r * 0.45, y);
  },
  damage: (ctx, x, y, r) =>
    shape(ctx, [
      { x, y: y - r },
      { x: x + r * 0.4, y },
      { x, y: y + r },
      { x: x - r * 0.4, y },
    ]),
  pierce: (ctx, x, y, r) => {
    ctx.moveTo(x - r * 0.8, y + r * 0.8);
    ctx.lineTo(x + r * 0.3, y - r * 0.3);
    shape(ctx, regular(x + r * 0.55, y - r * 0.55, r * 0.45, 3, -Math.PI / 4));
  },
  regen: (ctx, x, y, r) => {
    const a = r * 0.35;
    const cross = [-a, -r, a, -r, a, -a, r, -a, r, a, a, a, a, r, -a, r, -a, a, -r, a, -r, -a, -a, -a];
    const pts: Vec[] = [];
    for (let i = 0; i < cross.length; i += 2) pts.push({ x: x + cross[i], y: y + cross[i + 1] });
    shape(ctx, pts);
  },
  area: (ctx, x, y, r) => {
    ring(ctx, x, y, r);
    ring(ctx, x, y, r * 0.5);
  },
  magnet: (ctx, x, y, r) => {
    ctx.moveTo(x - r, y - r * 0.6);
    ctx.arc(x, y, r, Math.PI, 0, true);
    ctx.lineTo(x + r * 0.45, y - r * 0.6);
    ctx.arc(x, y, r * 0.45, 0, Math.PI);
    ctx.closePath();
  },
  luck: (ctx, x, y, r) => {
    for (const p of regular(x, y, r * 0.5, 4, 0)) ring(ctx, p.x, p.y, r * 0.45);
  },
};

/** A stat icon: filled with the stat's color, outlined in black. */
export function drawStat(ctx: CanvasRenderingContext2D, stat: StatKind, x: number, y: number, r: number) {
  ctx.beginPath();
  STAT_PATHS[stat](ctx, x, y, r);
  ctx.fillStyle = STATS[stat].color;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.stroke();
}

const WEAPON_ICONS: Record<WeaponKind, PathFn> = {
  dart: (ctx, x, y, r) => triangle(ctx, x, y, r * 0.8, -Math.PI / 4, true),
  orbit: (ctx, x, y, r) => {
    circle(ctx, x, y, r * 0.25, true);
    for (const p of regular(x, y, r * 0.7, 3, 0)) rect(ctx, p.x - r * 0.18, p.y - r * 0.18, r * 0.36, r * 0.36, true);
  },
  pulse: (ctx, x, y, r) => {
    circle(ctx, x, y, r * 0.3, true);
    circle(ctx, x, y, r * 0.8);
  },
  lance: (ctx, x, y, r) => {
    line(ctx, x - r * 0.8, y + r * 0.8, x + r * 0.8, y - r * 0.8);
    line(ctx, x - r * 0.5, y + r * 0.9, x + r * 0.9, y - r * 0.5);
  },
  mine: (ctx, x, y, r) => rect(ctx, x - r * 0.5, y - r * 0.5, r, r, true),
  shard: (ctx, x, y, r) => poly(ctx, starPoints(x, y, r * 0.85), true),
};

/** Black icon of a weapon (the shape it fires). */
export function drawWeapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, x: number, y: number, r: number) {
  WEAPON_ICONS[kind](ctx, x, y, r);
}
