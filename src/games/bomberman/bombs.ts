// Bombs: placing, remote detonation, kicked bombs sliding, timers, chain explosions with spreading flames,
// and the "danger" tiles that careful enemies avoid.
import {
  BOMB_TIME,
  DIRS,
  FLAME_STEP,
  FLAME_TIME,
  key,
  KICK_SPEED,
  POWERUP_CHANCE,
  POWERUP_WEIGHTS,
  tileOf,
  Tile,
  type Bomb,
  type Player,
  type Powerup,
  type World,
} from './model';

export const bombAt = (w: World, x: number, y: number) => w.bombs.find((b) => b.x === x && b.y === y);

export function placeBomb(w: World, p: Player) {
  const x = Math.round(p.pos.x);
  const y = Math.round(p.pos.y);
  if (w.bombs.filter((b) => b.owner === p).length >= p.maxBombs || bombAt(w, x, y)) return;
  // Remote bombs wait for the detonate key (a blast still sets them off).
  w.bombs.push({ x, y, timer: p.remote ? Infinity : BOMB_TIME, range: p.range, owner: p, slide: null, offset: 0 });
}

export function detonate(w: World, p: Player) {
  for (const b of w.bombs) if (b.owner === p) b.timer = 0;
}

/**
 * Tiles reached by a blast from (x, y): the center, then each direction until a wall, `range` tiles away, or the
 * first breakable block (included). `step` is the distance from the center, used to make flames spread out.
 */
export function blast(w: World, x: number, y: number, range: number) {
  const tiles = [{ k: key(x, y), step: 0 }];
  for (const d of DIRS) {
    for (let i = 1; i <= range; i++) {
      const k = key(x + d.x * i, y + d.y * i);
      if (w.grid[k] === Tile.Wall) break;
      tiles.push({ k, step: i });
      if (w.grid[k] === Tile.Block) break;
    }
  }
  return tiles;
}

/** Every tile some bomb will set on fire. */
export function dangerTiles(w: World) {
  return new Set(w.bombs.flatMap((b) => blast(w, b.x, b.y, b.range).map((t) => t.k)));
}

/** A tile is burning once its flame's spreading delay is over. */
export const burning = (w: World, k: number) => (w.flames.get(k)?.delay ?? 1) <= 0;

export function updateBombs(w: World, dt: number) {
  for (const [k, f] of w.flames) {
    if (f.delay > 0) f.delay -= dt;
    else if ((f.left -= dt) <= 0) w.flames.delete(k);
  }
  for (const b of w.bombs) {
    if (b.slide) slide(w, b, dt);
    b.timer -= dt;
  }
  // A blast sets other bombs' timers to 0, so this loop also resolves chain reactions.
  let bomb: Bomb | undefined;
  while ((bomb = w.bombs.find((b) => b.timer <= 0))) {
    w.bombs.splice(w.bombs.indexOf(bomb), 1);
    explode(w, bomb);
  }
}

// A kicked bomb slides tile by tile until something blocks it.
function slide(w: World, b: Bomb, dt: number) {
  b.offset += KICK_SPEED * dt;
  while (b.slide && b.offset >= 1) {
    const nx = b.x + b.slide.x;
    const ny = b.y + b.slide.y;
    if (!canSlideTo(w, nx, ny)) {
      b.slide = null;
      b.offset = 0;
      return;
    }
    b.x = nx;
    b.y = ny;
    b.offset -= 1;
  }
}

function canSlideTo(w: World, x: number, y: number) {
  const k = key(x, y);
  if (w.grid[k] !== Tile.Empty || bombAt(w, x, y)) return false;
  return ![...w.enemies, ...w.players.filter((p) => p.alive)].some((a) => tileOf(a.pos) === k);
}

function explode(w: World, b: Bomb) {
  for (const { k, step } of blast(w, b.x, b.y, b.range)) {
    w.flames.set(k, { delay: step * FLAME_STEP, left: FLAME_TIME });
    const other = w.bombs.find((o) => key(o.x, o.y) === k);
    if (other) other.timer = 0;
    if (w.grid[k] === Tile.Block) destroyBlock(w, k);
  }
}

// The exit appears if it was under this block; otherwise a power-up may drop.
function destroyBlock(w: World, k: number) {
  w.grid[k] = Tile.Empty;
  if (k === w.door) w.doorOpen = true;
  else if (Math.random() < POWERUP_CHANCE) w.powerups.set(k, randomPowerup());
}

function randomPowerup(): Powerup {
  const total = POWERUP_WEIGHTS.reduce((s, [, n]) => s + n, 0);
  let r = Math.random() * total;
  for (const [p, n] of POWERUP_WEIGHTS) if ((r -= n) < 0) return p;
  return 'bomb';
}
