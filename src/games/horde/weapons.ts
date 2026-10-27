// Weapon firing: each weapon's timer, then its fire function (lookup table built from shooters.ts and casters.ts).
// Orbit and Lighthouse hurt by contact all the time (auras.ts).
import type { WeaponKind } from './arsenal';
import { CASTERS } from './casters';
import type { Run } from './game';
import { SHOOTERS, type Fire } from './shooters';
import { statsOf } from './targeting';

// Contact weapons never "fire": they hurt whatever touches them (auras.ts).
const contact: Fire = () => false;

const FIRE: Record<WeaponKind, Fire> = { ...SHOOTERS, ...CASTERS, orbit: contact, lighthouse: contact };

export function updateWeapons(run: Run, dt: number) {
  for (const w of run.weapons) {
    if (FIRE[w.kind] === contact || (w.timer -= dt) > 0) continue;
    const s = statsOf(run, w);
    const fired = FIRE[w.kind](run, w, s);
    w.timer = fired ? s.cooldown : 0;
    if (fired) w.shots++;
  }
}
