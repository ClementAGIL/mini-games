// Level-up cards (weapons and stats with a rarity rolled with luck) and weapon evolutions.
import { rand, shuffle } from '../../engine/math';
import { WEAPON_KINDS, WEAPONS, type Mods, type WeaponKind } from './arsenal';
import { luckFactor, MAX_LEVEL, RARITIES, STAT_KINDS, STATS, WEAPON_SLOTS } from './data';
import type { Card, OwnedWeapon } from './model';

/** Share of stat cards among the possible picks: a stat is offered as often as one weapon option. */
const STAT_OPTIONS = 4;

export const newWeapon = (kind: WeaponKind): OwnedWeapon => ({
  kind,
  level: 1,
  evolved: false,
  timer: 0,
  shots: 0,
  dealt: 0,
});

export const noMods = () => Object.fromEntries(STAT_KINDS.map((k) => [k, 0])) as Mods;

/** Rarity index 0 (Iron) .. 4 (Diamond); luck makes the rarer ones more likely. */
function rollRarity(luck: number): number {
  const weights = RARITIES.map((r, i) => r.weight * Math.pow(luckFactor(luck), i));
  let roll = rand(
    0,
    weights.reduce((a, b) => a + b, 0),
  );
  const i = weights.findIndex((w) => (roll -= w) < 0);
  return i < 0 ? 0 : i;
}

export const statValue = (card: { stat: keyof Mods; rarity: number }) => STATS[card.stat].values[card.rarity];

/** What a card offers, for banishing: a weapon or a stat kind ('' for heal / max HP, never banished). */
export const cardKey = (c: Card) => (c.kind === 'weapon' ? c.weapon : c.kind === 'stat' ? c.stat : '');

/**
 * `count` different cards from one pool: new weapons while a slot is free, +1 level on owned weapons, and stat cards
 * (each with its own rarity roll), minus the banished ones. Heal / max HP only fill in when the pool runs dry.
 */
export function levelUpCards(weapons: OwnedWeapon[], luck: number, count: number, banished: Set<string>): Card[] {
  const upgrades = weapons.filter((w) => w.level < MAX_LEVEL).map((w) => w.kind);
  const fresh = weapons.length < WEAPON_SLOTS ? WEAPON_KINDS.filter((k) => !weapons.some((w) => w.kind === k)) : [];
  const weaponCards: Card[] = [...upgrades, ...fresh].map((weapon) => ({ kind: 'weapon', weapon }));
  const statCards: Card[] = shuffle([...STAT_KINDS])
    .slice(0, STAT_OPTIONS)
    .map((stat) => ({ kind: 'stat', stat, rarity: rollRarity(luck) }));
  const pool = [...weaponCards, ...statCards].filter((c) => !banished.has(cardKey(c)));
  const cards = shuffle(pool).slice(0, count);
  for (const filler of [{ kind: 'heal' }, { kind: 'maxhp' }] as Card[]) if (cards.length < count) cards.push(filler);
  return cards;
}

/** Evolves every level-5 weapon whose stat has been taken at least once. Returns the weapons that just evolved. */
export function evolve(weapons: OwnedWeapon[], mods: Mods): OwnedWeapon[] {
  const ready = weapons.filter((w) => !w.evolved && w.level === MAX_LEVEL && mods[WEAPONS[w.kind].evo.stat] > 0);
  for (const w of ready) w.evolved = true;
  return ready;
}
