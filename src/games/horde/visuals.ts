// Drawing of what the weapons put in the world: projectiles, rings, mines, meteors, black holes, beams, bolts, blasts,
// Orbit squares and Lighthouse beams. Weapons are black; frost and fire use their color.
import { circle, INK, line, poly, polyline, rect, starPoints, triangle } from '../../engine/draw';
import { rand, type Vec } from '../../engine/math';
import { LIGHT_WIDTH, lightAngles, orbitHalf, orbitSquares } from './auras';
import type { Run } from './game';
import { boomerangPoints, gearPoints } from './icons';
import type { Missile, MissileKind } from './model';
import { statsOf, toward } from './targeting';

export const FROST_COLOR = '#4fc3f7';
export const FIRE_COLOR = '#ff7043';

type MissileDraw = (ctx: CanvasRenderingContext2D, m: Missile, time: number) => void;

const heading = (m: Missile) => Math.atan2(m.vel.y, m.vel.x);

const MISSILES: Record<MissileKind, MissileDraw> = {
  dart: (ctx, m) => triangle(ctx, m.pos.x, m.pos.y, m.r, heading(m), true),
  pellet: (ctx, m) => circle(ctx, m.pos.x, m.pos.y, m.r, true),
  shard: (ctx, m, t) => {
    ctx.save();
    ctx.translate(m.pos.x, m.pos.y);
    ctx.rotate(t * 8);
    poly(ctx, starPoints(0, 0, m.r), true);
    ctx.restore();
  },
  boomerang: (ctx, m, t) => poly(ctx, boomerangPoints(m.pos.x, m.pos.y, m.r, t * 12), true),
  saw: (ctx, m, t) => poly(ctx, gearPoints(m.pos.x, m.pos.y, m.r, t * 10), true),
  homing: (ctx, m) => {
    triangle(ctx, m.pos.x, m.pos.y, m.r * 1.4, heading(m), true);
    line(ctx, m.pos.x, m.pos.y, m.pos.x - m.vel.x * 0.06, m.pos.y - m.vel.y * 0.06);
  },
  flame: (ctx, m) => {
    ctx.fillStyle = FIRE_COLOR;
    ctx.globalAlpha = 0.7;
    triangle(ctx, m.pos.x, m.pos.y, m.r * (0.6 + m.age * 2), heading(m), true);
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
  },
};

/** Lightning: the bolt's points joined by a jagged line that changes every frame. */
function drawBolt(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  const jagged: Vec[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    jagged.push({ x: (a.x + b.x) / 2 + rand(-8, 8), y: (a.y + b.y) / 2 + rand(-8, 8) }, b);
  }
  polyline(ctx, jagged);
}

function drawZones(ctx: CanvasRenderingContext2D, run: Run) {
  for (const m of run.mines) rect(ctx, m.pos.x - 5, m.pos.y - 5, 10, 10, m.arm <= 0);
  for (const s of run.strikes) {
    ctx.globalAlpha = 0.5;
    circle(ctx, s.pos.x, s.pos.y, s.radius * (1 - s.delay));
    circle(ctx, s.pos.x, s.pos.y, s.radius);
    ctx.globalAlpha = 1;
  }
  for (const v of run.vortices) {
    circle(ctx, v.pos.x, v.pos.y, 8, true);
    ctx.globalAlpha = 0.4;
    for (const k of [0.4, 0.7, 1]) circle(ctx, v.pos.x, v.pos.y, v.radius * ((k + run.time) % 1));
    ctx.globalAlpha = 1;
  }
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
}

function drawLines(ctx: CanvasRenderingContext2D, run: Run) {
  const p = run.player.pos;
  const lw = ctx.lineWidth;
  for (const r of run.rings) {
    ctx.strokeStyle = r.slow ? FROST_COLOR : INK;
    ctx.lineWidth = lw * (r.slow ? 2 : 1);
    circle(ctx, p.x, p.y, r.r);
  }
  ctx.strokeStyle = INK;
  for (const b of run.beams) {
    ctx.lineWidth = b.width * (b.life / 0.15);
    line(ctx, b.from.x, b.from.y, b.to.x, b.to.y);
  }
  ctx.lineWidth = lw * 1.5;
  for (const b of run.bolts) drawBolt(ctx, b.pts);
  for (const w of run.weapons) {
    if (w.kind !== 'lighthouse') continue;
    const s = statsOf(run, w);
    ctx.lineWidth = LIGHT_WIDTH * (1 + run.mods.area);
    ctx.globalAlpha = 0.5;
    for (const a of lightAngles(run, s)) {
      const end = toward(p, a, s.size);
      line(ctx, p.x, p.y, end.x, end.y);
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = lw;
}

export function drawAttacks(ctx: CanvasRenderingContext2D, run: Run) {
  drawZones(ctx, run);
  drawLines(ctx, run);
  for (const m of run.missiles) MISSILES[m.kind](ctx, m, run.time);
  const half = orbitHalf(run);
  for (const w of run.weapons) {
    if (w.kind !== 'orbit') continue;
    for (const c of orbitSquares(run, statsOf(run, w))) rect(ctx, c.x - half, c.y - half, half * 2, half * 2, true);
  }
}
