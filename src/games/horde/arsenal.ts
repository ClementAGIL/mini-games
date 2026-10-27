// Weapon tables for Polygon Horde (stats per level, evolutions) and the final stats once stat bonuses are applied.
import type { StatKind } from './data';

export type WeaponKind =
  | 'dart'
  | 'orbit'
  | 'pulse'
  | 'lance'
  | 'mine'
  | 'shard'
  | 'boomerang'
  | 'chain'
  | 'flamer'
  | 'saw'
  | 'frost'
  | 'meteor'
  | 'whip'
  | 'homing'
  | 'blackhole'
  | 'lighthouse'
  | 'shotgun';

/**
 * One level of a weapon. `size` is a radius or a length depending on the weapon (projectile, orbit, ring, beam, blast,
 * range); `extra` is pierce, bounces or jumps. For contact weapons (Orbit, Lighthouse) `cooldown` is the delay before
 * the same enemy can be hit again. Flamer `damage` is burn damage per second.
 */
export interface WeaponStats {
  damage: number;
  cooldown: number;
  count: number;
  size: number;
  extra: number;
}

export interface WeaponDef {
  name: string;
  text: string;
  /** Names of `count`, `size`, `extra` shown on the level-up cards ('' = not shown). */
  labels: [string, string, string];
  pierce: boolean; // the Pierce stat adds to `extra`
  levels: WeaponStats[];
  evo: { stat: StatKind; name: string; stats: WeaponStats };
}

const s = (damage: number, cooldown: number, count: number, size: number, extra = 0): WeaponStats => ({
  damage,
  cooldown,
  count,
  size,
  extra,
});

