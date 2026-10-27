// Enemy creation (with the difficulty growth) and the movement / shooting helpers shared by enemy and boss behaviors.
import { dist, rand, type Vec } from '../../engine/math';
import {
  damageScale,
  DASH_AIM,
  DASH_REST,
  DASH_SPEED,
  DASH_TIME,
  ELITE_DAMAGE,
  ELITE_HP,
  ELITE_SIZE,
  ENEMIES,
  hpScale,
  levelHp,
  levelSpeed,
  SHOOTER_RELOAD,
  SHOT_SPEED,
  speedScale,
  type EnemyKind,
} from './data';
import type { Run } from './game';
import type { Enemy } from './model';

const SHOT_LIFE = 4;

/** Moves and acts for one step (`dt` may be scaled: chilled, hourglass, boss fury). */
export type Behavior = (e: Enemy, run: Run, dt: number) => void;

export interface EnemyOptions {
  elite?: boolean;
  hpMult?: number;
}

/** A new enemy, grown by the run time (HP, damage, speed) and the player level (HP, speed). */
export function makeEnemy(kind: EnemyKind, pos: Vec, run: Run, opts: EnemyOptions = {}): Enemy {
  const def = ENEMIES[kind];
  const t = run.time;
  const elite = !!opts.elite;
  const hp = def.hp * hpScale(t) * levelHp(run.level) * (elite ? ELITE_HP : 1) * (opts.hpMult ?? 1);
  return {
    kind,
    pos,
    knock: { x: 0, y: 0 },
    r: def.r * (elite ? ELITE_SIZE : 1),
    hp,
    maxHp: hp,
    speed: def.speed * speedScale(t) * levelSpeed(run.level),
    damage: def.damage * damageScale(t) * (elite ? ELITE_DAMAGE : 1),
    xp: def.xp,
    elite,
    boss: kind === 'boss',
    bossKind: null,
    fury: 1,
    slot: 0,
    ttl: Infinity,
    mode: 'walk',
    phase: 0,
    phaseLeft: 0,
    timer: rand(0.5, 1.5) * (kind === 'shooter' ? SHOOTER_RELOAD : DASH_REST),
    aim: { x: 0, y: 0 },
    fuse: -1,
    hitAt: {},
    slow: 0,
    slowLeft: 0,
    burn: 0,
    burnLeft: 0,
    burnBy: null,
    flash: 0,
  };
}

export const unitTo = (from: Vec, to: Vec): Vec => {
  const d = dist(from, to) || 1;
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
};

export const angleTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x);

/** Moves `e` toward `target` (away with a negative speed). */
export function toward(e: Enemy, target: Vec, speed: number, dt: number) {
  const u = unitTo(e.pos, target);
  e.pos.x += u.x * speed * dt;
  e.pos.y += u.y * speed * dt;
}

export const chase: Behavior = (e, run, dt) => toward(e, run.player.pos, e.speed, dt);

export function startAim(e: Enemy, target: Vec, time = DASH_AIM) {
  e.mode = 'aim';
  e.timer = time;
  e.aim = unitTo(e.pos, target);
}

/** Aim (stand still), then charge along `aim`. Returns true when the charge is over. */
export function dashStep(e: Enemy, dt: number, speed = DASH_SPEED) {
  e.timer -= dt;
  if (e.mode === 'aim') {
    if (e.timer <= 0) [e.mode, e.timer] = ['dash', DASH_TIME];
    return false;
  }
  e.pos.x += e.aim.x * speed * dt;
  e.pos.y += e.aim.y * speed * dt;
  if (e.timer > 0) return false;
  [e.mode, e.timer] = ['walk', DASH_REST];
  return true;
}

/** An enemy bullet from `e` toward `angle`. */
export function shoot(run: Run, e: Enemy, angle: number, speed = SHOT_SPEED) {
  const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  run.shots.push({ pos: { ...e.pos }, vel, damage: e.damage, life: SHOT_LIFE });
}
