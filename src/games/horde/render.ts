// Draws the Polygon Horde world through a camera centred on the player: dot grid, loot, attacks, enemies, player.
import { bar, circle, INK, line, LINE, poly, rect, starPoints, triangle } from '../../engine/draw';
import { orbitHalf, orbitSquares } from './attacks';
import { DASH_SPEED, DASH_TIME, ENEMIES, PLAYER_R } from './data';
import type { Run } from './game';
import type { Missile } from './model';
import { drawEnemy, drawPickup } from './shapes';
import { statsOf } from './weapons';

const GRID = 64; // world units between background dots
const DOT_COLOR = '#ccc';
const SHOT_COLOR = ENEMIES.shooter.color;

export function drawWorld(ctx: CanvasRenderingContext2D, run: Run, w: number, h: number, zoom: number) {
  const p = run.player.pos;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-p.x, -p.y);
  ctx.lineWidth = LINE / zoom;
  drawGrid(ctx, run, w / zoom, h / zoom);
  for (const k of run.pickups) drawPickup(ctx, k, run.time);
  drawAttacks(ctx, run);
  drawEnemies(ctx, run);
  for (const s of run.shots) {
    ctx.fillStyle = SHOT_COLOR;
    circle(ctx, s.pos.x, s.pos.y, 4, true);
    ctx.fillStyle = INK;
    circle(ctx, s.pos.x, s.pos.y, 4);
  }
  drawPlayer(ctx, run);
  run.fx.drawParticles(ctx);
  ctx.restore();
  run.fx.drawFlash(ctx, w, h);
}

function drawGrid(ctx: CanvasRenderingContext2D, run: Run, vw: number, vh: number) {
  const { x, y } = run.player.pos;
  ctx.fillStyle = DOT_COLOR;
  for (let gx = Math.floor((x - vw / 2) / GRID) * GRID; gx < x + vw / 2; gx += GRID) {
    for (let gy = Math.floor((y - vh / 2) / GRID) * GRID; gy < y + vh / 2; gy += GRID)
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
  }
  ctx.fillStyle = INK;
}

function drawEnemies(ctx: CanvasRenderingContext2D, run: Run) {
  const p = run.player.pos;
  for (const e of run.enemies) {
    if (e.mode === 'aim') {
      // Warning line: where the charge will go.
      const len = DASH_SPEED * DASH_TIME;
      ctx.globalAlpha = 0.4;
      line(ctx, e.pos.x, e.pos.y, e.pos.x + e.aim.x * len, e.pos.y + e.aim.y * len);
      ctx.globalAlpha = 1;
    }
    if (run.onScreen(e.pos)) drawEnemy(ctx, e, Math.atan2(p.y - e.pos.y, p.x - e.pos.x), run.time);
  }
}

function drawMissile(ctx: CanvasRenderingContext2D, m: Missile, time: number) {
  if (!m.bounce) return triangle(ctx, m.pos.x, m.pos.y, m.r, Math.atan2(m.vel.y, m.vel.x), true);
  ctx.save();
  ctx.translate(m.pos.x, m.pos.y);
  ctx.rotate(time * 8);
  poly(ctx, starPoints(0, 0, m.r), true);
  ctx.restore();
}

function drawAttacks(ctx: CanvasRenderingContext2D, run: Run) {
  const p = run.player.pos;
  const lw = ctx.lineWidth;
  for (const m of run.mines) rect(ctx, m.pos.x - 5, m.pos.y - 5, 10, 10, m.arm <= 0);
  for (const b of run.blasts) {
    const fade = Math.min(1, b.life * 3);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = fade * 0.3;
    circle(ctx, b.pos.x, b.pos.y, b.r, true);
    ctx.globalAlpha = fade;
    circle(ctx, b.pos.x, b.pos.y, b.r);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  for (const r of run.rings) circle(ctx, p.x, p.y, r.r);
  for (const b of run.beams) {
    ctx.lineWidth = b.width * (b.life / 0.15);
    line(ctx, b.from.x, b.from.y, b.to.x, b.to.y);
  }
  ctx.lineWidth = lw;
  for (const m of run.missiles) drawMissile(ctx, m, run.time);
  const half = orbitHalf(run);
  for (const w of run.weapons) {
    if (w.kind !== 'orbit') continue;
    for (const c of orbitSquares(run, statsOf(run, w))) rect(ctx, c.x - half, c.y - half, half * 2, half * 2, true);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, run: Run) {
  const pl = run.player;
  const blink = pl.invulnerable > 0 && Math.floor(run.time * 12) % 2 === 0;
  if (!blink && !run.dead) circle(ctx, pl.pos.x, pl.pos.y, PLAYER_R, true);
  bar(ctx, pl.pos.x - 15, pl.pos.y + PLAYER_R + 6, 30, pl.hp / pl.maxHp);
}
