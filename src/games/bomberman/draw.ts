// Bomberman drawing: tiles (walls, blocks, exit, power-ups, spreading flames), bombs with countdown rings,
// enemies by kind and the players.
import { circle, line, rect, triangle } from '../../engine/draw';
import { burning } from './bombs';
import { BOMB_TIME, COLS, FLAME_TIME, key, ROWS, Tile, type Bomb, type Enemy, type Powerup, type World } from './model';

/** Where the arena is on screen, and the clock for animations. */
export interface View {
  ox: number;
  oy: number;
  tile: number;
  time: number;
}

export function drawWorld(ctx: CanvasRenderingContext2D, w: World, v: View) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(ctx, w, v, x, y);
  for (const b of w.bombs) drawBomb(ctx, b, v);
  for (const e of w.enemies) drawEnemy(ctx, e, v);
  for (const p of w.players) {
    if (!p.alive) continue;
    const c = center(v, p.pos.x, p.pos.y);
    circle(ctx, c.x, c.y, v.tile * 0.35);
    if (p.id === 2) circle(ctx, c.x, c.y, v.tile * 0.15, true); // player 2: a dot inside
  }
}

const center = (v: View, x: number, y: number) => ({ x: v.ox + (x + 0.5) * v.tile, y: v.oy + (y + 0.5) * v.tile });

function drawTile(ctx: CanvasRenderingContext2D, w: World, v: View, x: number, y: number) {
  const t = v.tile;
  const k = key(x, y);
  const px = v.ox + x * t;
  const py = v.oy + y * t;
  if (w.grid[k] === Tile.Wall) rect(ctx, px, py, t, t, true);
  else if (w.grid[k] === Tile.Block) {
    rect(ctx, px + 1, py + 1, t - 2, t - 2);
    line(ctx, px + 4, py + 4, px + t - 4, py + t - 4);
    line(ctx, px + t - 4, py + 4, px + 4, py + t - 4);
  } else if (k === w.door && w.doorOpen) {
    // Exit: a door with a knob.
    rect(ctx, px + t * 0.22, py + t * 0.12, t * 0.56, t * 0.8);
    circle(ctx, px + t * 0.66, py + t * 0.55, t * 0.06, true);
  }
  const power = w.powerups.get(k);
  if (power) drawPowerup(ctx, power, center(v, x, y), t);
  const f = w.flames.get(k);
  if (f && burning(w, k)) {
    const s = Math.min(1, (FLAME_TIME - f.left) / 0.08); // grows quickly once lit
    const c = center(v, x, y);
    rect(ctx, c.x - t * 0.4 * s, c.y - t * 0.4 * s, t * 0.8 * s, t * 0.8 * s);
    rect(ctx, c.x - t * 0.2 * s, c.y - t * 0.2 * s, t * 0.4 * s, t * 0.4 * s);
  }
}

/** Square with an icon: dot = +1 bomb, cross = +1 range, chevrons = speed, triangle = kick,
 * ringed dot = remote detonation, dashed square = walk through blocks. */
function drawPowerup(ctx: CanvasRenderingContext2D, power: Powerup, c: { x: number; y: number }, t: number) {
  const a = t * 0.18;
  rect(ctx, c.x - t * 0.3, c.y - t * 0.3, t * 0.6, t * 0.6);
  if (power === 'bomb') circle(ctx, c.x, c.y, t * 0.15, true);
  else if (power === 'range') {
    line(ctx, c.x - a, c.y, c.x + a, c.y);
    line(ctx, c.x, c.y - a, c.x, c.y + a);
  } else if (power === 'speed') {
    for (const dx of [-a * 0.6, a * 0.4]) {
      line(ctx, c.x + dx, c.y - a, c.x + dx + a * 0.6, c.y);
      line(ctx, c.x + dx + a * 0.6, c.y, c.x + dx, c.y + a);
    }
  } else if (power === 'kick') triangle(ctx, c.x, c.y, a, 0, true);
  else if (power === 'remote') {
    circle(ctx, c.x, c.y, a * 0.4, true);
    circle(ctx, c.x, c.y, a);
  } else {
    ctx.setLineDash([2, 2]);
    rect(ctx, c.x - a, c.y - a, a * 2, a * 2);
    ctx.setLineDash([]);
  }
}

// Pulsing filled circle, with a ring showing the time left (dashed when it waits for remote detonation).
function drawBomb(ctx: CanvasRenderingContext2D, b: Bomb, v: View) {
  const dx = b.slide ? b.slide.x * b.offset : 0;
  const dy = b.slide ? b.slide.y * b.offset : 0;
  const c = center(v, b.x + dx, b.y + dy);
  const pulse = 0.28 + 0.04 * Math.sin(v.time * 12);
  circle(ctx, c.x, c.y, v.tile * pulse, true);
  ctx.beginPath();
  if (Number.isFinite(b.timer)) {
    ctx.arc(c.x, c.y, v.tile * 0.44, -Math.PI / 2, -Math.PI / 2 + (b.timer / BOMB_TIME) * Math.PI * 2);
  } else {
    ctx.setLineDash([3, 3]);
    ctx.arc(c.x, c.y, v.tile * 0.44, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// Triangle pointing where it walks: outlined = wanderer, filled = chaser, with an inner triangle = careful.
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, v: View) {
  const c = center(v, e.pos.x, e.pos.y);
  const angle = e.dir.x || e.dir.y ? Math.atan2(e.dir.y, e.dir.x) : -Math.PI / 2;
  triangle(ctx, c.x, c.y, v.tile * 0.4, angle, e.kind === 'chase');
  if (e.kind === 'careful') triangle(ctx, c.x, c.y, v.tile * 0.18, angle);
}
