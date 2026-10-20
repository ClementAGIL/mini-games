// Enemy life cycle: spawning from the wave queues, effects over time, movement and powers, leaking and dying.
import { BLINK_EVERY, BOSS_XP, MINION_HP, SHIELD_DELAY, type EnemyStats, type Kind } from './data';
import { dotDamage } from './combat';
import type { TdGame } from './game';
import type { Enemy } from './model';
import { enemyStats, spawnGap } from './waves';

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

/** Burn, poison, regeneration and shield refill. */
function applyEffects(game: TdGame, e: Enemy, dt: number) {
  if (e.burnTime > 0) {
    e.burnTime -= dt;
    dotDamage(game, e, e.burn * dt, e.burnBy);
  } else e.burn = 0;
  if (e.poisonTime > 0) {
    e.poisonTime -= dt;
    dotDamage(game, e, e.poison * dt, e.poisonBy);
  } else e.poison = 0;
  if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
  if (game.time - e.lastHit > SHIELD_DELAY) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.5 * dt);
}

/** Walks along the path (slower when slowed), blinks, summons, and leaks at the end. */
function moveEnemy(game: TdGame, e: Enemy, dt: number) {
  const end = game.path.length - 1;
  const pace = e.slowTime > 0 ? 1 - e.slow : 1;
  e.slowTime -= dt;
  e.d += e.speed * pace * dt;
  if (e.blink > 0 && (e.blinkTimer -= dt * pace) <= 0) {
    e.blinkTimer = BLINK_EVERY;
    const from = e.pos;
    e.d = Math.min(e.d + e.blink, end);
    game.fx.push({ type: 'line', from, to: game.posAt(e.d), life: 0.25 });
  }
  if (e.summon > 0 && e.hp > 0 && (e.summonTimer -= dt) <= 0) {
    e.summonTimer = e.summon;
    summonMinion(game, e);
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

/** Removes dead enemies: rewards and experience for kills, split copies for Splitters. */
export function removeDead(game: TdGame) {
  const dead = game.enemies.filter((e) => e.hp <= 0);
  if (!dead.length) return;
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  for (const e of dead) {
    if (e.leaked) continue;
    game.coins += Math.round(e.reward * game.streakMult());
    if (e.lastTower && game.towers.includes(e.lastTower)) game.gainXp(e.lastTower, e.boss ? BOSS_XP : 1);
    splitCopies(game, e);
  }
}

// Splitter: a boss splits into regular splitters, a regular one into small final copies.
function splitCopies(game: TdGame, e: Enemy) {
  for (let i = 0; i < e.splits; i++) {
    const copy = e.boss ? plain(e.maxHp * 0.15, e.speed / 0.75, 2) : plain(e.maxHp * 0.3, e.speed * 1.4);
    spawnEnemy(game, e.kind, e.wave, false, copy, Math.max(0, e.d - i * 0.3), !e.boss);
  }
}
