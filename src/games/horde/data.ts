// Balance tables for Polygon Horde: player, difficulty growth, enemies, items and drops. Tune numbers here.
// Weapon tables are in arsenal.ts.

export const VIEW = 520; // world units visible across the shorter side of the screen
export const PLAYER_R = 12;
export const PLAYER_HP = 100;
export const PLAYER_SPEED = 150; // units per second
export const INVULNERABLE = 0.5; // seconds after a hit
export const PICKUP_R = 60; // gems and loot closer than this fly to the player
export const PICKUP_SPEED = 380;
export const MAGNET_SPEED = 700;
export const WEAPON_SLOTS = 4;
export const ITEM_SLOTS = 6;
export const MAX_TIER = 3;
export const MAX_LEVEL = 5; // weapon level
export const ELITE_EVERY = 60; // seconds
export const BOSS_EVERY = 180;
export const MAX_ENEMIES = 350;
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
export const CHEST_ITEMS = { elite: 1, boss: 3 };
/** Chance per kill of a normal enemy. */
export const DROPS = { item: 0.003, heal: 0.006, magnet: 0.002, bomb: 0.0015 };

const minutes = (t: number) => t / 60;
/** Enemy HP multiplier after `t` seconds: ×1.19 per minute, so a long run always ends. */
export const hpScale = (t: number) => Math.pow(1.19, minutes(t));
export const damageScale = (t: number) => 1 + 0.1 * minutes(t);
export const speedScale = (t: number) => Math.min(1.4, 1 + 0.02 * minutes(t));
/** Enemies spawned per second. */
export const spawnRate = (t: number) => 0.8 + 0.45 * minutes(t) + 0.02 * minutes(t) ** 2;
/** XP needed to go from `level` to the next. */
export const xpToNext = (level: number) => Math.round(4 + 3 * level + 0.25 * level * level);

export type Shape = 'triangle' | 'thin' | 'square' | 'diamond' | 'pentagon' | 'hexagon' | 'circle' | 'star';
export type EnemyKind = 'grunt' | 'runner' | 'shooter' | 'dasher' | 'splitter' | 'tank' | 'bomber' | 'boss';

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
};

export const RUNNER_PACK = 4;
export const SPLIT_INTO = 3;
export const SHOOTER_RANGE = 210;
export const SHOOTER_RELOAD = 2.5;
export const SHOT_SPEED = 150;
export const DASH_RANGE = 280;
export const DASH_AIM = 0.7;
export const DASH_TIME = 0.45;
export const DASH_SPEED = 420;
export const DASH_REST = 2.5;
export const FUSE = 0.6;
export const FUSE_RANGE = 40;
export const BLAST_R = 70;
export const BOSS_PHASE = 4; // seconds per boss phase
export const BOSS_RING = 16; // bullets in a boss ring
export const BOSS_SUMMON = 6;

export type ItemKind = 'boots' | 'clock' | 'blade' | 'needle' | 'heart' | 'lens';

export interface ItemDef {
  name: string;
  color: string;
  tiers: number[]; // bonus at tier I, II, III
  text: (v: number) => string;
}

const pct = (what: string) => (v: number) => `+${Math.round(v * 100)}% ${what}`;

export const ITEMS: Record<ItemKind, ItemDef> = {
  boots: { name: 'Boots', color: '#00bcd4', tiers: [0.1, 0.2, 0.35], text: pct('move speed') },
  clock: { name: 'Clock', color: '#ffb300', tiers: [0.1, 0.22, 0.4], text: pct('attack speed') },
  blade: { name: 'Blade', color: '#c62828', tiers: [0.15, 0.32, 0.55], text: pct('damage') },
  needle: { name: 'Needle', color: '#8d6e63', tiers: [1, 2, 3], text: (v) => `+${v} pierce` },
  heart: { name: 'Heart', color: '#ec407a', tiers: [0.5, 1.2, 2.5], text: (v) => `+${v} HP/s regen` },
  lens: { name: 'Lens', color: '#5c6bc0', tiers: [0.12, 0.26, 0.45], text: pct('area') },
};

export const ITEM_KINDS = Object.keys(ITEMS) as ItemKind[];
export const TIER_NAMES = ['I', 'II', 'III'];
