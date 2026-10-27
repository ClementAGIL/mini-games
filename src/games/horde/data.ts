// Balance tables for Polygon Horde: player, difficulty growth, enemies, stats, rarities and drops. Tune numbers here.
// Weapon tables are in arsenal.ts.

export const VIEW = 520; // world units visible across the shorter side of the screen
export const PLAYER_R = 12;
export const PLAYER_HP = 100;
export const PLAYER_SPEED = 150; // units per second
export const INVULNERABLE = 0.5; // seconds after a hit
export const PICKUP_R = 60; // gems and loot closer than this fly to the player
export const PICKUP_SPEED = 380;
export const MAGNET_SPEED = 700;
export const WEAPON_SLOTS = 5;
export const ARTIFACT_SLOTS = 5;
export const MAX_LEVEL = 5; // weapon level
export const ELITE_EVERY = 60; // seconds
export const BOSS_EVERY = 180;
export const MAX_ENEMIES = 600;
export const MAX_GEMS = 300;
export const SPAWN_MARGIN = 60; // enemies appear this far outside the view
export const RECYCLE = 2; // enemies further than this × the spawn distance are moved back near the player
export const HEAL_DROP = 25;
export const HEAL_CARD = 30;
export const MAX_HP_CARD = 10;
export const ELITE_SIZE = 1.6;
export const ELITE_HP = 10;
export const ELITE_DAMAGE = 1.5;
export const BOSS_GROWTH = 0.6; // each boss has +60% HP over the previous one
export const BOSS_GEMS = 8; // gems of 5 XP dropped by a boss
/** Chance per kill of a normal enemy. */
export const DROPS = { heal: 0.006, magnet: 0.002, bomb: 0.0015 };

const minutes = (t: number) => t / 60;
/** Enemy HP multiplier after `t` seconds: ×1.19 per minute, so a long run always ends. */
export const hpScale = (t: number) => Math.pow(1.19, minutes(t));
export const damageScale = (t: number) => 1 + 0.1 * minutes(t);
export const speedScale = (t: number) => Math.min(1.4, 1 + 0.02 * minutes(t));
/** Enemies spawned per second. */
export const spawnRate = (t: number) => 1.5 * (0.8 + 0.45 * minutes(t) + 0.02 * minutes(t) ** 2);
// The player level also makes the horde grow, so a strong build keeps being pushed: tougher, faster, more enemies.
/** Enemy HP multiplier at player `level`: +3% per level (×1.9 at level 31, ×2.5 at level 51), no limit. */
export const levelHp = (level: number) => 1 + 0.03 * (level - 1);
/** Enemy speed multiplier at player `level`: +1% per level, at most ×1.5 (level 51). */
export const levelSpeed = (level: number) => Math.min(1.5, 1 + 0.01 * (level - 1));
/** Spawn rate multiplier at player `level`: +4% per level (×2.2 at level 31, ×3 at level 51). */
export const levelSpawn = (level: number) => 1 + 0.04 * (level - 1);
/** XP needed to go from `level` to the next. */
export const xpToNext = (level: number) => Math.round(4 + 3 * level + 0.25 * level * level);

export type Shape = 'triangle' | 'thin' | 'square' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'circle' | 'star';
/** `boss` stats are the base of every boss (bosses.ts gives each its look and attacks); eggs and decoys are boss minions. */
export type EnemyKind =
  | 'grunt'
  | 'runner'
  | 'shooter'
  | 'dasher'
  | 'splitter'
  | 'tank'
  | 'bomber'
  | 'boss'
  | 'egg'
  | 'decoy';