export const WEAPONS: Record<WeaponKind, WeaponDef> = {
  dart: {
    name: 'Dart',
    text: 'Fires at the nearest enemy',
    labels: ['Darts', '', 'Pierce'],
    pierce: true,
    levels: [s(15, 0.8, 1, 5), s(21, 0.8, 1, 5), s(21, 0.7, 2, 5), s(30, 0.7, 2, 6, 1), s(36, 0.6, 3, 6, 1)],
    evo: { stat: 'haste', name: 'Storm', stats: s(39, 0.3, 3, 6, 2) },
  },
  orbit: {
    name: 'Orbit',
    text: 'Squares circle around you',
    labels: ['Squares', 'Radius', ''],
    pierce: false,
    levels: [s(8, 0.5, 2, 55), s(10, 0.5, 3, 55), s(14, 0.45, 3, 65), s(18, 0.45, 4, 65), s(24, 0.4, 5, 75)],
    evo: { stat: 'area', name: 'Halo', stats: s(36, 0.3, 8, 90) },
  },
  pulse: {
    name: 'Pulse',
    text: 'Damaging ring that pushes enemies back',
    labels: ['', 'Radius', ''],
    pierce: false,
    levels: [s(15, 3, 1, 90), s(20, 2.8, 1, 100), s(26, 2.6, 1, 110), s(34, 2.4, 1, 120), s(44, 2.2, 1, 140)],
    evo: { stat: 'regen', name: 'Lifewave', stats: s(60, 1.8, 1, 170) },
  },
  lance: {
    name: 'Lance',
    text: 'Piercing beam where you move',
    labels: ['Beams', 'Length', ''],
    pierce: false,
    levels: [s(20, 1.6, 1, 240), s(28, 1.5, 1, 260), s(34, 1.4, 2, 260), s(44, 1.3, 2, 290), s(56, 1.2, 3, 300)],
    evo: { stat: 'pierce', name: 'Railgun', stats: s(90, 0.9, 4, 420) },
  },
  mine: {
    name: 'Mine',
    text: 'Dropped where you stand, explodes',
    labels: ['Mines', 'Blast', ''],
    pierce: false,
    levels: [s(24, 1.5, 1, 60), s(32, 1.4, 1, 65), s(40, 1.3, 1, 70), s(52, 1.2, 2, 75), s(64, 1, 2, 85)],
    evo: { stat: 'damage', name: 'Minefield', stats: s(88, 0.7, 3, 100) },
  },
  shard: {
    name: 'Shard',
    text: 'Star bouncing between enemies',
    labels: ['Stars', '', 'Bounces'],
    pierce: true,
    levels: [s(12, 2, 1, 7, 2), s(15, 1.9, 1, 7, 3), s(18, 1.8, 2, 7, 4), s(22, 1.6, 2, 8, 5), s(28, 1.4, 3, 8, 7)],
    evo: { stat: 'speed', name: 'Comet', stats: s(40, 1, 4, 10, 10) },
  },
  boomerang: {
    name: 'Boomerang',
    text: 'Thrown out, comes back, hits twice',
    labels: ['Boomerangs', 'Range', ''],
    pierce: false,
    levels: [s(14, 1.6, 1, 170), s(18, 1.5, 1, 180), s(22, 1.4, 2, 190), s(28, 1.3, 2, 200), s(36, 1.2, 3, 220)],
    evo: { stat: 'magnet', name: 'Moonblade', stats: s(50, 0.9, 4, 260) },
  },
  chain: {
    name: 'Chain',
    text: 'Lightning jumping between enemies',
    labels: ['Bolts', '', 'Jumps'],
    pierce: true,
    levels: [s(16, 1.4, 1, 0, 3), s(20, 1.3, 1, 0, 4), s(24, 1.2, 2, 0, 4), s(30, 1.1, 2, 0, 5), s(38, 1, 3, 0, 6)],
    evo: { stat: 'luck', name: 'Tempest', stats: s(55, 0.7, 4, 0, 8) },
  },
  flamer: {
    name: 'Flamer',
    text: 'Short cone of fire, burns over time',
    labels: ['Flames', 'Range', ''],
    pierce: false,
    levels: [s(10, 0.25, 1, 110), s(14, 0.22, 2, 120), s(18, 0.2, 2, 130), s(24, 0.18, 3, 140), s(30, 0.15, 3, 160)],
    evo: { stat: 'damage', name: 'Inferno', stats: s(50, 0.12, 4, 190) },
  },
  saw: {
    name: 'Saw',
    text: 'Gear bouncing on the screen edges',
    labels: ['Saws', 'Size', ''],
    pierce: false,
    levels: [s(12, 3, 1, 9), s(15, 2.8, 1, 10), s(18, 2.6, 2, 10), s(23, 2.4, 2, 11), s(30, 2.2, 3, 12)],
    evo: { stat: 'speed', name: 'Buzzsaw', stats: s(45, 1.8, 4, 15) },
  },
  frost: {
    name: 'Frost',
    text: 'Icy ring that slows enemies',
    labels: ['', 'Radius', ''],
    pierce: false,
    levels: [s(5, 4, 1, 100), s(7, 3.7, 1, 115), s(9, 3.4, 1, 130), s(12, 3.1, 1, 145), s(15, 2.8, 1, 165)],
    evo: { stat: 'area', name: 'Blizzard', stats: s(25, 2.2, 1, 220) },
  },
  meteor: {
    name: 'Meteor',
    text: 'Falls on enemies after a warning',
    labels: ['Meteors', 'Blast', ''],
    pierce: false,
    levels: [s(32, 2.5, 1, 50), s(40, 2.4, 1, 55), s(48, 2.3, 2, 60), s(60, 2.1, 2, 65), s(72, 1.9, 3, 75)],
    evo: { stat: 'luck', name: 'Starfall', stats: s(104, 1.4, 5, 85) },
  },
  whip: {
    name: 'Whip',
    text: 'Wide slash to your sides',
    labels: ['Sides', 'Length', ''],
    pierce: false,
    levels: [s(18, 1.3, 1, 110), s(24, 1.25, 1, 120), s(30, 1.2, 2, 130), s(38, 1.1, 2, 140), s(48, 1, 2, 160)],
    evo: { stat: 'regen', name: 'Bloodlash', stats: s(70, 0.8, 2, 190) },
  },
  homing: {
    name: 'Homing',
    text: 'Seeking missile that explodes',
    labels: ['Missiles', 'Blast', ''],
    pierce: false,
    levels: [s(20, 1.8, 1, 30), s(26, 1.7, 1, 32), s(32, 1.6, 2, 34), s(40, 1.5, 2, 38), s(50, 1.4, 3, 42)],
    evo: { stat: 'luck', name: 'Swarm', stats: s(60, 0.9, 5, 48) },
  },
  blackhole: {
    name: 'Black hole',
    text: 'Pulls enemies in and crushes them',
    labels: ['', 'Radius', ''],
    pierce: false,
    levels: [s(8, 6, 1, 80), s(10, 5.6, 1, 90), s(13, 5.2, 1, 100), s(16, 4.8, 1, 110), s(20, 4.4, 1, 125)],
    evo: { stat: 'magnet', name: 'Singularity', stats: s(32, 3.6, 1, 160) },
  },
  lighthouse: {
    name: 'Lighthouse',
    text: 'Beam sweeping around you',
    labels: ['Beams', 'Length', ''],
    pierce: false,
    levels: [s(10, 0.5, 1, 150), s(13, 0.5, 1, 165), s(16, 0.45, 2, 180), s(20, 0.45, 2, 195), s(26, 0.4, 3, 210)],
    evo: { stat: 'pierce', name: 'Beacon', stats: s(40, 0.3, 4, 260) },
  },
  shotgun: {
    name: 'Shotgun',
    text: 'Burst of pellets at close range',
    labels: ['Pellets', 'Range', 'Pierce'],
    pierce: true,
    levels: [s(14, 1.2, 5, 160), s(18, 1.15, 6, 170), s(22, 1.1, 7, 180), s(28, 1, 8, 190), s(34, 0.9, 9, 200)],
    evo: { stat: 'haste', name: 'Scattergun', stats: s(44, 0.5, 12, 220) },
  },
};

export const WEAPON_KINDS = Object.keys(WEAPONS) as WeaponKind[];

/** Stat bonuses summed over the run (fractions for %, plain numbers otherwise). */
export type Mods = Record<StatKind, number>;

/** Stats of a weapon at a level (or evolved), before stat bonuses. */
export function baseStats(kind: WeaponKind, level: number, evolved: boolean): WeaponStats {
  const def = WEAPONS[kind];
  return evolved ? def.evo.stats : def.levels[level - 1];
}

/**
 * Final stats: Might multiplies damage, Haste divides cooldowns, Area grows sizes, Pierce adds to `extra`;
 * `bonusCount` (Twin core) adds to the count of weapons that have one.
 */
export function weaponStats(
  kind: WeaponKind,
  level: number,
  evolved: boolean,
  mods: Mods,
  bonusCount = 0,
): WeaponStats {
  const b = baseStats(kind, level, evolved);
  return {
    damage: b.damage * (1 + mods.damage),
    cooldown: b.cooldown / (1 + mods.haste),
    count: b.count + (WEAPONS[kind].labels[0] ? bonusCount : 0),
    size: b.size * (1 + mods.area),
    extra: b.extra + (WEAPONS[kind].pierce ? mods.pierce : 0),
  };
}

export function weaponName(kind: WeaponKind, evolved: boolean) {
  return evolved ? WEAPONS[kind].evo.name : WEAPONS[kind].name;
}
