// Shared types of Polygon Horde. Positions are in world units, speeds in units per second.
import type { Vec } from '../../engine/math';
import type { WeaponKind } from './arsenal';
import type { EnemyKind, StatKind } from './data';

export interface Player {
  pos: Vec;
  hp: number;
  maxHp: number;
  facing: Vec; // last move direction (unit vector), aims the Lance
  invulnerable: number; // seconds left
}

export interface Enemy {
  kind: EnemyKind;
  pos: Vec;
  knock: Vec; // knockback velocity, decays quickly
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  elite: boolean;
  boss: boolean;
  mode: 'walk' | 'aim' | 'dash'; // dashers and bosses
  phase: number; // boss phase index
  phaseLeft: number; // seconds left in the boss phase
  timer: number; // reload / dash / phase timer, depending on the kind
  aim: Vec; // dash direction
  fuse: number; // bombers: seconds before the blast, < 0 when not lit
  orbitAt: number; // run time of the last Orbit hit
  flash: number; // seconds of hit flash left
}

/** An enemy bullet. */
export interface Shot {
  pos: Vec;
  vel: Vec;
  damage: number;
  life: number;
}

export interface OwnedWeapon {
  kind: WeaponKind;
  level: number;
  evolved: boolean;
  timer: number; // seconds until it fires again
  dealt: number; // total damage, for the game-over stats
}

/** A Dart or Shard in flight. `left` = enemies it can still hit after the current one. */
export interface Missile {
  weapon: OwnedWeapon;
  pos: Vec;
  vel: Vec;
  r: number;
  damage: number;
  left: number;
  bounce: boolean; // Shard: jumps to the next enemy instead of flying on
  hit: Set<Enemy>;
  life: number;
}

/** A Pulse ring, centered on the player, growing to `maxR`. */
export interface Ring {
  weapon: OwnedWeapon;
  r: number;
  maxR: number;
  damage: number;
  hit: Set<Enemy>;
  heals: boolean;
}

export interface Mine {
  weapon: OwnedWeapon;
  pos: Vec;
  arm: number; // seconds before it can trigger
  life: number;
  damage: number;
  radius: number;
}

/** Short-lived drawings: Lance beams and explosions. */
export interface Beam {
  from: Vec;
  to: Vec;
  width: number;
  life: number;
}

export interface Blast {
  pos: Vec;
  r: number;
  life: number;
  color: string;
}

export type PickupKind = 'xp' | 'heal' | 'magnet' | 'bomb' | 'chest';

export interface Pickup {
  kind: PickupKind;
  pos: Vec;
  value: number; // XP of a gem, free level-ups in a chest
  pulled: boolean; // flies to the player whatever the distance (magnet)
  taken: boolean;
}

export type Card =
  | { kind: 'weapon'; weapon: WeaponKind }
  | { kind: 'stat'; stat: StatKind; rarity: number } // rarity: index in RARITIES
  | { kind: 'heal' }
  | { kind: 'maxhp' };
