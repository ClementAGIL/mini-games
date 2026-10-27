// Enemy life cycle: spawning from the wave queues, effects over time, movement and powers, leaking and dying.
import { dist, pick, type Vec } from '../../engine/math';
import {
  AURA_RANGE,
  BLINK_EVERY,
  BOSS_XP,
  FIRST_POWER,
  MINION_HP,
  PORTAL_EVERY,
  SHIELD_DELAY,
  STUN_RANGE,
  STUN_TIME,
  type EnemyStats,
  type Kind,
} from './data';
import { dotDamage } from './combat';
import type { TdGame } from './game';
import type { Enemy } from './model';
import { enemyStats, spawnGap, waveKinds } from './waves';

export function spawnEnemy(
  game: TdGame,
  kind: Kind,
  wave: number,
  boss: boolean,
  stats: EnemyStats,
  d = 0,
  small = false,
) {
  game.enemies.push({
    ...stats,
    kind,
    wave,
    boss,
    small,
    pos: game.posAt(d),
    d,
    maxHp: stats.hp,
    maxShield: stats.shield,
    lastHit: -Infinity,
    burn: 0,
    burnTime: 0,
    poison: 0,
    poisonTime: 0,
    slow: 0,
    slowTime: 0,
    blinkTimer: BLINK_EVERY,
    summonTimer: stats.summon,
    powerTimer: FIRST_POWER,
    haste: 0,
    heal: 0,
    auraShield: 0,
    auraArmor: 0,
    auraArmorTime: 0,
    leaked: false,
    lastTower: null,
    burnBy: null,
    poisonBy: null,
  });
}

export function updateSpawners(game: TdGame, dt: number) {
  for (const s of game.spawners) {
    s.timer -= dt;
    if (s.timer > 0 || !s.queue.length) continue;
    const { kind, boss } = s.queue.shift()!;
    spawnEnemy(game, kind, s.wave, boss, enemyStats(kind, s.wave, boss));
    s.timer = s.queue[0]?.boss ? 1.5 : spawnGap(s.wave);
  }
  game.spawners = game.spawners.filter((s) => s.queue.length);
}

export function updateEnemies(game: TdGame, dt: number) {
  // A copy: summoners add enemies while we iterate.
  for (const e of [...game.enemies]) {
    applyEffects(game, e, dt);
    moveEnemy(game, e, dt);
  }
}

/** Burn, poison, regeneration (own and from a Circle boss), shield refill and Star boss armor running out. */
function applyEffects(game: TdGame, e: Enemy, dt: number) {
  if (e.burnTime > 0) {
    e.burnTime -= dt;
    dotDamage(game, e, e.burn * dt, e.burnBy);
  } else e.burn = 0;
  if (e.poisonTime > 0) {
    e.poisonTime -= dt;
    dotDamage(game, e, e.poison * dt, e.poisonBy);
  } else e.poison = 0;
  if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + (e.regen + e.heal * e.maxHp) * dt);
  e.auraArmorTime -= dt;
  if (game.time - e.lastHit > SHIELD_DELAY) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.5 * dt);
}

/** Walks along the path (slower when slowed, faster near a Triangle boss), blinks, summons, and leaks at the end. */
function moveEnemy(game: TdGame, e: Enemy, dt: number) {
  const end = game.path.length - 1;
  const pace = e.slowTime > 0 ? 1 - e.slow : 1;
  e.slowTime -= dt;
  e.d += e.speed * (1 + e.haste) * pace * dt;
  if (e.blink > 0 && (e.blinkTimer -= dt * pace) <= 0) {
    e.blinkTimer = BLINK_EVERY;
    const from = e.pos;
    e.d = Math.min(e.d + e.blink, end);
    game.fx.push({ type: 'line', from, to: game.posAt(e.d), life: 0.25 });
    if (e.boss) stunTowers(game, game.posAt(e.d));
  }
  if (e.summon > 0 && e.hp > 0 && (e.summonTimer -= dt) <= 0) {
    e.summonTimer = e.summon;
    summonMinion(game, e);
  }
  if (e.boss && e.kind === 'octagon' && (e.powerTimer -= dt) <= 0) {
    e.powerTimer = PORTAL_EVERY;
    openPortal(game, e);
  }
  if (e.d >= end) return leak(game, e);
  e.pos = game.posAt(e.d);
}

