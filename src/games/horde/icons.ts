// Icons of Polygon Horde: stats (filled with their color) and weapons (black, the shape they fire).
import { circle, INK, line, poly, polyline, rect, regular, starPoints, triangle } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import type { WeaponKind } from './arsenal';
import { ARTIFACTS, type ArtifactKind } from './artifacts';
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

/** A boomerang (wide V) centred on (x, y), turned by `rot`. */
export function boomerangPoints(x: number, y: number, r: number, rot: number): Vec[] {
  const pts = [
    [-1, -0.3],
    [0, 0.6],
    [1, -0.3],
    [0.75, -0.5],
    [0, 0.15],
    [-0.75, -0.5],
  ];
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return pts.map(([px, py]) => ({ x: x + (px * c - py * s) * r, y: y + (px * s + py * c) * r }));
}

/** A gear with 8 teeth, turned by `rot`. */
export function gearPoints(x: number, y: number, r: number, rot: number): Vec[] {
  return regular(x, y, r, 16, rot).map((p, i) => (i % 2 ? { x: x + (p.x - x) * 0.7, y: y + (p.y - y) * 0.7 } : p));
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
  boomerang: (ctx, x, y, r) => poly(ctx, boomerangPoints(x, y, r, 0), true),
  chain: (ctx, x, y, r) =>
    polyline(ctx, [
      { x: x - r * 0.3, y: y - r },
      { x: x + r * 0.3, y: y - r * 0.2 },
      { x: x - r * 0.3, y: y + r * 0.2 },
      { x: x + r * 0.3, y: y + r },
    ]),
  flamer: (ctx, x, y, r) => {
    for (const [dx, dy] of [
      [-0.4, 0.3],
      [0.1, -0.2],
      [0.5, 0.3],
    ])
      triangle(ctx, x + dx * r, y + dy * r, r * 0.35, -Math.PI / 2, true);
  },
  saw: (ctx, x, y, r) => poly(ctx, gearPoints(x, y, r * 0.9, 0), true),
  frost: (ctx, x, y, r) => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      line(ctx, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  },
  meteor: (ctx, x, y, r) => {
    circle(ctx, x + r * 0.3, y + r * 0.3, r * 0.45, true);
    line(ctx, x - r * 0.9, y - r * 0.3, x, y + r * 0.1);
    line(ctx, x - r * 0.3, y - r * 0.9, x + r * 0.1, y);
  },
  whip: (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y + r * 0.6, r * 1.1, -Math.PI / 2, 0.2);
    ctx.stroke();
  },
  homing: (ctx, x, y, r) => {
    triangle(ctx, x + r * 0.3, y - r * 0.3, r * 0.55, -Math.PI / 4, true);
    line(ctx, x - r * 0.9, y + r * 0.9, x - r * 0.2, y + r * 0.2);
  },
  blackhole: (ctx, x, y, r) => {
    circle(ctx, x, y, r * 0.4, true);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 1.4);
    ctx.stroke();
  },
  lighthouse: (ctx, x, y, r) => {
    circle(ctx, x - r * 0.5, y + r * 0.5, r * 0.3, true);
    line(ctx, x - r * 0.5, y + r * 0.5, x + r, y - r);
  },
  shotgun: (ctx, x, y, r) => {
    for (const a of [-0.5, 0, 0.5])
      circle(ctx, x + Math.cos(a - 0.8) * r * 0.7, y + Math.sin(a - 0.8) * r * 0.7, r * 0.2, true);
    circle(ctx, x - r * 0.5, y + r * 0.5, r * 0.2, true);
  },
};

const ARTIFACT_ICONS: Record<ArtifactKind, PathFn> = {
  drone: (ctx, x, y, r) => rect(ctx, x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7, true),
  fourth: (ctx, x, y, r) => {
    for (let i = 0; i < 4; i++) rect(ctx, x - r * 0.55 + i * r * 0.3, y - r * 0.3, r * 0.2, r * 0.6, true);
  },
  reroll: (ctx, x, y, r) => {
    rect(ctx, x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
    circle(ctx, x - r * 0.2, y - r * 0.2, r * 0.1, true);
    circle(ctx, x + r * 0.2, y + r * 0.2, r * 0.1, true);
  },
  phoenix: (ctx, x, y, r) => triangle(ctx, x, y, r * 0.55, -Math.PI / 2, true),
  twin: (ctx, x, y, r) => {
    circle(ctx, x - r * 0.25, y, r * 0.22, true);
    circle(ctx, x + r * 0.25, y, r * 0.22, true);
  },
  fang: (ctx, x, y, r) => triangle(ctx, x, y, r * 0.55, Math.PI / 2, true),
  shield: (ctx, x, y, r) => circle(ctx, x, y, r * 0.45),
  gravity: (ctx, x, y, r) => {
    circle(ctx, x, y, r * 0.15, true);
    circle(ctx, x, y, r * 0.5);
  },
  hourglass: (ctx, x, y, r) => {
    triangle(ctx, x, y - r * 0.25, r * 0.3, Math.PI / 2, true);
    triangle(ctx, x, y + r * 0.25, r * 0.3, -Math.PI / 2, true);
  },
  sentinel: (ctx, x, y, r) => {
    rect(ctx, x - r * 0.3, y - r * 0.1, r * 0.6, r * 0.4, true);
    line(ctx, x, y, x + r * 0.5, y - r * 0.5);
  },
  prism: (ctx, x, y, r) => poly(ctx, regular(x, y, r * 0.5, 4, 0), true),
  banish: (ctx, x, y, r) => {
    line(ctx, x - r * 0.4, y - r * 0.4, x + r * 0.4, y + r * 0.4);
    line(ctx, x - r * 0.4, y + r * 0.4, x + r * 0.4, y - r * 0.4);
  },
};

/** An artifact: a hexagon in its color with a black symbol. */
export function drawArtifact(ctx: CanvasRenderingContext2D, kind: ArtifactKind, x: number, y: number, r: number) {
  ctx.fillStyle = ARTIFACTS[kind].color;
  poly(ctx, regular(x, y, r, 6, 0), true);
  ctx.fillStyle = INK;
  poly(ctx, regular(x, y, r, 6, 0));
  ARTIFACT_ICONS[kind](ctx, x, y, r);
}

/** Black icon of a weapon (the shape it fires). */
export function drawWeapon(ctx: CanvasRenderingContext2D, kind: WeaponKind, x: number, y: number, r: number) {
  WEAPON_ICONS[kind](ctx, x, y, r);
}
