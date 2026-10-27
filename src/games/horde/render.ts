// Draws the Polygon Horde world through a camera centred on the player: dot grid, loot, attacks, enemies, player.
import { bar, circle, INK, line, LINE } from '../../engine/draw';
import { angleTo } from '../../engine/math';
import { DASH_SPEED, DASH_TIME, ENEMIES, PLAYER_R, SHOT_R } from './data';
import type { Run } from './game';
import { drawEnemy, drawPickup } from './shapes';
import { ARTIFACTS } from './artifacts';
import { bossDef } from './bosses';
import { drawArtifact } from './icons';
import { drawAttacks } from './visuals';

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
  drawHazards(ctx, run);
  for (const s of run.shots) {
    ctx.fillStyle = SHOT_COLOR;
    circle(ctx, s.pos.x, s.pos.y, SHOT_R, true);
    ctx.fillStyle = INK;
    circle(ctx, s.pos.x, s.pos.y, SHOT_R);
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

/** Boss shockwaves (thick rings) and lasers (thin while warning, then thick), in the boss's color. */
function drawHazards(ctx: CanvasRenderingContext2D, run: Run) {
  const lw = ctx.lineWidth;
  for (const h of run.hazards) {
    ctx.strokeStyle = bossDef(h.owner).color;
    if (h.kind === 'wave') {
      ctx.lineWidth = lw * 3;
      circle(ctx, h.pos.x, h.pos.y, h.r);
      continue;
    }
    const warning = h.warn > 0;
    ctx.lineWidth = warning ? lw : lw * 5;
    ctx.globalAlpha = warning ? 0.5 : 1;
    line(ctx, h.pos.x, h.pos.y, h.pos.x + Math.cos(h.angle) * h.r, h.pos.y + Math.sin(h.angle) * h.r);
    ctx.globalAlpha = 1;
  }
  [ctx.strokeStyle, ctx.lineWidth] = [INK, lw];
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
    if (run.onScreen(e.pos)) drawEnemy(ctx, e, angleTo(e.pos, p), run.time);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, run: Run) {
  const pl = run.player;
  const blink = pl.invulnerable > 0 && Math.floor(run.time * 12) % 2 === 0;
  if (!blink && !run.dead) circle(ctx, pl.pos.x, pl.pos.y, PLAYER_R, true);
  bar(ctx, pl.pos.x - 15, pl.pos.y + PLAYER_R + 6, 30, pl.hp / pl.maxHp);
  drawHelpers(ctx, run);
}

/** Artifact helpers: the shield orb ring, the collector drone, the sentinel turret. */
function drawHelpers(ctx: CanvasRenderingContext2D, run: Run) {
  const { relics, player } = run;
  if (relics.has('shield') && relics.shieldLeft <= 0) {
    ctx.strokeStyle = ARTIFACTS.shield.color;
    circle(ctx, player.pos.x, player.pos.y, PLAYER_R + 6);
    ctx.strokeStyle = INK;
  }
  if (relics.drone) drawArtifact(ctx, 'drone', relics.drone.x, relics.drone.y, 7);
  if (relics.sentinel) drawArtifact(ctx, 'sentinel', relics.sentinel.x, relics.sentinel.y, 9);
}
