// Players and enemies: grid movement with corner sliding, kicking bombs, picking up power-ups, and enemy AI
// (wanderers walk randomly, chasers run at a player they can see, careful ones avoid bomb blasts).
import { input } from '../../engine/input';
import { approach, pick, type Vec } from '../../engine/math';
import { bombAt } from './bombs';
import {
  CHASE_SIGHT,
  CHASE_SPEED,
  DIRS,
  ENEMY_SPEED,
  key,
  MAX_PLAYER_SPEED,
  SPEED_STEP,
  tileOf,
  Tile,
  type Enemy,
  type Player,
  type Powerup,
  type World,
} from './model';

const same = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

// ---------- players ----------

export function movePlayer(w: World, p: Player, dt: number) {
  const d = input.dirDown(p.keys.dirs);
  if (!d) return;
  const step = p.speed * dt;
  if (d.x) {
    p.pos.y = approach(p.pos.y, Math.round(p.pos.y), step); // slide toward the row so corners are easy
    p.pos.x = advance(p.pos.x, d.x, step, (c) => passable(w, p, c, Math.round(p.pos.y), d));
  } else {
    p.pos.x = approach(p.pos.x, Math.round(p.pos.x), step);
    p.pos.y = advance(p.pos.y, d.y, step, (c) => passable(w, p, Math.round(p.pos.x), c, d));
  }
}

// Moves along one axis; stops at the current tile center if the next tile is blocked.
function advance(pos: number, d: number, step: number, free: (c: number) => boolean) {
  const c = Math.round(pos);
  const next = pos + d * step;
  if (free(c + d)) return next;
  return d > 0 ? Math.min(next, Math.max(pos, c)) : Math.max(next, Math.min(pos, c));
}

/** Can player `p` walk onto (x, y)? Walking into a bomb kicks it when the player has the Kick power-up. */
function passable(w: World, p: Player, x: number, y: number, dir: Vec) {
  const tile = w.grid[key(x, y)];
  if (tile === Tile.Wall || (tile === Tile.Block && !p.pass)) return false;
  const bomb = bombAt(w, x, y);
  if (bomb && p.kick && !bomb.slide) bomb.slide = { ...dir };
  return !bomb;
}

/** Picks up the power-up under the player, if any; returns its name for a popup. */
export function pickup(w: World, p: Player): Powerup | null {
  const k = tileOf(p.pos);
  const power = w.powerups.get(k);
  if (!power) return null;
  w.powerups.delete(k);
  if (power === 'bomb') p.maxBombs++;
  if (power === 'range') p.range++;
  if (power === 'speed') p.speed = Math.min(MAX_PLAYER_SPEED, p.speed + SPEED_STEP);
  if (power === 'kick') p.kick = true;
  if (power === 'remote') p.remote = true;
  if (power === 'pass') p.pass = true;
  return power;
}

// ---------- enemies ----------

const enemyFree = (w: World, x: number, y: number) => w.grid[key(x, y)] === Tile.Empty && !bombAt(w, x, y);

/** Walks tile to tile; at each tile center, picks the next direction according to its kind. */
export function moveEnemy(w: World, e: Enemy, dt: number, danger: Set<number>) {
  const step = (e.kind === 'chase' ? CHASE_SPEED : ENEMY_SPEED) * dt;
  e.pos.x = approach(e.pos.x, e.target.x, step);
  e.pos.y = approach(e.pos.y, e.target.y, step);
  if (!same(e.pos, e.target)) return;
  const open = DIRS.filter((d) => enemyFree(w, e.pos.x + d.x, e.pos.y + d.y));
  if (!open.length) return;
  e.dir = chooseDir(w, e, open, danger);
  e.target = { x: e.pos.x + e.dir.x, y: e.pos.y + e.dir.y };
}

function chooseDir(w: World, e: Enemy, open: Vec[], danger: Set<number>): Vec {
  if (e.kind === 'chase') {
    const toPlayer = seePlayer(w, e);
    if (toPlayer && open.some((d) => same(d, toPlayer))) return toPlayer;
  }
  if (e.kind === 'careful') {
    const safe = open.filter((d) => !danger.has(key(e.pos.x + d.x, e.pos.y + d.y)));
    if (safe.length) return wander(e, safe);
  }
  return wander(e, open);
}

// Keep going straight most of the time, otherwise a random direction that is not a U-turn (if possible).
function wander(e: Enemy, open: Vec[]): Vec {
  const straight = open.find((d) => same(d, e.dir));
  const forward = open.filter((d) => d.x !== -e.dir.x || d.y !== -e.dir.y);
  return straight && Math.random() < 0.7 ? straight : pick(forward.length ? forward : open);
}

/** Direction toward a living player in the same row or column, close enough and with nothing in between. */
function seePlayer(w: World, e: Enemy): Vec | null {
  for (const p of w.players) {
    if (!p.alive) continue;
    const px = Math.round(p.pos.x);
    const py = Math.round(p.pos.y);
    if (px !== e.pos.x && py !== e.pos.y) continue;
    const dist = Math.abs(px - e.pos.x) + Math.abs(py - e.pos.y);
    if (dist === 0 || dist > CHASE_SIGHT) continue;
    const d = { x: Math.sign(px - e.pos.x), y: Math.sign(py - e.pos.y) };
    let clear = true;
    for (let i = 1; i < dist && clear; i++) clear = enemyFree(w, e.pos.x + d.x * i, e.pos.y + d.y * i);
    if (clear) return d;
  }
  return null;
}
