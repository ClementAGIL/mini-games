// Balance tables for Tower Defense: towers, enemies, combos, economy. Tune numbers here.
// Wave sizes, growth and bosses are in waves.ts.

export type Kind = 'circle' | 'diamond' | 'triangle' | 'square' | 'star' | 'pentagon' | 'hexagon' | 'octagon';

/** Order in which enemy types are introduced (one new type every 5 waves). */
export const KINDS: Kind[] = ['circle', 'diamond', 'triangle', 'square', 'star', 'pentagon', 'hexagon', 'octagon'];

export const HUE: Record<Kind, number> = {
  circle: 130,
  diamond: 0,
  triangle: 48,
  square: 215,
  star: 280,
  pentagon: 28,
  hexagon: 185,
  octagon: 320,
};

export const SAME_SHAPE_MULT = 1.5;
export const OTHER_SHAPE_MULT = 0.6;
/** Levels 1–10 follow the ×3 DPS curve; levels above keep adding ×1.1 damage each (no level limit). */
export const CURVE_LEVELS = 10;
export const LATE_LEVEL_DAMAGE = 1.1;
export const SELL_RATIO = 0.5;
export const START_COINS = 300;
export const START_LIVES = 20;
export const SHIELD_DELAY = 2; // seconds without damage before a shield refills
export const BURN_TIME = 2;
export const POISON_TIME = 4;
export const POISON_STACKS = 5; // max poison stacks on one enemy
export const SLOW_TIME = 1.5;
export const ARMOR_MIN = 0.2; // armor can never block more than 80% of a hit
export const BLINK_EVERY = 4; // seconds between blinks (slowed enemies blink less often)
export const BOSS_WAVE_HEAL = 0.3; // share of lost lives given back when a boss wave is finished
export const BOSS_XP = 5; // a boss kill counts as 5 kills for tower experience
// Streak: every 5 waves in a row without losing a life adds +5% coins per kill, at most +25%.
export const STREAK_STEP = 5;
export const STREAK_BONUS = 0.05;
export const STREAK_MAX = 0.25;
// Interest: at the start of each wave, +2% of the coins you hold (no cap).
export const INTEREST_RATE = 0.02;
// Electric: the bolt jumps to the next enemies behind its target on the path, each at 70% damage,
// as long as the next one is at most 1.5 tiles further back along the path.
export const CHAIN_FALLOFF = 0.7;
export const CHAIN_GAP = 1.5;
// Summoner minions: share of the summoner's max HP.
export const MINION_HP = 0.15;

// ---------- boss powers ----------
// Each boss type has one extra power. Auras only affect normal enemies (not other bosses) and never stack.
export const AURA_RANGE = 2; // tiles around the boss
export const HASTE = 0.4; // Triangle boss: +40% speed
export const HEAL_AURA = 0.05; // Circle boss: share of max HP healed per second
// Diamond and Star bosses pulse instead of buffing all the time, so an enemy staying in the zone is not
// protected forever: a pulse gives a shield (no refill until the next pulse) or armor for a short time.
export const PULSE_EVERY = 5;
export const AURA_SHIELD = 0.5; // share of the enemy's max HP
export const AURA_ARMOR_TIME = 2.5; // seconds; the armor equals a normal Star's at that wave
export const TAUNT_RANGE = 3; // Square boss: towers this close must target it
export const STUN_RANGE = 1.5; // Hexagon boss: towers this close to where it lands stop...
export const STUN_TIME = 2; // ...for this long
export const PORTAL_EVERY = 6; // Octagon boss: seconds between two full enemies brought in
export const FIRST_POWER = 2; // seconds after a boss appears before its first pulse or portal

export const BOSS_POWER: Record<Kind, string> = {
  circle: 'Healing aura',
  diamond: 'Shield pulse',
  triangle: 'Haste aura',
  square: 'Taunt',
  star: 'Armor pulse',
  pentagon: 'Swarm',
  hexagon: 'Stun',
  octagon: 'Portal',
};

