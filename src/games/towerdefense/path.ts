import { randInt, shuffle, type Vec } from '../../engine/math';

export const COLS = 29;
export const ROWS = 17;

// The path is generated on a half-resolution grid: coarse cell (i, j) is tile (2i+1, 2j+1) and
// the link between two cells is the tile in between. Two parts of the path that aren't consecutive
// therefore always have at least one free tile between them, so towers fit on every side.
const CW = (COLS - 1) / 2;
const CH = (ROWS - 1) / 2;
const MIN_TILES = 35; // hard minimum path length
const MIN_CELLS = 26; // preferred range in coarse cells (26 cells ≈ 53 tiles)
const MAX_CELLS = 46;

type Side = 'right' | 'top' | 'bottom';

/** Returns the path as consecutive tile coordinates, from an edge of the map to a different edge. */
export function generatePath(): Vec[] {
  let best: Vec[] = [];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 300 || best.length < MIN_TILES; attempt++) {
    const start = { x: 0, y: randInt(0, CH - 1) };
    const side = (['right', 'top', 'bottom'] as Side[])[randInt(0, 2)];
    const end =
      side === 'right'
        ? { x: CW - 1, y: randInt(0, CH - 1) }
        : { x: randInt(Math.floor(CW / 2), CW - 1), y: side === 'top' ? 0 : CH - 1 };
    const cells = randomWalk(start, end);
    if (!cells) continue;
    if (cells.length >= MIN_CELLS && cells.length <= MAX_CELLS) return toTiles(cells, side);
    const tiles = toTiles(cells, side);
    const score = Math.abs(cells.length - (MIN_CELLS + MAX_CELLS) / 2);
    if (tiles.length >= MIN_TILES && score < bestScore) [best, bestScore] = [tiles, score];
  }
  return best;
}

// Randomized depth-first search; the stack at the moment the end is reached is a
// self-avoiding path, which gives nicely winding routes.
function randomWalk(start: Vec, end: Vec): Vec[] | null {
  const seen = new Set<number>([start.y * CW + start.x]);
  const stack: Vec[] = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    if (cur.x === end.x && cur.y === end.y) return stack;
    const next = shuffle([
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ]).find((n) => n.x >= 0 && n.y >= 0 && n.x < CW && n.y < CH && !seen.has(n.y * CW + n.x));
    if (next) {
      seen.add(next.y * CW + next.x);
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  return null;
}

function toTiles(cells: Vec[], side: Side): Vec[] {
  const tile = (c: Vec) => ({ x: c.x * 2 + 1, y: c.y * 2 + 1 });
  const first = tile(cells[0]);
  const tiles: Vec[] = [{ x: 0, y: first.y }];
  cells.forEach((c, i) => {
    const t = tile(c);
    if (i > 0) {
      const prev = tile(cells[i - 1]);
      tiles.push({ x: (prev.x + t.x) / 2, y: (prev.y + t.y) / 2 });
    }
    tiles.push(t);
  });
  const last = tiles[tiles.length - 1];
  if (side === 'right') tiles.push({ x: COLS - 1, y: last.y });
  else tiles.push({ x: last.x, y: side === 'top' ? 0 : ROWS - 1 });
  return tiles;
}
