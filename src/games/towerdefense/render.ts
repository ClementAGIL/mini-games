// Drawing of the Tower Defense map: grid, path, towers, enemies and effects. Overlays (build preview,
// next-wave strip, notes, summary) are in overlays.ts.
import { circle, INK, line, PAPER, polyline, rect, text } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import { FLAME_CONE } from './combat';
import { CURVE_LEVELS, enemyColor, towerColor, towerStats, xpNeeded, type Kind } from './data';
import type { TdGame } from './game';
import { AREA_TOWERS, type Enemy, type Fx, type Tower } from './model';
import { drawBuildPreview, drawNextWave, drawNotes } from './overlays';
import { COLS, ROWS } from './path';
import { bar, drawShape, star } from './shapes';

/** Where the map is on screen: top-left corner and tile size, in CSS pixels. */
export interface MapView {
  ox: number;
  oy: number;
  tile: number;
}

/** Tile units → screen pixels. */
export type ToScreen = (v: Vec) => Vec;

/** What the player is doing, for highlights. */
export interface WorldUi {
  selected: Tower | null;
  selectedEnemy: Enemy | null;
  build: Kind | null;
  pending: { tx: number; ty: number } | null; // tile tapped once, waiting for the second tap to build
}

const MODE_LETTER = { first: 'F', nearest: 'N', shape: 'S' } as const;

export function drawWorld(ctx: CanvasRenderingContext2D, game: TdGame, view: MapView, ui: WorldUi) {
  const px: ToScreen = (v) => ({ x: view.ox + v.x * view.tile, y: view.oy + v.y * view.tile });
  const t = view.tile;
  drawMap(ctx, game, view, px);
  for (const tw of game.towers) drawTower(ctx, tw, px({ x: tw.tx + 0.5, y: tw.ty + 0.5 }), t);
  if (ui.selected) drawSelection(ctx, ui.selected, px, t);
  for (const e of game.enemies) drawEnemy(ctx, e, px(e.pos), t, e === ui.selectedEnemy);
  drawProjectiles(ctx, game, px, t);
  for (const f of game.fx) drawFx(ctx, f, px, t);
  if (ui.build) drawBuildPreview(ctx, game, t, px, ui.build, ui.pending);
  drawNextWave(ctx, game, view);
  drawNotes(ctx, game, view);
}

function drawMap(ctx: CanvasRenderingContext2D, game: TdGame, { ox, oy, tile: t }: MapView, px: ToScreen) {
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) line(ctx, ox + x * t, oy, ox + x * t, oy + ROWS * t);
  for (let y = 1; y < ROWS; y++) line(ctx, ox, oy + y * t, ox + COLS * t, oy + y * t);

  // Path as a wide light band with a thin dashed center line.
  const pts = game.path.map((p) => px({ x: p.x + 0.5, y: p.y + 0.5 }));
  ctx.lineCap = 'square';
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = t * 0.8;
  polyline(ctx, pts);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  polyline(ctx, pts);
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';

  ctx.lineWidth = 2;
  rect(ctx, ox, oy, COLS * t, ROWS * t);
  const start = pts[0];
  const end = pts[pts.length - 1];
  circle(ctx, start.x, start.y, t * 0.35);
  rect(ctx, end.x - t * 0.35, end.y - t * 0.35, t * 0.7, t * 0.7, true);
}

