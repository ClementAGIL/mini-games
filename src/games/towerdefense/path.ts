// Tower Defense path generator: a winding, self-avoiding path from the left edge to another edge of the map.
import { randInt, shuffle, type Vec } from '../../engine/math';

export const COLS = 29;
export const ROWS = 17;

// The path runs along a lattice of columns and rows picked with random spacing: 2 tiles leaves 1 free tile between
// two parts of the path, 3 leaves 2, 4 leaves 3. Mostly 2–3 free tiles, so towers have room on both sides.
const SPACINGS = [2, 3, 3, 3, 4, 4, 4];
const MIN_TILES = 73; // path length range
const MAX_TILES = 120;
const ATTEMPTS = 300; // the path reaching the most of the map wins
const REACH = 3; // a tile counts as reached when at most this many tiles away from the path (both axes)

type Side = 'right' | 'top' | 'bottom';

/** Returns the path as consecutive tile coordinates, from an edge of the map to a different edge. */
export function generatePath(): Vec[] {
  let best: Vec[] = [];
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < ATTEMPTS || !best.length; attempt++) {
    const tiles = tryPath();
    if (!tiles) continue;
    const fits = tiles.length >= MIN_TILES && tiles.length <= MAX_TILES;
    // Paths out of the length range are only a fallback: they score below every path that fits.
    const score = reach(tiles) - (fits ? 0 : COLS * ROWS);
    if (score > bestScore) [best, bestScore] = [tiles, score];
  }
  return best;
}

function tryPath(): Vec[] | null {
  const xs = lattice(COLS - 2);
  const ys = lattice(ROWS - 2);
  const start = { x: 0, y: randInt(0, ys.length - 1) };
  const side = (['right', 'top', 'bottom'] as Side[])[randInt(0, 2)];
  const end =
    side === 'right'
      ? { x: xs.length - 1, y: randInt(0, ys.length - 1) }
      : { x: randInt(Math.floor(xs.length / 2), xs.length - 1), y: side === 'top' ? 0 : ys.length - 1 };
  const cells = randomWalk(start, end, xs.length, ys.length);
  if (!cells) return null;
  const points = cells.map((c) => ({ x: xs[c.x], y: ys[c.y] }));
  const first = points[0];
  const last = points[points.length - 1];
  const exit = side === 'right' ? { x: COLS - 1, y: last.y } : { x: last.x, y: side === 'top' ? 0 : ROWS - 1 };
  return fill([{ x: 0, y: first.y }, ...points, exit]);
}

/** Line positions between 1 and `max`, with random spacing, centered so neither side of the map is left empty. */
function lattice(max: number): number[] {
  const lines = [1];
  for (;;) {
    const next = lines[lines.length - 1] + SPACINGS[randInt(0, SPACINGS.length - 1)];
    if (next > max) break;
    lines.push(next);
  }
  const shift = Math.floor((max - lines[lines.length - 1]) / 2);
  return lines.map((l) => l + shift);
}

// Randomized depth-first search on the lattice; the stack at the moment the end is reached is a
// self-avoiding path, which gives nicely winding routes.
function randomWalk(start: Vec, end: Vec, w: number, h: number): Vec[] | null {
  const seen = new Set<number>([start.y * w + start.x]);
  const stack: Vec[] = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    if (cur.x === end.x && cur.y === end.y) return stack;
    const next = shuffle([
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ]).find((n) => n.x >= 0 && n.y >= 0 && n.x < w && n.y < h && !seen.has(n.y * w + n.x));
    if (next) {
      seen.add(next.y * w + next.x);
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  return null;
}

/** Every tile on the straight lines between consecutive points (each pair shares a row or a column). */
function fill(points: Vec[]): Vec[] {
  const tiles = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let s = 1; s <= steps; s++) {
      tiles.push({ x: a.x + Math.sign(b.x - a.x) * s, y: a.y + Math.sign(b.y - a.y) * s });
    }
  }
  return tiles;
}

/** How many tiles are close enough to the path to be useful for towers. */
function reach(tiles: Vec[]): number {
  const near = new Set<number>();
  for (const t of tiles) {
    for (let y = Math.max(0, t.y - REACH); y <= Math.min(ROWS - 1, t.y + REACH); y++) {
      for (let x = Math.max(0, t.x - REACH); x <= Math.min(COLS - 1, t.x + REACH); x++) near.add(y * COLS + x);
    }
  }
  return near.size;
}
