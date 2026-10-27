// Tower attacks: targeting, each tower's attack, projectiles and damage (including shields, armor and stats).
import { angleDiff, dist, type Vec } from '../../engine/math';
import {
  ARMOR_MIN,
  BURN_TIME,
  CHAIN_FALLOFF,
  CHAIN_GAP,
  OTHER_SHAPE_MULT,
  POISON_STACKS,
  POISON_TIME,
  SAME_SHAPE_MULT,
  SLOW_TIME,
  TAUNT_RANGE,
  towerStats,
  type Kind,
} from './data';
import type { TdGame } from './game';
import type { Enemy, Tower } from './model';

const BULLET_SPEED = 12; // tiles/s
const ARROW_SPEED = 10;
export const FLAME_CONE = 0.6; // half-angle in radians

type Stats = ReturnType<typeof towerStats>;

/** What one shot of a tower does. `c` is the tower's center, `inRange` every living enemy in range. */
type Attack = (game: TdGame, t: Tower, c: Vec, st: Stats, target: Enemy, inRange: Enemy[]) => void;

const ATTACKS: Record<Kind, Attack> = {
  // Pulse: hits everything in range.
  circle: (game, t, c, st, _target, inRange) => {
    for (const e of inRange) damage(game, e, st.damage, t);
    game.fx.push({ type: 'ring', pos: c, range: st.range, kind: t.kind, life: 0.25 });
  },
  // Frost: small damage and a slow on everything in range.
  hexagon: (game, t, c, st, _target, inRange) => {
    for (const e of inRange) {
      damage(game, e, st.damage, t);
      e.slow = e.slowTime > 0 ? Math.max(e.slow, st.slow) : st.slow;
      e.slowTime = SLOW_TIME;
    }
    game.fx.push({ type: 'ring', pos: c, range: st.range, kind: t.kind, life: 0.25 });
  },
  // Flame: everything in a cone toward the target, plus a burn.
  diamond: (game, t, c, st, _target, inRange) => {
    for (const e of inRange) {
      if (Math.abs(angleDiff(Math.atan2(e.pos.y - c.y, e.pos.x - c.x), t.angle)) > FLAME_CONE) continue;
      damage(game, e, st.damage, t);
      e.burn = Math.max(e.burn, st.damage * st.dot * shapeMult(t.kind, e.kind));
      e.burnTime = BURN_TIME;
      e.burnBy = t;
    }
    game.fx.push({ type: 'cone', pos: c, angle: t.angle, range: st.range, life: 0.12 });
  },
  // Rifle and Poison: homing projectile (the poison is applied on hit).
  triangle: (game, t, c, st, target) => game.bullets.push({ pos: { ...c }, target, damage: st.damage, tower: t }),
  star: (game, t, c, st, target) => game.bullets.push({ pos: { ...c }, target, damage: st.damage, tower: t }),
  // Piercer: straight arrow through several enemies.
  pentagon: (game, t, c, st) =>
    game.arrows.push({
      pos: { ...c },
      dir: { x: Math.cos(t.angle), y: Math.sin(t.angle) },
      left: st.range + 1,
      damage: st.damage,
      pierce: st.pierce,
      hit: new Set(),
      tower: t,
    }),
  // Sniper: instant hit.
  square: (game, t, c, st, target) => {
    damage(game, target, st.damage, t);
    game.fx.push({ type: 'line', from: c, to: { ...target.pos }, life: 0.12 });
  },
  octagon: (game, t, c, st, target) => chainLightning(game, t, c, st, target),
};

export function updateTower(game: TdGame, t: Tower, dt: number) {
  if (t.stun > 0) {
    t.stun -= dt;
    return;
  }
  t.cooldown -= dt;
  if (t.cooldown > 0) return;
  const st = towerStats(t.kind, t.level, t.bonus);
  const c = { x: t.tx + 0.5, y: t.ty + 0.5 };
  const inRange = game.enemies.filter((e) => e.hp > 0 && dist(c, e.pos) <= st.range);
  if (!inRange.length) return;
  const target = pickTarget(t, c, inRange);
  t.angle = Math.atan2(target.pos.y - c.y, target.pos.x - c.x);
  t.cooldown = 1 / st.rate;
  ATTACKS[t.kind](game, t, c, st, target, inRange);
}

/**
 * A Square boss close enough taunts the tower: it must be the target. Otherwise First: furthest along the path,
 * Nearest: closest to the tower, Own shape: first enemy of the tower's shape, else first.
 */
