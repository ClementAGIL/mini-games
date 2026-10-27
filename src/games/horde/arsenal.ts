// Weapon tables for Polygon Horde (stats per level, evolutions) and the final stats once item bonuses are applied.
import type { ItemKind } from './data';

export type WeaponKind = 'dart' | 'orbit' | 'pulse' | 'lance' | 'mine' | 'shard';

/**
 * One level of a weapon. `size` is the projectile radius (Dart, Shard), the orbit or pulse radius, the beam length
 * (Lance) or the blast radius (Mine). `extra` is pierce (Dart) or bounces (Shard). For Orbit, `cooldown` is the delay
 * before a square can hit the same enemy again.
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
  pierce: boolean; // Needle adds to `extra`
  levels: WeaponStats[];
  evo: { item: ItemKind; name: string; stats: WeaponStats };
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
    levels: [s(10, 0.8, 1, 5), s(14, 0.8, 1, 5), s(14, 0.7, 2, 5), s(20, 0.7, 2, 6, 1), s(24, 0.6, 3, 6, 1)],
    evo: { item: 'clock', name: 'Storm', stats: s(26, 0.3, 3, 6, 2) },
  },
  orbit: {
    name: 'Orbit',
    text: 'Squares circle around you',
    labels: ['Squares', 'Radius', ''],
    pierce: false,
    levels: [s(8, 0.5, 2, 55), s(10, 0.5, 3, 55), s(14, 0.45, 3, 65), s(18, 0.45, 4, 65), s(24, 0.4, 5, 75)],
    evo: { item: 'lens', name: 'Halo', stats: s(36, 0.3, 8, 90) },
  },
  pulse: {
    name: 'Pulse',
    text: 'Damaging ring that pushes enemies back',
    labels: ['', 'Radius', ''],
    pierce: false,
    levels: [s(15, 3, 1, 90), s(20, 2.8, 1, 100), s(26, 2.6, 1, 110), s(34, 2.4, 1, 120), s(44, 2.2, 1, 140)],
    evo: { item: 'heart', name: 'Lifewave', stats: s(60, 1.8, 1, 170) },
  },
  lance: {
    name: 'Lance',
    text: 'Piercing beam where you move',
    labels: ['Beams', 'Length', ''],
    pierce: false,
    levels: [s(20, 1.6, 1, 240), s(28, 1.5, 1, 260), s(34, 1.4, 2, 260), s(44, 1.3, 2, 290), s(56, 1.2, 3, 300)],
    evo: { item: 'needle', name: 'Railgun', stats: s(90, 0.9, 4, 420) },
  },
  mine: {
    name: 'Mine',
    text: 'Dropped where you stand, explodes',
    labels: ['Mines', 'Blast', ''],
    pierce: false,
    levels: [s(30, 1.5, 1, 60), s(40, 1.4, 1, 65), s(50, 1.3, 1, 70), s(65, 1.2, 2, 75), s(80, 1, 2, 85)],
    evo: { item: 'blade', name: 'Minefield', stats: s(110, 0.7, 3, 100) },
  },
  shard: {
    name: 'Shard',
    text: 'Star bouncing between enemies',
    labels: ['Stars', '', 'Bounces'],
    pierce: true,
    levels: [s(12, 2, 1, 7, 2), s(15, 1.9, 1, 7, 3), s(18, 1.8, 2, 7, 4), s(22, 1.6, 2, 8, 5), s(28, 1.4, 3, 8, 7)],
    evo: { item: 'boots', name: 'Comet', stats: s(40, 1, 4, 10, 10) },
  },
};

export const WEAPON_KINDS = Object.keys(WEAPONS) as WeaponKind[];

/** Item bonuses summed over the inventory, by item kind (fractions for %, plain numbers otherwise). */
export type Mods = Record<ItemKind, number>;

/** Stats of a weapon at a level (or evolved), before item bonuses. */
export function baseStats(kind: WeaponKind, level: number, evolved: boolean): WeaponStats {
  const def = WEAPONS[kind];
  return evolved ? def.evo.stats : def.levels[level - 1];
}

/** Final stats: Blade multiplies damage, Clock divides cooldowns, Lens grows sizes, Needle adds pierce. */
export function weaponStats(kind: WeaponKind, level: number, evolved: boolean, mods: Mods): WeaponStats {
  const b = baseStats(kind, level, evolved);
  return {
    damage: b.damage * (1 + mods.blade),
    cooldown: b.cooldown / (1 + mods.clock),
    count: b.count,
    size: b.size * (1 + mods.lens),
    extra: b.extra + (WEAPONS[kind].pierce ? mods.needle : 0),
  };
}

export function weaponName(kind: WeaponKind, evolved: boolean) {
  return evolved ? WEAPONS[kind].evo.name : WEAPONS[kind].name;
}
