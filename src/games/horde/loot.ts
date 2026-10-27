// What a killed enemy leaves: XP gems, rare pickups (more with luck), chests from elites (level-up) and bosses (artifact).
import { rand, type Vec } from '../../engine/math';
import { BOSS_GEMS, DROPS, luckFactor, MAX_GEMS } from './data';
import type { Run } from './game';
import type { Enemy, PickupKind } from './model';

const ELITE_GEM = 5; // an elite's gem is worth 5× its XP
const BOSS_GEM = 5;
const CHEST_LEVELS = 1; // free level-ups in an elite's chest

function add(run: Run, kind: PickupKind, pos: Vec, value = 0) {
  run.pickups.push({
    kind,
    pos: { ...pos },
    value,
    pulled: false,
    taken: false,
  });
}

// Past the gem cap, new XP goes into an existing gem instead of a new one, to keep the frame rate.
function gem(run: Run, pos: Vec, value: number) {
  const gems = run.pickups.filter((k) => k.kind === 'xp');
  if (gems.length >= MAX_GEMS) gems[0].value += value;
  else add(run, 'xp', pos, value);
}

export function dropLoot(run: Run, e: Enemy) {
  if (e.boss) {
    add(run, 'relic', e.pos);
    for (let i = 0; i < BOSS_GEMS; i++) gem(run, { x: e.pos.x + rand(-40, 40), y: e.pos.y + rand(-40, 40) }, BOSS_GEM);
    return;
  }
  if (e.elite) {
    add(run, 'chest', e.pos, CHEST_LEVELS);
    return gem(run, { x: e.pos.x + 12, y: e.pos.y }, e.xp * ELITE_GEM);
  }
  gem(run, e.pos, e.xp);
  let roll = Math.random() / luckFactor(run.mods.luck);
  for (const [kind, chance] of Object.entries(DROPS) as [PickupKind, number][]) {
    if ((roll -= chance) < 0) return add(run, kind, { x: e.pos.x + 8, y: e.pos.y });
  }
}