function pickTarget(t: Tower, c: Vec, inRange: Enemy[]): Enemy {
  const taunt = inRange.find((e) => e.boss && e.kind === 'square' && dist(c, e.pos) <= TAUNT_RANGE);
  if (taunt) return taunt;
  const first = (list: Enemy[]) => list.reduce((a, b) => (b.d > a.d ? b : a));
  if (t.mode === 'nearest') return inRange.reduce((a, b) => (dist(c, b.pos) < dist(c, a.pos) ? b : a));
  if (t.mode === 'shape') {
    const same = inRange.filter((e) => e.kind === t.kind);
    if (same.length) return first(same);
  }
  return first(inRange);
}

// Electric: full damage to the target, then 70% to each next enemy behind it on the path,
// as long as it is at most CHAIN_GAP tiles further back than the previous one.
function chainLightning(game: TdGame, t: Tower, c: Vec, st: Stats, target: Enemy) {
  const behind = game.enemies.filter((e) => e !== target && e.hp > 0 && e.d <= target.d).sort((a, b) => b.d - a.d);
  const hits = [target];
  for (const e of behind) {
    if (hits.length > st.chains || hits[hits.length - 1].d - e.d > CHAIN_GAP) break;
    hits.push(e);
  }
  hits.forEach((e, i) => damage(game, e, i === 0 ? st.damage : st.damage * CHAIN_FALLOFF, t));
  game.fx.push({ type: 'chain', points: [c, ...hits.map((e) => ({ ...e.pos }))], life: 0.15 });
}

export function updateBullets(game: TdGame, dt: number) {
  const step = BULLET_SPEED * dt;
  game.bullets = game.bullets.filter((b) => {
    const e = b.target;
    if (e.hp <= 0) return false;
    const d = dist(b.pos, e.pos);
    if (d > step) {
      b.pos.x += ((e.pos.x - b.pos.x) / d) * step;
      b.pos.y += ((e.pos.y - b.pos.y) / d) * step;
      return true;
    }
    damage(game, e, b.damage, b.tower);
    if (b.tower.kind === 'star') addPoison(e, b.damage, b.tower);
    return false;
  });
}

// Each Poison dart adds one stack (damage per second = dart damage), up to POISON_STACKS.
function addPoison(e: Enemy, dartDamage: number, tower: Tower) {
  const dps = dartDamage * (1 + (tower.bonus.dot ?? 0)) * shapeMult('star', e.kind);
  e.poison = Math.min(e.poison + dps, dps * POISON_STACKS);
  e.poisonTime = POISON_TIME;
  e.poisonBy = tower;
}

export function updateArrows(game: TdGame, dt: number) {
  const step = ARROW_SPEED * dt;
  game.arrows = game.arrows.filter((a) => {
    a.pos.x += a.dir.x * step;
    a.pos.y += a.dir.y * step;
    a.left -= step;
    for (const e of game.enemies) {
      if (a.pierce <= 0 || e.hp <= 0 || a.hit.has(e)) continue;
      if (dist(a.pos, e.pos) > (e.boss ? 0.55 : 0.4)) continue;
      damage(game, e, a.damage, a.tower);
      a.hit.add(e);
      a.pierce--;
    }
    return a.left > 0 && a.pierce > 0;
  });
}

/**
 * A direct hit: shape multiplier, then shields absorb (the Diamond boss's one first, then the enemy's own),
 * then armor (own + Star boss pulse) reduces what is left.
 */
export function damage(game: TdGame, e: Enemy, amount: number, from: Tower) {
  let d = amount * shapeMult(from.kind, e.kind);
  const fromAura = Math.min(e.auraShield, d);
  e.auraShield -= fromAura;
  const absorbed = fromAura + Math.min(e.shield, d - fromAura);
  e.shield -= absorbed - fromAura;
  d -= absorbed;
  const armor = e.armor + (e.auraArmorTime > 0 ? e.auraArmor : 0);
  if (armor > 0) d = Math.max(d * ARMOR_MIN, d - armor);
  e.hp -= d;
  e.lastHit = game.time;
  addDamageStat(game, e, from, absorbed + d);
}

/** Damage over time (burn, poison): ignores shield and armor, which is what makes Poison the counter to Armor. */
export function dotDamage(game: TdGame, e: Enemy, amount: number, from: Tower | null) {
  e.hp -= amount;
  if (from) addDamageStat(game, e, from, amount);
}

/** Totals for the tower and the game-over summary, and the tower's share of this enemy's XP. */
function addDamageStat(game: TdGame, e: Enemy, from: Tower, amount: number) {
  e.hits.set(from, (e.hits.get(from) ?? 0) + amount);
  from.damageDone += amount;
  game.stats.damage[from.kind] = (game.stats.damage[from.kind] ?? 0) + amount;
}

function shapeMult(tower: Kind, enemy: Kind) {
  return tower === enemy ? SAME_SHAPE_MULT : OTHER_SHAPE_MULT;
}