/** Radius of the zone drawn around a boss, for the powers that have one. */
export const BOSS_ZONE: Partial<Record<Kind, number>> = {
  circle: AURA_RANGE,
  diamond: AURA_RANGE,
  triangle: AURA_RANGE,
  square: TAUNT_RANGE,
  star: AURA_RANGE,
  pentagon: AURA_RANGE,
};

export interface TowerStats {
  name: string;
  attack: string;
  cost: number;
  range: number; // tiles
  rate: number; // attacks per second
  damage: number;
}

export const TOWERS: Record<Kind, TowerStats> = {
  circle: { name: 'Pulse', attack: 'hits all in range', cost: 60, range: 1.5, rate: 0.8, damage: 10 },
  diamond: { name: 'Flame', attack: 'cone + burn', cost: 80, range: 1.5, rate: 5, damage: 1.4 },
  triangle: { name: 'Rifle', attack: 'fast bullets', cost: 50, range: 2.1, rate: 2, damage: 3.4 },
  square: { name: 'Sniper', attack: 'long range, big hit', cost: 100, range: 4.9, rate: 0.5, damage: 25 },
  star: { name: 'Poison', attack: 'stacking poison', cost: 70, range: 2.1, rate: 1, damage: 5 },
  pentagon: { name: 'Piercer', attack: 'pierces enemies', cost: 45, range: 2.5, rate: 1.2, damage: 4 },
  hexagon: { name: 'Frost', attack: 'slows all in range', cost: 70, range: 1.5, rate: 1, damage: 5 },
  octagon: { name: 'Electric', attack: 'chain lightning', cost: 75, range: 2, rate: 0.9, damage: 7 },
};

// ---------- combos ----------

/** Stats a combo can boost. `dot` is damage over time (Flame burn, Poison stacks). */
export type ComboStat = 'damage' | 'rate' | 'range' | 'slow' | 'dot';
export type Bonus = Partial<Record<ComboStat, number>>;

/** Short names: they have to fit in the side panel. */
export const COMBO_STAT_LABEL: Record<ComboStat, string> = {
  damage: 'dmg',
  rate: 'rate',
  range: 'range',
  slow: 'slow',
  dot: 'DoT',
};

/** Each partner tower on one of the 8 tiles around a tower adds this much to the tower's combo stat. */
export const COMBO_PER_PARTNER = 0.1;

export interface Combo {
  name: string;
  /** The two partner kinds and the stat each one gets. */
  boosts: [Kind, ComboStat][];
}

// A ring: every tower kind is in exactly 2 combos.
export const COMBOS: Combo[] = [
  {
    name: 'Cold snap',
    boosts: [
      ['circle', 'damage'],
      ['hexagon', 'slow'],
    ],
  },
  {
    name: 'Thermal shock',
    boosts: [
      ['hexagon', 'rate'],
      ['diamond', 'damage'],
    ],
  },
  {
    name: 'Toxic fire',
    boosts: [
      ['diamond', 'dot'],
      ['star', 'dot'],
    ],
  },
  {
    name: 'Weak spot',
    boosts: [
      ['star', 'range'],
      ['square', 'damage'],
    ],
  },
  {
    name: 'Spotter',
    boosts: [
      ['square', 'rate'],
      ['triangle', 'range'],
    ],
  },
  {
    name: 'Crossfire',
    boosts: [
      ['triangle', 'rate'],
      ['pentagon', 'rate'],
    ],
  },
  {
    name: 'Conductor',
    boosts: [
      ['pentagon', 'damage'],
      ['octagon', 'damage'],
    ],
  },
  {
    name: 'Overcharge',
    boosts: [
      ['octagon', 'rate'],
      ['circle', 'range'],
    ],
  },
];

/** Kinds that are combo partners of `kind`, with the stat `kind` gets from each. */
export function comboPartners(kind: Kind): { partner: Kind; stat: ComboStat; combo: string }[] {
  return COMBOS.flatMap((c) => {
    const mine = c.boosts.find(([k]) => k === kind);
    const other = c.boosts.find(([k]) => k !== kind);
    return mine && other ? [{ partner: other[0], stat: mine[1], combo: c.name }] : [];
  });
}

