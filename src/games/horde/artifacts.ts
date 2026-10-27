// Artifacts: rare passive powers chosen from boss chests (5 slots). The table, and the state and effects of the ones
// that act over time (drone, sentinel, gravity well, shield orb) or on events (phoenix, fang).
import { dist, moveToward, shuffle, type Vec } from '../../engine/math';
import { ARTIFACT_SLOTS } from './data';
import type { Run } from './game';
import { newWeapon } from './inventory';
import { shootDart } from './shooters';
import { nearest } from './targeting';

export type ArtifactKind =
  | 'drone'
  | 'fourth'
  | 'reroll'
  | 'phoenix'
  | 'twin'
  | 'fang'
  | 'shield'
  | 'gravity'
  | 'hourglass'
  | 'sentinel'
  | 'prism'
  | 'banish';

export interface ArtifactDef {
  name: string;
  text: string;
  color: string;
}

export const ARTIFACTS: Record<ArtifactKind, ArtifactDef> = {
  drone: { name: 'Collector drone', text: 'Flies out to pick up XP and loot', color: '#26a69a' },
  fourth: { name: 'Fourth card', text: 'Level-ups show 4 choices', color: '#7e57c2' },
  reroll: { name: 'Reroll die', text: '2 rerolls on every level-up (R)', color: '#5c6bc0' },
  phoenix: { name: 'Phoenix', text: 'Revive once at 50% HP', color: '#ff7043' },
  twin: { name: 'Twin core', text: 'Every weapon +1 projectile / beam', color: '#ab47bc' },
  fang: { name: 'Vampire fang', text: 'Heal 1 HP every 10 kills', color: '#c62828' },
  shield: { name: 'Shield orb', text: 'Blocks a hit, recharges in 15 s', color: '#29b6f6' },
  gravity: { name: 'Gravity well', text: 'Pulls in every gem every 30 s', color: '#8d6e63' },
  hourglass: { name: 'Hourglass', text: 'All enemies 15% slower', color: '#ffca28' },
  sentinel: { name: 'Sentinel', text: 'A turret follows you and shoots', color: '#78909c' },
  prism: { name: 'Prism of XP', text: '+30% XP', color: '#66bb6a' },
  banish: { name: 'Banish', text: 'Remove 3 cards from the pool (B)', color: '#424242' },
};

const ALL = Object.keys(ARTIFACTS) as ArtifactKind[];
const OFFER = 3;
const DRONE_SPEED = 320;
const DRONE_RANGE = 300; // looks for loot this far from the player
const SENTINEL_RELOAD = 0.6;
const SENTINEL_DAMAGE = 14; // grows with Might and the player level
const SENTINEL_RANGE = 350;
const GRAVITY_EVERY = 30;
const SHIELD_RECHARGE = 15;
const FANG_EVERY = 10;
export const REROLLS = 2;
const BANISHES = 3;
export const HOURGLASS = 0.85; // enemy speed factor
export const PRISM_XP = 1.3;

export class Artifacts {
  owned: ArtifactKind[] = [];
  drone: Vec | null = null;
  sentinel: Vec | null = null;
  shieldLeft = 0; // seconds until the shield orb is back; ready at 0
  banishLeft = BANISHES;
  /** Weapons and stats removed from the level-up pool by Banish. */
  banished = new Set<string>();
  /** The sentinel shoots darts with its own weapon, so its damage is counted apart. */
  readonly gun = newWeapon('dart');
  private phoenixUsed = false;
  private gravityLeft = GRAVITY_EVERY;
  private sentinelLeft = 0;

  has(k: ArtifactKind) {
    return this.owned.includes(k);
  }

  get full() {
    return this.owned.length >= ARTIFACT_SLOTS;
  }

  /** Up to 3 random artifacts not owned yet. */
  offer(): ArtifactKind[] {
    return shuffle(ALL.filter((k) => !this.has(k))).slice(0, OFFER);
  }

  add(k: ArtifactKind, run: Run) {
    this.owned.push(k);
    if (k === 'drone') this.drone = { ...run.player.pos };
    if (k === 'sentinel') this.sentinel = { ...run.player.pos };
  }

  /** True when the shield orb takes the hit instead of the player. */
  absorb() {
    if (!this.has('shield') || this.shieldLeft > 0) return false;
    this.shieldLeft = SHIELD_RECHARGE;
    return true;
  }

  /** Called at 0 HP: true when the phoenix brings the player back. */
  revive(run: Run) {
    if (!this.has('phoenix') || this.phoenixUsed) return false;
    this.phoenixUsed = true;
    run.player.hp = run.player.maxHp / 2;
    return true;
  }

  onKill(run: Run) {
    if (this.has('fang') && run.kills % FANG_EVERY === 0) run.heal(1);
  }

  update(run: Run, dt: number) {
    this.shieldLeft = Math.max(0, this.shieldLeft - dt);
    if (this.drone) this.moveDrone(run, this.drone, dt);
    if (this.sentinel) this.moveSentinel(run, this.sentinel, dt);
    if (this.has('gravity') && (this.gravityLeft -= dt) <= 0) {
      this.gravityLeft = GRAVITY_EVERY;
      run.pullGems();
    }
  }

  // Goes to the nearest loot around the player and takes it; otherwise stays at the player's side.
  private moveDrone(run: Run, d: Vec, dt: number) {
    const p = run.player.pos;
    const loot = run.pickups.filter((k) => !k.taken && dist(k.pos, p) < DRONE_RANGE);
    const target = loot.sort((a, b) => dist(a.pos, d) - dist(b.pos, d))[0];
    const goal = target ? target.pos : { x: p.x - 24, y: p.y - 24 };
    moveToward(d, goal, DRONE_SPEED * dt);
    if (target && dist(target.pos, d) < 8) run.collect(target);
  }

  private moveSentinel(run: Run, s: Vec, dt: number) {
    const p = run.player.pos;
    s.x += (p.x + 30 - s.x) * Math.min(1, 3 * dt);
    s.y += (p.y + 30 - s.y) * Math.min(1, 3 * dt);
    if ((this.sentinelLeft -= dt) > 0) return;
    const target = nearest(run, s, SENTINEL_RANGE);
    if (!target) return;
    this.sentinelLeft = SENTINEL_RELOAD;
    const damage = SENTINEL_DAMAGE * (1 + run.mods.damage) * (1 + run.level * 0.05);
    shootDart(run, this.gun, s, target.pos, damage);
  }
}
