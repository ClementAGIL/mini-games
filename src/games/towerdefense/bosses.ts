// Boss auras: the Triangle, Circle, Diamond and Star bosses help the normal enemies around them.
// The other boss powers happen on events: taunt in combat.ts, stun, swarm and portal in enemies.ts.
import { dist } from '../../engine/math';
import { AURA_ARMOR_TIME, AURA_RANGE, AURA_SHIELD, HASTE, HEAL_AURA, PULSE_EVERY, type Kind } from './data';
import type { TdGame } from './game';
import type { Enemy } from './model';
import { enemyStats } from './waves';

type Aura = (game: TdGame, boss: Enemy, dt: number) => void;

const AURAS: Partial<Record<Kind, Aura>> = {
  triangle: (game, boss) => around(game, boss).forEach((e) => (e.haste = HASTE)),
  circle: (game, boss) => around(game, boss).forEach((e) => (e.heal = HEAL_AURA)),
  diamond: (game, boss, dt) =>
    pulse(game, boss, dt, (e) => (e.auraShield = Math.max(e.auraShield, e.maxHp * AURA_SHIELD))),
  star: (game, boss, dt) => {
    const armor = enemyStats('star', boss.wave, false).armor;
    pulse(game, boss, dt, (e) => {
      e.auraArmor = armor;
      e.auraArmorTime = AURA_ARMOR_TIME;
    });
  },
};

/** Recomputes haste and heal from scratch every step (so two bosses never stack), then runs each boss's aura. */
export function updateBossAuras(game: TdGame, dt: number) {
  for (const e of game.enemies) e.haste = e.heal = 0;
  for (const b of game.enemies) if (b.boss && b.hp > 0) AURAS[b.kind]?.(game, b, dt);
}

/** Living normal enemies in the boss's aura. */
export const around = (game: TdGame, boss: Enemy) =>
  game.enemies.filter((e) => !e.boss && e.hp > 0 && dist(e.pos, boss.pos) <= AURA_RANGE);

function pulse(game: TdGame, boss: Enemy, dt: number, apply: (e: Enemy) => void) {
  if ((boss.powerTimer -= dt) > 0) return;
  boss.powerTimer = PULSE_EVERY;
  around(game, boss).forEach(apply);
  game.fx.push({ type: 'ring', pos: { ...boss.pos }, range: AURA_RANGE, kind: boss.kind, life: 0.25 });
}
