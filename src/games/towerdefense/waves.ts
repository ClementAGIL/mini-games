// Wave schedule for Tower Defense: timing, size, enemy mix, growth of enemy stats and bosses.
import { randInt, shuffle } from '../../engine/math';
import { ENEMIES, KINDS, type EnemyStats, type Kind } from './data';
import type { QueuedEnemy } from './model';

export const MIN_WAVE_TIME = 30; // seconds until the next wave, with the fewest enemies (wave 1)
export const MAX_WAVE_TIME = 60; // ... and with the most enemies (wave 35+)
export const MAX_ENEMIES = 75;
export const FIRST_WAVE_DELAY = 20;
export const CLEARED_DELAY = 2; // short breather once every enemy is gone, then the next wave starts

/** 5 waves after the last type is introduced (wave 41): from here the growth rate steps up every 10 waves. */
export const GROWTH_START = 5 * KINDS.length + 1;
export const EARLY_GROWTH = 0.02;
export const MAX_GROWTH = 0.05;

/** Growth applied at one wave: ×1.02 until wave 60, then ×1.03, ×1.04, capped at ×1.05 from wave 81. */
export function growthRate(wave: number) {
  if (wave < GROWTH_START) return EARLY_GROWTH;
  const stepped = 0.01 * (1 + Math.floor((wave - GROWTH_START) / 10));
  return Math.min(MAX_GROWTH, Math.max(EARLY_GROWTH, stepped));
}

/** Enemy stat multiplier for a wave (×1 at wave 1, ≈×2 at wave 35). */
export function growth(wave: number) {
  let g = 1;
  for (let w = 2; w <= wave; w++) g *= 1 + growthRate(w);
  return g;
}

export function enemyStats(kind: Kind, wave: number, boss: boolean): EnemyStats {
  const b = ENEMIES[kind];
  const g = growth(wave);
  // Special powers grow with the square root of the HP growth: armor, shields and splits scaling as fast as HP
  // made a sudden wall (tower hits stop growing, so flat armor ends up blocking almost everything).
  const pg = Math.sqrt(g);
  // Early bosses are weaker: 60% strength at wave 5, 80% at wave 10, full strength from wave 15.
  const bossScale = Math.min(1, 0.4 + 0.04 * wave);
  const bossHp = boss ? 10 * bossScale : 1;
  const powerMul = boss ? 5 * bossScale : 1;
  return {
    hp: b.hp * g * bossHp,
    shield: (b.shield ?? 0) * pg * powerMul,
    regen: (b.regen ?? 0) * pg * powerMul,
    armor: (b.armor ?? 0) * pg * (boss ? 2 * bossScale : 1),
    speed: b.speed * Math.min(pg, 2) * (boss ? 0.75 : 1),
    reward: (b.reward + Math.floor(wave / 4)) * (boss ? 10 : 1),
    lives: b.lives * (boss ? 5 : 1),
    splits: kind === 'pentagon' ? (boss ? 3 : 2) + Math.floor((pg - 1) / 0.5) : 0,
    blink: kind === 'hexagon' ? 2 * Math.min(pg, 2) * (boss ? 1.5 : 1) : 0,
    summon: b.summon ? (b.summon / Math.min(pg, 2)) * (boss ? 0.5 : 1) : 0,
  };
}

export const waveKinds = (wave: number) => KINDS.slice(0, Math.min(KINDS.length, 1 + Math.floor((wave - 1) / 5)));
// The enemy count keeps rising until wave 35 (75 enemies), then only stats grow.
export const waveCount = (wave: number) => Math.min(MAX_ENEMIES, 5 + wave * 2);

/** Time before the next wave grows with the enemy count: 30 s at wave 1, 60 s from 75 enemies (wave 35). */
export function waveTime(wave: number) {
  const t = (waveCount(wave) - waveCount(1)) / (MAX_ENEMIES - waveCount(1));
  return MIN_WAVE_TIME + (MAX_WAVE_TIME - MIN_WAVE_TIME) * t;
}
export const spawnGap = (wave: number) => Math.max(0.35, 0.9 - wave * 0.02);

/** Enemy types of a wave (bosses excluded), in spawn order. */
export function waveEnemies(wave: number): Kind[] {
  const count = waveCount(wave);
  const kinds = waveKinds(wave);
  if (wave < GROWTH_START) {
    // Intro waves: every 3rd enemy is the newest type, the rest random among unlocked types.
    return Array.from({ length: count }, (_, i) =>
      i % 3 === 0 ? kinds[kinds.length - 1] : kinds[randInt(0, kinds.length - 1)],
    );
  }
  // All types introduced: a random share per type each wave. `spread` picks how lopsided the wave is:
  // 0 gives an even mix, 2 lets one or two types dominate.
  const spread = Math.random() * 2;
  const weights = kinds.map(() => Math.pow(-Math.log(1 - Math.random()), spread));
  const total = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / total) * count);
  const counts = exact.map(Math.floor);
  // Give the leftover enemies to the largest fractions, so counts are whole numbers adding up to `count`.
  const left = count - counts.reduce((a, b) => a + b, 0);
  exact
    .map((e, i) => ({ frac: e - counts[i], i }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, left)
    .forEach(({ i }) => counts[i]++);
  return shuffle(kinds.flatMap((k, i) => Array<Kind>(counts[i]).fill(k)));
}

/**
 * Bosses on every 5th wave: 1 boss of each type in intro order, then every pair of types,
 * every triple, ... up to all types together, then one more boss each time, rotating types.
 */
export function bossKinds(wave: number): Kind[] {
  if (wave % 5) return [];
  let i = wave / 5 - 1;
  for (let k = 1; k <= KINDS.length; k++) {
    const combos = combinations(KINDS, k);
    if (i < combos.length) return combos[i];
    i -= combos.length;
  }
  const count = KINDS.length + 1 + Math.floor(i / KINDS.length);
  return Array.from({ length: count }, (_, j) => KINDS[(i + j) % KINDS.length]);
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]));
}

/** The enemies of a wave in spawn order. One boss closes the wave; several are spread evenly from the
 * first enemy to the last, so two big bosses never have to be fought at the same time. */
export function makeQueue(wave: number): QueuedEnemy[] {
  const queue = waveEnemies(wave).map((kind) => ({ kind, boss: false }));
  const bosses = bossKinds(wave);
  bosses.forEach((kind, j) => {
    const at = bosses.length === 1 ? queue.length : Math.round((j / (bosses.length - 1)) * queue.length);
    queue.splice(at + j, 0, { kind, boss: true }); // + j: bosses already inserted before this spot
  });
  return queue;
}
