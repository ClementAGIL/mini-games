// Snake board size and the obstacle layout of each level.
import type { Vec } from '../../engine/math';

export const N = 20; // the board is N × N tiles

/** Every tile of the rectangle from (x0, y0) to (x1, y1), inclusive. */
function block(x0: number, y0: number, x1: number, y1: number): Vec[] {
  const tiles: Vec[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
  return tiles;
}

// The start row (y = 10, where the snake appears heading right) always stays clear.
const BARS = [...block(4, 5, 15, 5), ...block(4, 14, 15, 14)];
const PILLARS = [...block(4, 2, 4, 8), ...block(4, 12, 4, 17), ...block(15, 2, 15, 8), ...block(15, 12, 15, 17)];
const CORNERS = [...block(2, 2, 4, 4), ...block(15, 2, 17, 4), ...block(2, 15, 4, 17), ...block(15, 15, 17, 17)];

const LAYOUTS: Vec[][] = [[], BARS, PILLARS, CORNERS, [...BARS, ...PILLARS]];

/** Obstacles of a level: level 1 is empty, then each layout in turn; after the last one they repeat (without the empty one). */
export function levelWalls(level: number): Vec[] {
  if (level <= LAYOUTS.length) return LAYOUTS[level - 1];
  return LAYOUTS[1 + ((level - LAYOUTS.length - 1) % (LAYOUTS.length - 1))];
}
