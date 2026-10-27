// Weapons that act around the player without projectiles: Pulse, Frost, Lance, Whip, Chain, Mine, Meteor,
// Black hole. What they leave in the world (rings, mines, strikes, vortices) is updated in attacks.ts.
import { dist, pick, rand, type Vec } from '../../engine/math';
import type { WeaponStats } from './arsenal';
import type { Run } from './game';
import type { Enemy, OwnedWeapon } from './model';
import type { Fire } from './shooters';
import { facingAngle, nearest, nearestN, segmentDist, pointAt } from './targeting';

const LANCE_WIDTH = 8;
const WHIP_WIDTH = 30;
const PULSE_KNOCK = 260;
const FROST_SLOW = 0.4;
const BLIZZARD_SLOW = 0.7;
const CHAIN_RANGE = 300; // first target
const CHAIN_JUMP = 130; // next targets, grown by Area
const MINE_ARM = 0.4;
const MINE_LIFE = 8;
const MAX_MINES = 24;
const METEOR_DELAY = 0.7;
const VORTEX_LIFE = 3;
const VORTEX_RANGE = 320;

const pulse: Fire = (run, w, s) => {
  const heals = w.evolved;
  run.rings.push({
    weapon: w,
    r: 0,
    maxR: s.size,
    damage: s.damage,
    hit: new Set(),
    heals,
    slow: 0,
    push: PULSE_KNOCK,
  });
  return true;
};

const frost: Fire = (run, w, s) => {
  const slow = w.evolved ? BLIZZARD_SLOW : FROST_SLOW;
  run.rings.push({ weapon: w, r: 0, maxR: s.size, damage: s.damage, hit: new Set(), heals: false, slow, push: 0 });
  return true;
};

/** A straight beam from the player: drawn briefly, hurts every enemy it crosses. */
function sweep(run: Run, w: OwnedWeapon, s: WeaponStats, angle: number, width: number) {
  const from = { ...run.player.pos };
  const to = pointAt(from, angle, s.size);
  run.beams.push({ from, to, width, life: 0.15 });
  for (const e of run.enemies) if (segmentDist(e.pos, from, to) < width / 2 + e.r) run.damage(e, s.damage, w);
}

// Beams spread evenly around the move direction: 1 forward, 2 forward and back, 3 a triangle, 4 a cross.
const lance: Fire = (run, w, s) => {
  const width = LANCE_WIDTH * (1 + run.mods.area);
  for (let i = 0; i < s.count; i++) sweep(run, w, s, facingAngle(run) + (i / s.count) * Math.PI * 2, width);
  return true;
};

// One lash alternates between your left and right; two lash both sides at once.
const whip: Fire = (run, w, s) => {
  const width = WHIP_WIDTH * (1 + run.mods.area);
  const side = facingAngle(run) + Math.PI / 2;
  if (s.count > 1) [0, Math.PI].forEach((a) => sweep(run, w, s, side + a, width));
  else sweep(run, w, s, side + (w.shots % 2) * Math.PI, width);
  return true;
};

// Each bolt hits a first enemy, then jumps to the nearest enemy it has not hit yet, `extra` times.
const chain: Fire = (run, w, s) => {
  const jump = CHAIN_JUMP * (1 + run.mods.area);
  const starts = nearestN(run, run.player.pos, CHAIN_RANGE, s.count);
  for (const start of starts) {
    const hit = new Set<Enemy>();
    const pts: Vec[] = [{ ...run.player.pos }];
    for (let e: Enemy | null = start; e && hit.size <= s.extra; e = nearest(run, e.pos, jump, hit)) {
      hit.add(e);
      pts.push({ ...e.pos });
      run.damage(e, s.damage, w);
    }
    run.bolts.push({ pts, life: 0.2 });
  }
  return starts.length > 0;
};

const mine: Fire = (run, w, s) => {
  for (let i = 0; i < s.count && run.mines.length < MAX_MINES; i++) {
    const pos = { x: run.player.pos.x + rand(-15, 15) * i, y: run.player.pos.y + rand(-15, 15) * i };
    run.mines.push({ weapon: w, pos, arm: MINE_ARM, life: MINE_LIFE, damage: s.damage, radius: s.size });
  }
  return true;
};

const meteor: Fire = (run, w, s) => {
  const visible = run.enemies.filter((e) => run.onScreen(e.pos));
  if (!visible.length) return false;
  for (let i = 0; i < s.count; i++) {
    const pos = { ...pick(visible).pos };
    run.strikes.push({ weapon: w, pos, delay: METEOR_DELAY, radius: s.size, damage: s.damage });
  }
  return true;
};

const blackhole: Fire = (run, w, s) => {
  const near = run.enemies.filter((e) => dist(e.pos, run.player.pos) < VORTEX_RANGE);
  if (!near.length) return false;
  const pos = { ...pick(near).pos };
  run.vortices.push({ weapon: w, pos, life: VORTEX_LIFE, radius: s.size, damage: s.damage, tick: 0 });
  return true;
};

export const CASTERS = { pulse, frost, lance, whip, chain, mine, meteor, blackhole };
