// The UFO: crosses the screen weaving up and down and shoots at the ship, more accurately at higher levels.
import { rand, type Vec } from '../../engine/math';
import { UFO_BULLET_SPEED, UFO_FIRE_EVERY, UFO_R, unit, type Bullet, type Ufo } from './entities';

/** Moves the UFO; returns a bullet aimed at `target` when it fires this step. */
export function updateUfo(u: Ufo, dt: number, target: Vec, level: number): Bullet | null {
  u.pos.x += u.vel.x * dt;
  u.phase += dt * 2;
  u.pos.y = u.baseY + Math.sin(u.phase) * 30;
  if ((u.fireTimer -= dt) > 0) return null;
  u.fireTimer = UFO_FIRE_EVERY;
  const error = Math.max(0.05, 0.5 - level * 0.04); // radians of random aim error
  const d = unit(Math.atan2(target.y - u.pos.y, target.x - u.pos.x) + rand(-error, error));
  return { pos: { ...u.pos }, vel: { x: d.x * UFO_BULLET_SPEED, y: d.y * UFO_BULLET_SPEED }, life: 2 };
}

/** True once the UFO has crossed the whole screen (it does not wrap around). */
export const ufoGone = (u: Ufo, w: number) => u.pos.x < -UFO_R * 2 || u.pos.x > w + UFO_R * 2;