function leak(game: TdGame, e: Enemy) {
  game.lives -= e.lives;
  game.stats.livesLost[e.kind] = (game.stats.livesLost[e.kind] ?? 0) + e.lives;
  game.streak = 0;
  e.hp = 0;
  e.leaked = true;
}

/** An enemy with no powers of its own: used for minions and split copies. */
const plain = (hp: number, speed: number, splits = 0): EnemyStats => ({
  hp,
  shield: 0,
  regen: 0,
  armor: 0,
  speed,
  reward: 1,
  lives: 1,
  splits,
  blink: 0,
  summon: 0,
});

// Summoner: drops a small, weak minion just behind itself.
function summonMinion(game: TdGame, e: Enemy) {
  const minion = plain(e.maxHp * MINION_HP * (e.boss ? 0.33 : 1), Math.max(e.speed, 1.6));
  spawnEnemy(game, e.kind, e.wave, false, minion, Math.max(0, e.d - 0.3), true);
}

// Hexagon boss: towers close to where it lands stop attacking for a moment.
function stunTowers(game: TdGame, at: Vec) {
  for (const t of game.towers) if (dist(at, { x: t.tx + 0.5, y: t.ty + 0.5 }) <= STUN_RANGE) t.stun = STUN_TIME;
  game.fx.push({ type: 'ring', pos: at, range: STUN_RANGE, kind: 'hexagon', life: 0.25 });
}

// Octagon boss: brings in a full normal enemy of a random unlocked type just behind itself.
function openPortal(game: TdGame, e: Enemy) {
  const kind = pick(waveKinds(e.wave));
  spawnEnemy(game, kind, e.wave, false, enemyStats(kind, e.wave, false), Math.max(0, e.d - 0.3));
  game.fx.push({ type: 'ring', pos: { ...e.pos }, range: 0.8, kind: 'octagon', life: 0.25 });
}

/** Removes dead enemies: rewards and experience for kills, split copies for Splitters and near a Pentagon boss. */
export function removeDead(game: TdGame) {
  const dead = game.enemies.filter((e) => e.hp <= 0);
  if (!dead.length) return;
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  for (const e of dead) {
    if (e.leaked) continue;
    game.coins += Math.round(e.reward * game.streakMult());
    if (e.lastTower && game.towers.includes(e.lastTower)) game.gainXp(e.lastTower, e.boss ? BOSS_XP : 1);
    splitCopies(game, e);
    if (inSwarm(game, e)) spawnEnemy(game, e.kind, e.wave, false, smallCopy(e), e.d, true);
  }
}

// Pentagon boss: any normal enemy dying near it leaves one small copy (copies and minions don't, or it would never end).
const inSwarm = (game: TdGame, e: Enemy) =>
  !e.boss && !e.small && game.enemies.some((b) => b.boss && b.kind === 'pentagon' && dist(b.pos, e.pos) <= AURA_RANGE);

const smallCopy = (e: Enemy) => plain(e.maxHp * 0.3, e.speed * 1.4);

// Splitter: a boss splits into regular splitters, a regular one into small final copies.
function splitCopies(game: TdGame, e: Enemy) {
  for (let i = 0; i < e.splits; i++) {
    const copy = e.boss ? plain(e.maxHp * 0.15, e.speed / 0.75, 2) : smallCopy(e);
    spawnEnemy(game, e.kind, e.wave, false, copy, Math.max(0, e.d - i * 0.3), !e.boss);
  }
}
