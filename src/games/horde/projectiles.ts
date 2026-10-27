// Flight and hits of the projectiles: straight (Dart, Pellet, Flame), bouncing between enemies (Shard), coming back
// (Boomerang), bouncing on the screen edges (Saw), seeking (Homing).
import { angleDiff, angleTo, circlesHit, dist } from '../../engine/math';
import type { Run } from './game';
import type { Enemy, Missile, MissileKind } from './model';
import { SPEED } from './shooters';
import { blast, nearest } from './targeting';

const SHARD_JUMP = 180; // a shard only bounces to an enemy this close
const SAW_REHIT = 0.4; // seconds before a saw can hit the same enemy again
const HOMING_TURN = 4; // radians per second
const HOMING_RANGE = 450;

type Steer = (run: Run, m: Missile, dt: number) => void;

const straight: Steer = () => {};

function aimAt(m: Missile, angle: number, speed: number) {
  m.vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

// Flies out for `range`, then back to the player (it can hit every enemy again on the way back).
const boomerang: Steer = (run, m, dt) => {
  const outTime = m.range / SPEED.boomerang;
  if (m.age - dt < outTime && m.age >= outTime) m.hit.clear();
  if (m.age < outTime) return;
  const p = run.player.pos;
  aimAt(m, angleTo(m.pos, p), SPEED.boomerang);
  if (dist(m.pos, p) < 16) m.life = 0;
};

// Bounces on the edges of the view and forgets its hits every SAW_REHIT seconds, so it grinds through crowds.
const saw: Steer = (run, m, dt) => {
  const p = run.player.pos;
  const hw = run.viewW / 2 - m.r;
  const hh = run.viewH / 2 - m.r;
  if (Math.abs(m.pos.x - p.x) > hw && Math.sign(m.vel.x) === Math.sign(m.pos.x - p.x)) m.vel.x = -m.vel.x;
  if (Math.abs(m.pos.y - p.y) > hh && Math.sign(m.vel.y) === Math.sign(m.pos.y - p.y)) m.vel.y = -m.vel.y;
  if (Math.floor(m.age / SAW_REHIT) !== Math.floor((m.age - dt) / SAW_REHIT)) m.hit.clear();
};

const homing: Steer = (run, m, dt) => {
  if (!m.target || m.target.hp <= 0) m.target = nearest(run, m.pos, HOMING_RANGE);
  if (!m.target) return;
  const heading = Math.atan2(m.vel.y, m.vel.x);
  const diff = angleDiff(angleTo(m.pos, m.target.pos), heading);
  aimAt(m, heading + Math.sign(diff) * Math.min(Math.abs(diff), HOMING_TURN * dt), SPEED.homing);
};

const STEER: Record<MissileKind, Steer> = {
  dart: straight,
  shard: straight,
  pellet: straight,
  flame: straight,
  boomerang,
  saw,
  homing,
};

/** What a projectile does to an enemy it touches. */
function onHit(run: Run, m: Missile, e: Enemy) {
  if (m.kind === 'flame') {
    e.burn = Math.max(e.burn, m.damage);
    e.burnLeft = m.range;
    e.burnBy = m.weapon;
    return;
  }
  if (m.kind === 'homing') {
    m.life = 0;
    return blast(run, m.pos, m.range, m.damage, m.weapon);
  }
  run.damage(e, m.damage, m.weapon);
  if (m.left-- <= 0) m.life = 0;
  else if (m.kind === 'shard') bounce(run, m);
}

function bounce(run: Run, m: Missile) {
  const next = nearest(run, m.pos, SHARD_JUMP, m.hit);
  if (!next) return void (m.life = 0);
  aimAt(m, angleTo(m.pos, next.pos), SPEED.shard);
  m.life = Math.max(m.life, 1);
}

export function updateMissiles(run: Run, dt: number) {
  for (const m of run.missiles) {
    m.age += dt;
    m.life -= dt;
    STEER[m.kind](run, m, dt);
    m.pos.x += m.vel.x * dt;
    m.pos.y += m.vel.y * dt;
    for (const e of run.grid.near(m.pos.x, m.pos.y, m.r)) {
      if (m.life <= 0) break;
      if (e.hp <= 0 || m.hit.has(e) || !circlesHit(m.pos, m.r, e.pos, e.r)) continue;
      m.hit.add(e);
      onHit(run, m, e);
    }
  }
  run.missiles = run.missiles.filter((m) => m.life > 0);
}
