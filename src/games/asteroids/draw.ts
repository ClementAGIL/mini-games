// Asteroids drawing: rocks, ship (flame, shield), UFO, power-up items, HUD and the virtual joystick.
import { circle, line, poly, text, triangle } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import {
  ITEM_R,
  ROCK_R,
  SHIP_R,
  UFO_R,
  unit,
  type Item,
  type PowerKind,
  type Rock,
  type Ship,
  type Ufo,
} from './entities';

export function drawRock(ctx: CanvasRenderingContext2D, r: Rock) {
  const n = r.shape.length;
  poly(
    ctx,
    r.shape.map((m, i) => {
      const d = unit(r.angle + (i / n) * Math.PI * 2);
      return { x: r.pos.x + d.x * ROCK_R[r.size] * m, y: r.pos.y + d.y * ROCK_R[r.size] * m };
    }),
  );
}

/** Triangle ship; a flickering flame line while thrusting; a circle around it while shielded. */
export function drawShip(ctx: CanvasRenderingContext2D, s: Ship, flame: boolean, shield: boolean) {
  triangle(ctx, s.pos.x, s.pos.y, SHIP_R, s.angle);
  const back = unit(s.angle + Math.PI);
  if (flame) {
    const bx = s.pos.x + back.x * SHIP_R;
    const by = s.pos.y + back.y * SHIP_R;
    line(ctx, bx, by, bx + back.x * 10, by + back.y * 10);
  }
  if (shield) circle(ctx, s.pos.x, s.pos.y, SHIP_R + 8);
}

/** Flying saucer: a flat ellipse with a small dome. */
export function drawUfo(ctx: CanvasRenderingContext2D, u: Ufo) {
  ctx.beginPath();
  ctx.ellipse(u.pos.x, u.pos.y, UFO_R, UFO_R * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(u.pos.x, u.pos.y - UFO_R * 0.3, UFO_R * 0.45, Math.PI, 0);
  ctx.stroke();
}

/** Power-up icon at (x, y): shield = double circle, triple = three dots, rapid = two small triangles. */
export function drawPowerIcon(ctx: CanvasRenderingContext2D, kind: PowerKind, x: number, y: number, r: number) {
  if (kind === 'shield') {
    circle(ctx, x, y, r * 0.5);
  } else if (kind === 'triple') {
    for (const dx of [-0.45, 0, 0.45]) circle(ctx, x + dx * r, y, r * 0.15, true);
  } else {
    triangle(ctx, x - r * 0.2, y, r * 0.35, 0, true);
    triangle(ctx, x + r * 0.3, y, r * 0.35, 0, true);
  }
}

export function drawItem(ctx: CanvasRenderingContext2D, it: Item) {
  if (it.life < 2 && Math.floor(it.life * 8) % 2 === 0) return; // blinks before it disappears
  circle(ctx, it.pos.x, it.pos.y, ITEM_R);
  drawPowerIcon(ctx, it.kind, it.pos.x, it.pos.y, ITEM_R);
}

export interface Hud {
  score: number;
  best: number;
  level: number;
  lives: number;
  powers: Record<PowerKind, number>;
  hyperReady: boolean;
}

/** Score line on top, lives as small ships on the right; power-ups and hyperspace under the ✕ / ❚❚ buttons. */
export function drawHud(ctx: CanvasRenderingContext2D, hud: Hud, w: number) {
  text(ctx, `Score ${hud.score}   Best ${hud.best}   Level ${hud.level}`, w / 2, 24, Math.min(18, w / 30));
  for (let i = 0; i < hud.lives; i++) triangle(ctx, w - 24 - i * 24, 26, 9, -Math.PI / 2);
  let x = 130;
  for (const [kind, left] of Object.entries(hud.powers) as [PowerKind, number][]) {
    if (left <= 0) continue;
    drawPowerIcon(ctx, kind, x, 58, 12);
    text(ctx, `${Math.ceil(left)}s`, x + 18, 58, 12, 'left');
    x += 54;
  }
  text(ctx, hud.hyperReady ? 'Hyperspace ready' : 'Hyperspace…', 16, 80, 11, 'left');
}

/** Virtual joystick: base circle where the finger went down, knob where it is now (clamped to the base). */
export function drawStick(ctx: CanvasRenderingContext2D, start: Vec, pos: Vec, radius: number) {
  const dx = pos.x - start.x;
  const dy = pos.y - start.y;
  const k = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
  ctx.globalAlpha = 0.4;
  circle(ctx, start.x, start.y, radius);
  circle(ctx, start.x + dx * k, start.y + dy * k, radius * 0.4, true);
  ctx.globalAlpha = 1;
}