/** Shape (darker with level), barrel, XP bar, level number above 10, target letter and combo badge. */
function drawTower(ctx: CanvasRenderingContext2D, tw: Tower, c: Vec, t: number) {
  drawShape(ctx, tw.kind, c.x, c.y, t * 0.42, towerColor(tw.kind, tw.level));
  if (tw.kind === 'triangle' || tw.kind === 'square' || tw.kind === 'pentagon') {
    line(ctx, c.x, c.y, c.x + Math.cos(tw.angle) * t * 0.6, c.y + Math.sin(tw.angle) * t * 0.6);
  }
  ctx.lineWidth = 1;
  bar(ctx, c.x - t * 0.4, c.y + t * 0.5 - 4, t * 0.8, tw.xp / xpNeeded(tw.level), true);
  ctx.lineWidth = 2;
  if (tw.level > CURVE_LEVELS) {
    ctx.fillStyle = PAPER;
    text(ctx, `${tw.level}`, c.x, c.y, Math.max(8, t * 0.4));
    ctx.fillStyle = INK;
  }
  const small = Math.max(7, t * 0.32);
  if (!AREA_TOWERS.includes(tw.kind)) text(ctx, MODE_LETTER[tw.mode], c.x - t * 0.38, c.y - t * 0.36, small);
  if (tw.partners > 0) star(ctx, c.x + t * 0.36, c.y - t * 0.36, t * 0.17);
}

function drawSelection(ctx: CanvasRenderingContext2D, s: Tower, px: ToScreen, t: number) {
  const c = px({ x: s.tx + 0.5, y: s.ty + 0.5 });
  ctx.setLineDash([5, 5]);
  circle(ctx, c.x, c.y, towerStats(s.kind, s.level, s.bonus).range * t);
  ctx.setLineDash([]);
  rect(ctx, c.x - t / 2, c.y - t / 2, t, t);
}

/** Shape (dashed when slowed, dot when poisoned), HP and shield bars, dashed ring when selected. */
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, c: Vec, t: number, selected: boolean) {
  const r = t * (e.boss ? 0.5 : e.small ? 0.2 : 0.3);
  ctx.lineWidth = e.boss ? 3 : 2;
  if (e.slowTime > 0) ctx.setLineDash([2, 2]);
  drawShape(ctx, e.kind, c.x, c.y, r, enemyColor(e.kind));
  ctx.setLineDash([]);
  if (e.poisonTime > 0) circle(ctx, c.x, c.y, r * 0.3, true);
  ctx.lineWidth = 1;
  const bw = Math.max(t * 0.8, r * 2);
  const by = c.y - r - 7;
  bar(ctx, c.x - bw / 2, by, bw, e.hp / e.maxHp);
  if (e.maxShield > 0) bar(ctx, c.x - bw / 2, by - 5, bw, e.shield / e.maxShield, true);
  ctx.lineWidth = 2;
  if (selected) {
    ctx.setLineDash([3, 3]);
    circle(ctx, c.x, c.y, r + 5);
    ctx.setLineDash([]);
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, game: TdGame, px: ToScreen, t: number) {
  for (const b of game.bullets) {
    const c = px(b.pos);
    if (b.tower.kind === 'star') ctx.fillStyle = towerColor('star', 4);
    circle(ctx, c.x, c.y, 2.5, true);
    ctx.fillStyle = INK;
  }
  for (const a of game.arrows) {
    const c = px(a.pos);
    line(ctx, c.x - a.dir.x * t * 0.4, c.y - a.dir.y * t * 0.4, c.x, c.y);
  }
}

function drawFx(ctx: CanvasRenderingContext2D, f: Fx, px: ToScreen, t: number) {
  if (f.type === 'line') {
    const a = px(f.from);
    const b = px(f.to);
    ctx.lineWidth = 1;
    line(ctx, a.x, a.y, b.x, b.y);
    ctx.lineWidth = 2;
    return;
  }
  if (f.type === 'ring') {
    const c = px(f.pos);
    ctx.strokeStyle = towerColor(f.kind, 3);
    circle(ctx, c.x, c.y, f.range * t * (1 - f.life / 0.25));
  } else if (f.type === 'chain') {
    ctx.strokeStyle = towerColor('octagon', 5);
    polyline(ctx, f.points.map(px));
  } else {
    const c = px(f.pos);
    ctx.strokeStyle = towerColor('diamond', 3);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, f.range * t, f.angle - FLAME_CONE, f.angle + FLAME_CONE);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
}
