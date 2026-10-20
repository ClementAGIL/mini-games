// Things drawn on top of the Tower Defense map: build preview with combo bonuses, next-wave strip,
// short notes and the game-over summary.
import { circle, INK, label, PAPER, rect, text, textWidth } from '../../engine/draw';
import { comboPartners, enemyColor, KINDS, towerColor, towerStats, type Kind } from './data';
import type { TdGame } from './game';
import { COLS, ROWS } from './path';
import type { MapView, ToScreen, WorldUi } from './render';
import { compact, drawShape } from './shapes';

/**
 * While choosing where to build: partner towers on the map get a dashed outline; the tile tapped once shows
 * the ghost tower, its range, its own combo bonus (above) and the bonus each neighbouring partner would get (below).
 */
export function drawBuildPreview(
  ctx: CanvasRenderingContext2D,
  game: TdGame,
  t: number,
  px: ToScreen,
  kind: Kind,
  pending: WorldUi['pending'],
) {
  const partnerKinds = comboPartners(kind).map((p) => p.partner);
  ctx.setLineDash([3, 3]);
  for (const tw of game.towers) {
    if (!partnerKinds.includes(tw.kind)) continue;
    const c = px({ x: tw.tx, y: tw.ty });
    rect(ctx, c.x - 2, c.y - 2, t + 4, t + 4);
  }
  ctx.setLineDash([]);
  if (!pending) return;

  const c = px({ x: pending.tx + 0.5, y: pending.ty + 0.5 });
  const preview = game.comboPreview(kind, pending.tx, pending.ty);
  ctx.globalAlpha = 0.6;
  drawShape(ctx, kind, c.x, c.y, t * 0.42, towerColor(kind, 1));
  ctx.globalAlpha = 1;
  ctx.setLineDash([5, 5]);
  circle(ctx, c.x, c.y, towerStats(kind, 1, preview.bonus).range * t);
  ctx.setLineDash([]);
  rect(ctx, c.x - t / 2, c.y - t / 2, t, t);
  if (preview.self > 0) label(ctx, percent(preview.self), c.x, c.y - t * 0.5 - 9, 11);
  for (const { tower, gain } of preview.partners) {
    const p = px({ x: tower.tx + 0.5, y: tower.ty + 0.5 });
    label(ctx, percent(gain), p.x, p.y + t * 0.5 + 8, 9);
  }
}

const percent = (v: number) => `+${Math.round(v * 100)}%`;

/** Strip above the map: what the next wave is made of (share per type) and its bosses. */
export function drawNextWave(ctx: CanvasRenderingContext2D, game: TdGame, { ox, oy, tile }: MapView) {
  const normal = game.nextQueue.filter((q) => !q.boss);
  const bosses = game.nextQueue.filter((q) => q.boss).map((q) => q.kind);
  const counts = KINDS.map((k) => ({ k, n: normal.filter((q) => q.kind === k).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);

  // Above the map when there is room, otherwise over its top row on a white band.
  const h = 16;
  const inside = oy < h + 4;
  const y = inside ? oy + h / 2 + 1 : oy - h / 2 - 3;
  if (inside) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = PAPER;
    ctx.fillRect(ox + 1, oy + 1, COLS * tile - 2, h);
    ctx.fillStyle = INK;
    ctx.globalAlpha = 1;
  }
  let x = ox + 4;
  const write = (str: string) => {
    text(ctx, str, x, y, 11, 'left');
    x += textWidth(ctx, str, 11) + 4;
  };
  const shape = (k: Kind, r: number) => {
    drawShape(ctx, k, x + r, y, r, enemyColor(k));
    x += r * 2 + 3;
  };
  write(`Next: wave ${game.wave + 1} · ${normal.length}`);
  for (const { k, n } of counts) {
    shape(k, 5);
    write(`${Math.round((n / normal.length) * 100)}%`);
  }
  if (bosses.length) write('· Boss');
  for (const k of bosses) shape(k, 6);
}

export function drawNotes(ctx: CanvasRenderingContext2D, game: TdGame, { ox, oy, tile }: MapView) {
  game.notes.forEach((n, i) => {
    ctx.globalAlpha = Math.min(1, n.life);
    label(ctx, n.text, ox + (COLS * tile) / 2, oy + ROWS * tile - 14 - i * 20, 12);
    ctx.globalAlpha = 1;
  });
}

/** Game over: lives lost per enemy type, and damage per tower type (share and total). */
export function drawSummary(ctx: CanvasRenderingContext2D, game: TdGame, w: number, h: number, sub: string) {
  const bw = Math.min(460, w - 24);
  const bh = 204;
  const x = (w - bw) / 2;
  const y = (h - bh) / 2;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = INK;
  rect(ctx, x, y, bw, bh);
  text(ctx, 'GAME OVER', w / 2, y + 24, 26);
  text(ctx, `Reached wave ${game.wave} · best ${game.best}`, w / 2, y + 50, 13);

  const { livesLost, damage } = game.stats;
  const lost = KINDS.filter((k) => livesLost[k]).map((k) => ({ k, value: `${livesLost[k]}` }));
  const total = KINDS.reduce((s, k) => s + (damage[k] ?? 0), 0) || 1;
  const dealt = KINDS.filter((k) => damage[k])
    .sort((a, b) => (damage[b] ?? 0) - (damage[a] ?? 0))
    .map((k) => ({
      k,
      value: `${Math.round(((damage[k] ?? 0) / total) * 100)}%`,
      sub: compact(Math.round(damage[k] ?? 0)),
    }));
  summaryRow(ctx, 'Lives lost by enemy type', lost, x + 14, y + 74);
  summaryRow(ctx, 'Damage by tower type', dealt, x + 14, y + 122);
  text(ctx, sub, w / 2, y + bh - 14, 12);
}

/** A title and a row of "shape value" pairs, with an optional smaller value under each. */
function summaryRow(
  ctx: CanvasRenderingContext2D,
  title: string,
  entries: { k: Kind; value: string; sub?: string }[],
  x: number,
  y: number,
) {
  text(ctx, title, x, y, 12, 'left');
  if (!entries.length) text(ctx, '—', x, y + 22, 11, 'left');
  entries.forEach(({ k, value, sub }, i) => {
    drawShape(ctx, k, x + i * 52 + 7, y + 22, 7, towerColor(k, 2));
    text(ctx, value, x + i * 52 + 17, y + 22, 11, 'left');
    if (sub) text(ctx, sub, x + i * 52 + 17, y + 36, 9, 'left');
  });
}