export interface EnemyDef {
  shape: Shape;
  color: string;
  r: number;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  from: number; // seconds into the run before it can spawn
  weight: number; // share in the spawn mix once unlocked
  heavy?: boolean; // ignores knockback
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt: { shape: 'triangle', color: '#e74c3c', r: 10, hp: 10, speed: 60, damage: 8, xp: 1, from: 0, weight: 10 },
  runner: { shape: 'thin', color: '#f39c12', r: 8, hp: 6, speed: 130, damage: 5, xp: 1, from: 60, weight: 3 },
  shooter: { shape: 'square', color: '#3498db', r: 11, hp: 14, speed: 55, damage: 8, xp: 2, from: 120, weight: 3 },
  dasher: { shape: 'diamond', color: '#9b59b6', r: 11, hp: 16, speed: 50, damage: 12, xp: 2, from: 180, weight: 3 },
  splitter: { shape: 'pentagon', color: '#1abc9c', r: 14, hp: 30, speed: 45, damage: 10, xp: 3, from: 240, weight: 2 },
  tank: {
    shape: 'hexagon',
    color: '#27ae60',
    r: 20,
    hp: 80,
    speed: 30,
    damage: 15,
    xp: 5,
    from: 300,
    weight: 2,
    heavy: true,
  },
  bomber: { shape: 'circle', color: '#f1c40f', r: 10, hp: 8, speed: 95, damage: 20, xp: 2, from: 360, weight: 2 },
  boss: { shape: 'star', color: '#888', r: 40, hp: 900, speed: 45, damage: 25, xp: 0, from: 0, weight: 0, heavy: true },
  egg: { shape: 'circle', color: '#ffe0b2', r: 9, hp: 15, speed: 0, damage: 5, xp: 0, from: 0, weight: 0, heavy: true },
  decoy: { shape: 'diamond', color: '#90a4ae', r: 36, hp: 40, speed: 70, damage: 12, xp: 0, from: 0, weight: 0 },
};

export const RUNNER_PACK = 4;
export const SPLIT_INTO = 3;
export const SHOOTER_RANGE = 210;
export const SHOOTER_RELOAD = 2.5;
export const SHOT_SPEED = 150;
export const SHOT_R = 4; // enemy bullet radius
export const DASH_RANGE = 280;
export const DASH_AIM = 0.7;
export const DASH_TIME = 0.45;
export const DASH_SPEED = 420;
export const DASH_REST = 2.5;
export const FUSE = 0.6;
export const FUSE_RANGE = 40;
export const BLAST_R = 70;

export type StatKind = 'speed' | 'haste' | 'damage' | 'pierce' | 'regen' | 'area' | 'magnet' | 'luck';

export interface StatDef {
  name: string;
  color: string;
  values: number[]; // bonus of one card at each rarity, Iron to Diamond
  text: (v: number) => string;
}

const pct = (what: string) => (v: number) => `+${Math.round(v * 100)}% ${what}`;

export const STATS: Record<StatKind, StatDef> = {
  speed: { name: 'Speed', color: '#00bcd4', values: [0.04, 0.08, 0.12, 0.18, 0.3], text: pct('move speed') },
  haste: { name: 'Haste', color: '#ffb300', values: [0.05, 0.1, 0.15, 0.25, 0.5], text: pct('attack speed') },
  damage: { name: 'Might', color: '#c62828', values: [0.06, 0.12, 0.18, 0.3, 0.6], text: pct('damage') },
  pierce: { name: 'Pierce', color: '#8d6e63', values: [1, 1, 2, 2, 3], text: (v) => `+${v} pierce` },
  regen: { name: 'Regen', color: '#ec407a', values: [0.2, 0.4, 0.7, 1.2, 2.5], text: (v) => `+${v} HP/s` },
  area: { name: 'Area', color: '#5c6bc0', values: [0.05, 0.1, 0.15, 0.25, 0.45], text: pct('area') },
  magnet: { name: 'Reach', color: '#7cb342', values: [0.15, 0.3, 0.45, 0.7, 1.2], text: pct('pickup range') },
  luck: { name: 'Luck', color: '#43a047', values: [5, 10, 15, 25, 50], text: (v) => `+${v} luck` },
};

export const STAT_KINDS = Object.keys(STATS) as StatKind[];

export interface Rarity {
  name: string;
  color: string;
  weight: number; // base odds in %
}

export const RARITIES: Rarity[] = [
  { name: 'Iron', color: '#78909c', weight: 50 },
  { name: 'Bronze', color: '#bf7a3a', weight: 28 },
  { name: 'Silver', color: '#9e9e9e', weight: 15 },
  { name: 'Gold', color: '#ffb300', weight: 6 },
  { name: 'Diamond', color: '#26c6da', weight: 1 },
];

/** Luck multiplies the odds of rarity i by (1 + luck/100)^i, and the drop chances by (1 + luck/100). */
export const luckFactor = (luck: number) => 1 + luck / 100;
export const ELITE_LUCK = 30; // extra luck for the cards of an elite's free level-up
