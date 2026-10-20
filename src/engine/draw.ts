import type { Vec } from './math';

export const INK = '#000';
export const PAPER = '#fff';
export const LINE = 2;

/** The one font used everywhere, at a given size. */
export const font = (size: number) => `bold ${size}px system-ui, sans-serif`;

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
}

function finish(ctx: CanvasRenderingContext2D, fill: boolean) {
  if (fill) ctx.fill();
  else ctx.stroke();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill = false) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  finish(ctx, fill);
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = false) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  finish(ctx, fill);
}

export function poly(ctx: CanvasRenderingContext2D, pts: Vec[], fill = false) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  finish(ctx, fill);
}

/** Open polyline through `pts`. */
export function polyline(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

/** Corners of a regular polygon with `n` corners, the first one at angle `rot`. */
export function regular(x: number, y: number, r: number, n: number, rot: number): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
}

// Isosceles triangle centred on (x, y), pointing along `angle`.
export function triangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  fill = false,
) {
  const pts = [0, 2.5, -2.5].map((a) => ({
    x: x + Math.cos(angle + a) * size,
    y: y + Math.sin(angle + a) * size,
  }));
  poly(ctx, pts, fill);
}

export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size = 20,
  align: CanvasTextAlign = 'center',
) {
  ctx.font = font(size);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** Width of `str` in the game font. */
export function textWidth(ctx: CanvasRenderingContext2D, str: string, size: number) {
  ctx.font = font(size);
  return ctx.measureText(str).width;
}

/** Largest font size (from `size` down to 8px) at which `str` fits in `width`. */
export function fitSize(ctx: CanvasRenderingContext2D, str: string, width: number, size: number) {
  while (size > 8 && textWidth(ctx, str, size) > width) size--;
  return size;
}

/** Small boxed text that stays readable over a busy background. */
export function label(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, size = 10) {
  const w = textWidth(ctx, str, size) + 6;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - w / 2, y - size / 2 - 2, w, size + 4);
  ctx.fillStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - size / 2 - 2, w, size + 4);
  ctx.lineWidth = LINE;
  text(ctx, str, x, y, size);
}

// Centered message box used for "Game over", "You win", etc.
export function overlay(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, sub: string) {
  const bw = Math.min(360, w - 40);
  const bh = 130;
  ctx.fillStyle = PAPER;
  ctx.fillRect(w / 2 - bw / 2, h / 2 - bh / 2, bw, bh);
  ctx.fillStyle = INK;
  rect(ctx, w / 2 - bw / 2, h / 2 - bh / 2, bw, bh);
  text(ctx, title, w / 2, h / 2 - 22, 32);
  text(ctx, sub, w / 2, h / 2 + 28, 16);
}
