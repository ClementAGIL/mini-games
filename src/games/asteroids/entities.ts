// Asteroids tuning constants, object types and small constructors/movers.
import { dist, pick, rand, wrap, type Vec } from '../../engine/math';

export const SHIP_R = 12;
export const TURN_SPEED = 4.5; // rad/s
export const THRUST = 320; // px/s²
export const DRAG = 0.45; // fraction of velocity kept after one second
export const MAX_SPEED = 420;
export const BULLET_SPEED = 520;
export const BULLET_LIFE = 0.9;
export const MAX_BULLETS = 6;
export const FIRE_COOLDOWN = 0.18;
export const INVULNERABLE = 2;
export const LIVES = 3;
export const EXTRA_LIFE_EVERY = 10000;
export const HYPER_COOLDOWN = 3;
// Indexed by asteroid size (3 = large, 1 = small).
export const ROCK_R = [0, 14, 26, 46];
export const ROCK_SCORE = [0, 100, 50, 20];
// Power-ups: dropped by small asteroids, picked up by flying into them.
export const DROP_CHANCE = 0.1;
export const ITEM_LIFE = 8;
export const ITEM_R = 10;
export const POWER_TIME = 10;
// UFO: from level 3, every 20–30 s; shoots at the ship, more accurately at higher levels.
export const UFO_FROM_LEVEL = 3;
export const UFO_R = 14;
export const UFO_SPEED = 90;
export const UFO_FIRE_EVERY = 1.5;
export const UFO_BULLET_SPEED = 260;
export const UFO_SCORE = 200;

export type PowerKind = 'shield' | 'triple' | 'rapid';
export const POWER_KINDS: PowerKind[] = ['shield', 'triple', 'rapid'];

export interface Body {
  pos: Vec;
  vel: Vec;
}

export interface Ship extends Body {
  angle: number;
}

export interface Rock extends Body {
  size: number;
  shape: number[]; // radius multiplier per vertex
  angle: number;
  spin: number;
}

export interface Bullet extends Body {
  life: number;
}

export interface Ufo extends Body {
  baseY: number;
  phase: number;
  fireTimer: number;
}

export interface Item extends Body {
  kind: PowerKind;
  life: number;
}

export const unit = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });

export function makeRock(pos: Vec, size: number): Rock {
  const speed = rand(30, 70) * (4 - size) * 0.7 + 20;
  const dir = unit(rand(0, Math.PI * 2));
  return {
    pos,
    vel: { x: dir.x * speed, y: dir.y * speed },
    size,
    shape: Array.from({ length: 10 }, () => rand(0.75, 1.15)),
    angle: 0,
    spin: rand(-1, 1),
  };
}

/** The large rocks of a level (3 + level of them), never closer than 160 px to the ship. */
export function levelRocks(level: number, w: number, h: number, ship: Vec): Rock[] {
  return Array.from({ length: 3 + level }, () => {
    let pos: Vec;
    do pos = { x: rand(0, w), y: rand(0, h) };
    while (dist(pos, ship) < 160);
    return makeRock(pos, 3);
  });
}

/** A random power-up drifting slowly away from `pos`. */
export function dropItem(pos: Vec): Item {
  const d = unit(rand(0, Math.PI * 2));
  return { pos: { ...pos }, vel: { x: d.x * 25, y: d.y * 25 }, kind: pick(POWER_KINDS), life: ITEM_LIFE };
}

/** A UFO entering from the left or right edge at a random height. */
export function makeUfo(w: number, h: number): Ufo {
  const fromLeft = Math.random() < 0.5;
  const y = rand(h * 0.2, h * 0.8);
  return {
    pos: { x: fromLeft ? -UFO_R : w + UFO_R, y },
    vel: { x: fromLeft ? UFO_SPEED : -UFO_SPEED, y: 0 },
    baseY: y,
    phase: 0,
    fireTimer: UFO_FIRE_EVERY,
  };
}

/** Moves a body and wraps it around the screen edges. */
export function moveWrapped(b: Body, dt: number, w: number, h: number) {
  b.pos.x = wrap(b.pos.x + b.vel.x * dt, w);
  b.pos.y = wrap(b.pos.y + b.vel.y * dt, h);
}
