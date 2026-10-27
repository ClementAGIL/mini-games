// The Tower Defense shapes (one per tower/enemy kind) and small drawing helpers shared by the map and the panel.
import { circle, INK, poly, regular } from '../../engine/draw';
import type { Vec } from '../../engine/math';
import type { Kind } from './data';

function starPoints(x: number, y: number, r: number): Vec[] {
  return regular(x, y, r * 1.1, 10, -Math.PI / 2).map((p, i) =>
    i % 2 ? { x: x + (p.x - x) * 0.45, y: y + (p.y - y) * 0.45 } : p,
  );
}

/** Corners of a kind's shape, or null for the circle. */
function shapePoints(kind: Kind, x: number, y: number, r: number): Vec[] | null {
  const up = -Math.PI / 2;
  switch (kind) {
    case 'circle':
      return null;
    case 'diamond':
      return regular(x, y, r, 4, up);
    case 'triangle':
      return regular(x, y, r * 1.1, 3, up);
    case 'square':
      return regular(x, y, r * 1.13, 4, -Math.PI / 4);
    case 'pentagon':
      return regular(x, y, r, 5, up);
    case 'hexagon':
      return regular(x, y, r, 6, 0);
    case 'octagon':
      return regular(x, y, r, 8, Math.PI / 8);
    case 'star':
      return starPoints(x, y, r);
  }
}

/** One of the game shapes, filled with `color` and outlined in black. */
export function drawShape(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, color: string) {
  const pts = shapePoints(kind, x, y, r);
  for (const fill of [true, false]) {
    ctx.fillStyle = fill ? color : INK;
    if (pts) poly(ctx, pts, fill);
    else circle(ctx, x, y, r, fill);
  }
}

/** Small filled star: the combo badge. */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  poly(ctx, starPoints(x, y, r), true);
}

/** Short number for small spaces: 950, 12.3k, 4.5M. */
export function compact(n: number) {
  if (n < 10000) return `${n}`;
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}
