// Seeded level generator (the same code always gives the same arena) and level codes like "3-48213".
import { randInt, seededRandom, type Vec } from '../../engine/math';
import { COLS, key, ROWS, Tile, BLOCK_CHANCE, type EnemyKind } from './model';

export interface LevelPlan {
  grid: Tile[];
  door: number;
  enemies: { pos: Vec; kind: EnemyKind }[];
}

/** Starting corners: top-left for player 1, bottom-right for player 2 (duel). */
export const STARTS: Vec[] = [
  { x: 1, y: 1 },
  { x: COLS - 2, y: ROWS - 2 },
];

export const newSeed = () => randInt(1, 99999);
export const levelCode = (level: number, seed: number) => `${level}-${seed}`;

/** "3-48213" → { level: 3, seed: 48213 }, or null when the text is not a level code. */
export function parseLevelCode(code: string): { level: number; seed: number } | null {
  const m = /^\s*(\d{1,3})\s*-\s*(\d{1,5})\s*$/.exec(code);
  return m ? { level: Number(m[1]), seed: Number(m[2]) } : null;
}

/**
 * Walls on the border and every other tile, random breakable blocks, the exit hidden under one block, and
 * 2 + level enemies (solo). Start corners and their neighbours are always free. Everything comes from `seed`.
 */
export function generateLevel(seed: number, level: number, duel: boolean): LevelPlan {
  const rnd = seededRandom(seed * 1000 + level);
  const nearStart = (x: number, y: number) =>
    STARTS.slice(0, duel ? 2 : 1).some((s) => Math.abs(x - s.x) + Math.abs(y - s.y) <= 2);
  const grid: Tile[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      const pillar = x % 2 === 0 && y % 2 === 0;
      grid.push(border || pillar ? Tile.Wall : !nearStart(x, y) && rnd() < BLOCK_CHANCE ? Tile.Block : Tile.Empty);
    }
  }
  if (duel) return { grid, door: -1, enemies: [] };

  const blocks = grid.map((t, i) => (t === Tile.Block ? i : -1)).filter((i) => i >= 0);
  const door = blocks[Math.floor(rnd() * blocks.length)];
  const enemies: LevelPlan['enemies'] = [];
  while (enemies.length < 2 + level) {
    const x = 1 + Math.floor(rnd() * (COLS - 2));
    const y = 1 + Math.floor(rnd() * (ROWS - 2));
    if (grid[key(x, y)] === Tile.Wall || x + y < 8 || key(x, y) === door) continue;
    if (enemies.some((e) => e.pos.x === x && e.pos.y === y)) continue;
    grid[key(x, y)] = Tile.Empty;
    enemies.push({ pos: { x, y }, kind: enemyKind(level, enemies.length, rnd()) });
  }
  return { grid, door, enemies };
}

// Level 1: only wanderers. Level 2: one chaser. From level 3: a mix of chasers and bomb-avoiders.
function enemyKind(level: number, index: number, r: number): EnemyKind {
  if (level === 1) return 'wander';
  if (level === 2) return index === 0 ? 'chase' : 'wander';
  return r < 0.3 ? 'chase' : r < 0.6 ? 'careful' : 'wander';
}
