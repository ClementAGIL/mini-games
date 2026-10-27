// Shared types for Tower Defense: what the simulation, the renderer and the panel all talk about.
import type { Vec } from '../../engine/math';
import type { Bonus, EnemyStats, Kind } from './data';

export type TargetMode = 'first' | 'nearest' | 'shape';

export const TARGET_MODES: TargetMode[] = ['first', 'nearest', 'shape'];
export const TARGET_LABEL: Record<TargetMode, string> = { first: 'First', nearest: 'Nearest', shape: 'Own shape' };
/** Towers that hit everything in range, so a target mode would change nothing. */
export const AREA_TOWERS: Kind[] = ['circle', 'hexagon'];

export interface Enemy extends EnemyStats {
  kind: Kind;
  wave: number;
  boss: boolean;
  small: boolean; // split copy, drawn smaller
  pos: Vec; // tile units, (0.5, 0.5) is the center of tile (0, 0)
  d: number; // distance travelled along the path, in tiles
  maxHp: number;
  maxShield: number;
  lastHit: number;
  burn: number; // damage per second while burning
  burnTime: number;
  poison: number; // damage per second while poisoned (stacks)
  poisonTime: number;
  slow: number; // 0..1 speed reduction while slowed
  slowTime: number;
  blinkTimer: number;
  summonTimer: number;
  powerTimer: number; // bosses: time until the next pulse or portal
  // Boss auras on a normal enemy. `haste` and `heal` are set again every step while a boss is close.
  haste: number; // speed bonus, 0.4 = +40%
  heal: number; // share of max HP healed per second
  auraShield: number; // absorbs damage before the enemy's own shield, never refills
  auraArmor: number;
  auraArmorTime: number;
  leaked: boolean;
  // Tower credited with the kill (experience): last one that damaged it, directly or by burn/poison.
  lastTower: Tower | null;
  burnBy: Tower | null;
  poisonBy: Tower | null;
}

export interface Tower {
  kind: Kind;
  mode: TargetMode;
  tx: number;
  ty: number;
  level: number;
  spent: number;
  xp: number; // kills toward the next free level
  cooldown: number;
  angle: number;
  // From combo partners on the 8 tiles around (recomputed when towers are built or sold).
  bonus: Bonus;
  partners: number;
  damageDone: number; // total damage dealt since it was built
  stun: number; // seconds left without attacking (Hexagon boss)
}

/** Homing projectile (Rifle bullet, Poison dart). */
export interface Bullet {
  pos: Vec;
  target: Enemy;
  damage: number;
  tower: Tower;
}

/** Straight Piercer arrow that hits up to `pierce` different enemies. */
export interface Arrow {
  pos: Vec;
  dir: Vec;
  left: number; // distance it can still travel
  damage: number;
  pierce: number;
  hit: Set<Enemy>;
  tower: Tower;
}

export type Fx =
  | { type: 'ring'; pos: Vec; range: number; kind: Kind; life: number }
  | { type: 'line'; from: Vec; to: Vec; life: number }
  | { type: 'cone'; pos: Vec; angle: number; range: number; life: number }
  | { type: 'chain'; points: Vec[]; life: number };

export interface Spawner {
  queue: QueuedEnemy[];
  wave: number;
  timer: number;
}

export interface QueuedEnemy {
  kind: Kind;
  boss: boolean;
}

/** Short message shown on the map for a moment (interest earned, lives healed...). */
export interface Note {
  text: string;
  life: number;
}

/** Totals for the game-over summary. */
export interface GameStats {
  livesLost: Partial<Record<Kind, number>>;
  damage: Partial<Record<Kind, number>>; // by tower kind
}
