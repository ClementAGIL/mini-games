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
  hitAt: Partial<Record<WeaponKind, number>>; // run time of the last hit by a contact weapon (Orbit, Saw, Lighthouse)
  slow: number; // share of speed lost while chilled (Frost)
  slowLeft: number;
  burn: number; // damage per second while burning (Flamer)
  burnLeft: number;
  burnBy: OwnedWeapon | null;
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
  shots: number; // times it fired (the Whip alternates sides)
  dealt: number; // total damage, for the game-over stats
}

export type MissileKind = 'dart' | 'shard' | 'pellet' | 'boomerang' | 'saw' | 'homing' | 'flame';

/** A projectile in flight. `left` = enemies it can still hit after the current one. */
export interface Missile {
  kind: MissileKind;
  weapon: OwnedWeapon;
  pos: Vec;
  vel: Vec;
  r: number;
  damage: number;
  left: number;
  hit: Set<Enemy>;
  life: number;
  age: number;
  target: Enemy | null; // homing missiles
  range: number; // boomerang: distance before it turns back; homing: blast radius; flame: burn time
}

/** A Pulse or Frost ring, centered on the player, growing to `maxR`. */
export interface Ring {
  weapon: OwnedWeapon;
  r: number;
  maxR: number;
  damage: number;
  hit: Set<Enemy>;
  heals: boolean; // Lifewave
  slow: number; // Frost: share of speed taken from the enemies it touches
  push: number; // knockback speed
}

/** A Meteor about to land: a warning circle, then a blast. */
export interface Strike {
  weapon: OwnedWeapon;
  pos: Vec;
  delay: number;
  radius: number;
  damage: number;
}

/** A Black hole: pulls enemies in and hurts them every `TICK`. */
export interface Vortex {
  weapon: OwnedWeapon;
  pos: Vec;
  life: number;
  radius: number;
  damage: number;
  tick: number;
}

export interface Mine {
  weapon: OwnedWeapon;
  pos: Vec;
  arm: number; // seconds before it can trigger
  life: number;
  damage: number;
  radius: number;
}

/** Short-lived drawings: Lance / Whip beams, Chain bolts and explosions. */
export interface Beam {
  from: Vec;
  to: Vec;
  width: number;
  life: number;
}

export interface Bolt {
  pts: Vec[];
  life: number;
}

export interface Blast {
  pos: Vec;
  r: number;
  life: number;
  color: string;
}

export type PickupKind = 'xp' | 'heal' | 'magnet' | 'bomb' | 'chest' | 'relic'; // relic: a boss chest

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
