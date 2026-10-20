// The player's ship: steering (keys/buttons or joystick), thrust and drag, shooting and hyperspace.
import { input } from '../../engine/input';
import { angleDiff, rand, type Vec } from '../../engine/math';
import {
  BULLET_LIFE,
  BULLET_SPEED,
  DRAG,
  MAX_SPEED,
  moveWrapped,
  SHIP_R,
  THRUST,
  TURN_SPEED,
  unit,
  type Bullet,
  type Ship,
} from './entities';

export const STICK_R = 45; // joystick radius in px; dragging past 60% of it thrusts

/** Keys or touch buttons: turn left/right, thrust while up is held. Returns whether the ship thrusts. */
export function steerWithKeys(s: Ship, dt: number) {
  if (input.down('ArrowLeft', 'KeyA')) s.angle -= TURN_SPEED * dt;
  if (input.down('ArrowRight', 'KeyD')) s.angle += TURN_SPEED * dt;
  return input.down('ArrowUp', 'KeyW');
}

/** Joystick: turn toward the drag direction (at the normal turn speed), thrust when dragged far enough. */
export function steerWithStick(s: Ship, stick: { start: Vec; pos: Vec }, dt: number) {
  const dx = stick.pos.x - stick.start.x;
  const dy = stick.pos.y - stick.start.y;
  const len = Math.hypot(dx, dy);
  if (len > 12) {
    const diff = angleDiff(Math.atan2(dy, dx), s.angle);
    s.angle += Math.sign(diff) * Math.min(Math.abs(diff), TURN_SPEED * dt);
  }
  return len > STICK_R * 0.6;
}

/** Thrust, drag (frame-rate independent), speed limit, then move with screen wrap. */
export function pushShip(s: Ship, thrusting: boolean, dt: number, w: number, h: number) {
  if (thrusting) {
    const d = unit(s.angle);
    s.vel.x += d.x * THRUST * dt;
    s.vel.y += d.y * THRUST * dt;
  }
  const keep = Math.pow(DRAG, dt);
  s.vel.x *= keep;
  s.vel.y *= keep;
  const speed = Math.hypot(s.vel.x, s.vel.y);
  if (speed > MAX_SPEED) {
    s.vel.x *= MAX_SPEED / speed;
    s.vel.y *= MAX_SPEED / speed;
  }
  moveWrapped(s, dt, w, h);
}

/** Bullets for one shot: one forward, or a fan of three with the triple-shot power-up. */
export function shoot(s: Ship, triple: boolean): Bullet[] {
  return (triple ? [-0.2, 0, 0.2] : [0]).map((spread) => {
    const d = unit(s.angle + spread);
    return {
      pos: { x: s.pos.x + d.x * SHIP_R, y: s.pos.y + d.y * SHIP_R },
      vel: { x: d.x * BULLET_SPEED + s.vel.x, y: d.y * BULLET_SPEED + s.vel.y },
      life: BULLET_LIFE,
    };
  });
}

/** Jump to a random place and stop. No protection: landing near a rock is the risk. */
export function hyperspaceJump(s: Ship, w: number, h: number) {
  s.pos = { x: rand(0, w), y: rand(0, h) };
  s.vel = { x: 0, y: 0 };
}