/**
 * Stats at a level. Levels 1–10 add the same amount each, so that at level 10:
 * damage ×2, fire rate ×1.5 (so damage per second ×3), range ×1.3, pierce 3 → 9, slow 25% → 39%,
 * Electric jumps 2 → 8. Above level 10 only damage keeps growing (×1.1 per level), so towers can keep
 * up with enemy growth without firing absurdly fast or covering the whole map.
 * `bonus` comes from combo partners placed next to the tower.
 */
export function towerStats(kind: Kind, level: number, bonus: Bonus = {}) {
  const base = TOWERS[kind];
  const p = Math.min(1, (level - 1) / (CURVE_LEVELS - 1)); // 0 at level 1, 1 from level 10
  const late = Math.pow(LATE_LEVEL_DAMAGE, Math.max(0, level - CURVE_LEVELS));
  return {
    damage: base.damage * (1 + 1 * p) * late * (1 + (bonus.damage ?? 0)),
    rate: base.rate * (1 + 0.5 * p) * (1 + (bonus.rate ?? 0)),
    range: base.range * (1 + 0.3 * p) * (1 + (bonus.range ?? 0)),
    pierce: 3 + Math.floor(6 * p), // Piercer: enemies one arrow can hit
    slow: Math.min(0.8, (0.25 + 0.14 * p) * (1 + (bonus.slow ?? 0))), // Frost: speed reduction
    chains: 2 + Math.floor(6 * p), // Electric: extra enemies hit after the target
    dot: 1 + (bonus.dot ?? 0), // multiplier for burn and poison
  };
}

/** Coins to go from `level` to `level + 1`; each level costs 35% more than the previous one. */
export const upgradeCost = (kind: Kind, level: number) =>
  Math.round(TOWERS[kind].cost * 0.6 * Math.pow(1.35, level - 1));

/** Kills needed to go from `level` to `level + 1` for free: 10, 25, 60, 147, 360, ... */
export const xpNeeded = (level: number) => Math.round(10 * Math.pow(2.45, level - 1));

/** Light shade at level 1, darker with every level up to level 10. */
export const towerColor = (kind: Kind, level: number) =>
  `hsl(${HUE[kind]}, 85%, ${82 - (Math.min(level, CURVE_LEVELS) - 1) * 5.5}%)`;
export const enemyColor = (kind: Kind) => `hsl(${HUE[kind]}, 80%, 72%)`;

interface EnemyBase {
  power: string;
  hp: number;
  speed: number; // tiles per second
  reward: number;
  lives: number; // lives lost if it reaches the end (×5 for a boss)
  regen?: number; // hp per second
  shield?: number;
  armor?: number; // flat damage removed from every direct hit
  summon?: number; // seconds between two minions
}

export const ENEMIES: Record<Kind, EnemyBase> = {
  circle: { power: 'Regeneration', hp: 26, speed: 1.4, reward: 4, lives: 1, regen: 1.5 },
  diamond: { power: 'Shield', hp: 26, speed: 1.4, reward: 5, lives: 2, shield: 22 },
  triangle: { power: 'Speed', hp: 22, speed: 3.6, reward: 5, lives: 1 },
  square: { power: 'Tank', hp: 180, speed: 0.95, reward: 8, lives: 3 },
  star: { power: 'Armor', hp: 50, speed: 1.5, reward: 6, lives: 2, armor: 5 },
  pentagon: { power: 'Splitter', hp: 42, speed: 1.6, reward: 4, lives: 1 },
  hexagon: { power: 'Blink', hp: 34, speed: 1.7, reward: 6, lives: 2 },
  octagon: { power: 'Summoner', hp: 55, speed: 1.4, reward: 6, lives: 2, summon: 2 },
};

export interface EnemyStats {
  hp: number;
  shield: number;
  regen: number;
  armor: number;
  speed: number;
  reward: number;
  lives: number;
  splits: number; // copies spawned on death
  blink: number; // tiles jumped forward every BLINK_EVERY seconds
  summon: number; // seconds between minions (0 = never)
}
