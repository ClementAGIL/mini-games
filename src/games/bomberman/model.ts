// Bomberman constants and the shared world types used by the level generator, bombs, actors and drawing.
import { ANY_DIR, ARROWS, WASD, type DirKeys } from '../../engine/input';
import type { Vec } from '../../engine/math';

// Arena including the outer wall: 13×11 playable tiles.
export const COLS = 15;
export const ROWS = 13;
export const PLAYER_SPEED = 4; // tiles/s
export const SPEED_STEP = 0.6; // per speed power-up
export const MAX_PLAYER_SPEED = 6.5;
export const ENEMY_SPEED = 2;
export const CHASE_SPEED = 2.4;
export const CHASE_SIGHT = 6; // tiles: a chaser sees the player in a straight, clear line up to this far
export const BOMB_TIME = 2;
export const FLAME_TIME = 0.5;
export const FLAME_STEP = 0.035; // flames spread out one tile every 35 ms
export const KICK_SPEED = 6; // tiles/s for a kicked bomb
export const BLOCK_CHANCE = 0.55;
export const POWERUP_CHANCE = 0.3;
export const ENEMY_SCORE = 100;
export const LEVEL_TIME = 180; // seconds per level
export const DUEL_TIME = 120;
export const TIME_BONUS = 10; // points per second left when a level is cleared

export const enum Tile {
  Empty,
  Wall,
  Block,
}

export type Powerup = 'bomb' | 'range' | 'speed' | 'kick' | 'remote' | 'pass';
/** Drop weights: the common ones (more bombs, more range) come up more often. */
export const POWERUP_WEIGHTS: [Powerup, number][] = [
  ['bomb', 3],
  ['range', 3],
  ['speed', 2],
  ['kick', 1],
  ['remote', 1],
  ['pass', 1],
];

export type EnemyKind = 'wander' | 'chase' | 'careful';

export interface PlayerKeys {
  dirs: DirKeys;
  bomb: string[];
  detonate: string[];
}

export const SOLO_KEYS: PlayerKeys = { dirs: ANY_DIR, bomb: ['Space'], detonate: ['KeyE'] };
export const DUEL_KEYS: PlayerKeys[] = [
  { dirs: WASD, bomb: ['Space'], detonate: ['KeyE'] },
  { dirs: ARROWS, bomb: ['Enter'], detonate: ['ShiftRight'] },
];

export interface Player {
  id: number; // 1 or 2
  pos: Vec; // tile units, integers are tile centers
  alive: boolean;
  maxBombs: number;
  range: number;
  speed: number;
  kick: boolean; // walking into a bomb pushes it
  remote: boolean; // bombs wait for the detonate key
  pass: boolean; // walks through breakable blocks
  keys: PlayerKeys;
}

export interface Bomb {
  x: number;
  y: number;
  timer: number; // Infinity for remote bombs until detonated
  range: number;
  owner: Player;
  slide: Vec | null; // direction while kicked
  offset: number; // 0..1 progress toward the next tile while sliding
}

export interface Flame {
  delay: number; // seconds before this tile catches fire (flames spread out)
  left: number; // seconds it burns once lit
}

export interface Enemy {
  kind: EnemyKind;
  pos: Vec;
  target: Vec;
  dir: Vec;
}

/** Everything on the board. */
export interface World {
  grid: Tile[];
  bombs: Bomb[];
  flames: Map<number, Flame>;
  powerups: Map<number, Powerup>;
  door: number; // tile key of the exit, -1 in a duel
  doorOpen: boolean; // revealed once its block is destroyed
  enemies: Enemy[];
  players: Player[];
}

export const key = (x: number, y: number) => y * COLS + x;
export const tileOf = (p: Vec) => key(Math.round(p.x), Math.round(p.y));

export const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function newPlayer(id: number, pos: Vec, keys: PlayerKeys): Player {
  return {
    id,
    pos,
    alive: true,
    maxBombs: 1,
    range: 1,
    speed: PLAYER_SPEED,
    kick: false,
    remote: false,
    pass: false,
    keys,
  };
}
