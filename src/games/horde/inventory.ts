// Inventory rules: item merging and bonuses, level-up cards, weapon evolutions.
import { pick, shuffle } from '../../engine/math';
import { WEAPON_KINDS, WEAPONS, type Mods, type WeaponKind } from './arsenal';
import { ITEM_KINDS, ITEM_SLOTS, ITEMS, MAX_LEVEL, MAX_TIER, TIER_NAMES, WEAPON_SLOTS } from './data';
import type { Card, Item, OwnedWeapon } from './model';

export const newWeapon = (kind: WeaponKind): OwnedWeapon => ({ kind, level: 1, evolved: false, timer: 0, dealt: 0 });

export const randomItem = (): Item => ({ kind: pick(ITEM_KINDS), tier: 1 });

/**
 * Adds `item`, merging it with identical items (same kind and tier) into higher tiers, in chain.
 * Returns the item finally placed, or null when there is no free slot (nothing changes then).
 */
export function addItem(items: Item[], item: Item): Item | null {
  const twin = (it: Item) => items.findIndex((i) => i.kind === it.kind && i.tier === it.tier && it.tier < MAX_TIER);
  if (twin(item) < 0 && items.length >= ITEM_SLOTS) return null;
  let cur = { ...item };
  for (let i = twin(cur); i >= 0; i = twin(cur)) {
    items.splice(i, 1);
    cur = { kind: cur.kind, tier: cur.tier + 1 };
  }
  items.push(cur);
  return cur;
}

export function itemMods(items: Item[]): Mods {
  const mods = Object.fromEntries(ITEM_KINDS.map((k) => [k, 0])) as Mods;
  for (const it of items) mods[it.kind] += ITEMS[it.kind].tiers[it.tier - 1];
  return mods;
}

export const itemName = (it: Item) => `${ITEMS[it.kind].name} ${TIER_NAMES[it.tier - 1]}`;

export const itemText = (it: Item) => ITEMS[it.kind].text(ITEMS[it.kind].tiers[it.tier - 1]);

/** Up to 3 cards: new weapons while a slot is free, +1 level on the others; heal / max HP when nothing is left. */
export function levelUpCards(weapons: OwnedWeapon[]): Card[] {
  const upgrades = weapons.filter((w) => w.level < MAX_LEVEL).map((w) => w.kind);
  const fresh = weapons.length < WEAPON_SLOTS ? WEAPON_KINDS.filter((k) => !weapons.some((w) => w.kind === k)) : [];
  const cards: Card[] = shuffle([...upgrades, ...fresh])
    .slice(0, 3)
    .map((weapon) => ({ kind: 'weapon', weapon }));
  const fillers: Card[] = [{ kind: 'heal' }, { kind: 'maxhp' }];
  for (const f of fillers) if (cards.length < 3) cards.push(f);
  return cards;
}

/** Evolves every level-5 weapon whose item is held at tier III. Returns the weapons that just evolved. */
export function evolve(weapons: OwnedWeapon[], items: Item[]): OwnedWeapon[] {
  const ready = weapons.filter(
    (w) =>
      !w.evolved &&
      w.level === MAX_LEVEL &&
      items.some((i) => i.kind === WEAPONS[w.kind].evo.item && i.tier === MAX_TIER),
  );
  for (const w of ready) w.evolved = true;
  return ready;
}
