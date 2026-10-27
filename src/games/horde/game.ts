// One Polygon Horde run: state, update order, the player, damage, XP and level-ups, pickups.
import { Effects } from '../../engine/effects';
import { SpatialGrid } from '../../engine/grid';
import { circlesHit, dist, type Vec } from '../../engine/math';
import { updateAttacks } from './attacks';
import {
  ELITE_LUCK,
  HEAL_CARD,
  HEAL_DROP,
  INVULNERABLE,
  MAGNET_SPEED,
  MAX_HP_CARD,
  PICKUP_R,
  PICKUP_SPEED,
  PLAYER_HP,
  PLAYER_R,
  PLAYER_SPEED,
  SPAWN_MARGIN,
  xpToNext,
} from './data';
import { Director } from './director';
import { onDeath, updateEnemies } from './enemies';
import { dropLoot } from './loot';
import { evolve, newWeapon, noMods, statValue } from './inventory';
import type { Beam, Blast, Card, Enemy, Mine, Missile, OwnedWeapon, Pickup, Player, Ring, Shot } from './model';
import { weaponName } from './arsenal';
import { updateWeapons } from './weapons';

export class Run {
  player: Player = { pos: { x: 0, y: 0 }, hp: PLAYER_HP, maxHp: PLAYER_HP, facing: { x: 1, y: 0 }, invulnerable: 0 };
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  missiles: Missile[] = [];
  rings: Ring[] = [];
  mines: Mine[] = [];
  beams: Beam[] = [];
  blasts: Blast[] = [];
  pickups: Pickup[] = [];
  weapons: OwnedWeapon[] = [newWeapon('dart')];
  mods = noMods();
  time = 0;
  kills = 0;
  level = 1;
  xp = 0;
  pendingLevels = 0;
  /** Pending level-ups from chests: their cards are rolled with extra luck. */
  luckyLevels = 0;
  boss: Enemy | null = null;
  orbitAngle = 0;
  fx = new Effects();
  grid = new SpatialGrid<Enemy>(64);
  private director = new Director();
  private viewW = 800;
  private viewH = 520;

  get dead() {
    return this.player.hp <= 0;
  }

  /** Size of the visible area in world units (spawns happen just outside it). */
  setView(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
  }

  /** Distance from the player at which enemies appear. */
  get spawnDist() {
    return Math.hypot(this.viewW, this.viewH) / 2 + SPAWN_MARGIN;
  }

  /** Whether `p` is on screen (with a small margin). */
  onScreen(p: Vec) {
    const { x, y } = this.player.pos;
    return Math.abs(p.x - x) < this.viewW / 2 + 20 && Math.abs(p.y - y) < this.viewH / 2 + 20;
  }

  /** One step; `move` is the wanted direction, length 0..1. */
  update(dt: number, move: Vec) {
    this.time += dt;
    this.fx.update(dt);
    this.movePlayer(dt, move);
    this.director.update(this, dt);
    updateEnemies(this, dt);
    updateWeapons(this, dt);
    updateAttacks(this, dt);
    this.updatePickups(dt);
    this.cleanup(dt);
  }

  private movePlayer(dt: number, move: Vec) {
    const p = this.player;
    const len = Math.hypot(move.x, move.y);
    if (len > 0) p.facing = { x: move.x / len, y: move.y / len };
    const speed = PLAYER_SPEED * (1 + this.mods.speed);
    p.pos.x += move.x * speed * dt;
    p.pos.y += move.y * speed * dt;
    p.invulnerable -= dt;
    p.hp = Math.min(p.maxHp, p.hp + this.mods.regen * dt);
  }

  hurtPlayer(amount: number) {
    const p = this.player;
    if (p.invulnerable > 0 || this.dead) return;
    p.hp -= amount;
    p.invulnerable = INVULNERABLE;
    this.fx.burst(p.pos.x, p.pos.y, 6, 90);
  }

  heal(amount: number) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  /** Deals damage to `e`, credits `source`, kills it at 0 HP. */
  damage(e: Enemy, amount: number, source: OwnedWeapon | null) {
    if (e.hp <= 0) return;
    if (source) source.dealt += Math.min(e.hp, amount);
    e.hp -= amount;
    e.flash = 0.08;
    if (e.hp <= 0) this.kill(e);
  }

  /** Removes `e` with its death effects and loot (it is filtered out at the end of the step). */
  kill(e: Enemy) {
    e.hp = 0;
    this.kills++;
    this.fx.burst(e.pos.x, e.pos.y, e.boss ? 24 : 6, e.boss ? 200 : 90);
    if (e === this.boss) this.boss = null;
    onDeath(this, e);
    dropLoot(this, e);
  }

  // ---------- XP and level-ups ----------

  private gainXp(value: number) {
    this.xp += value;
    for (let need = xpToNext(this.level); this.xp >= need; need = xpToNext(this.level)) {
      this.xp -= need;
      this.level++;
      this.pendingLevels++;
    }
  }

  /** Luck used for the next level-up's cards. */
  get cardLuck() {
    return this.mods.luck + (this.luckyLevels > 0 ? ELITE_LUCK : 0);
  }

  pickCard(card: Card) {
    this.pendingLevels--;
    this.luckyLevels = Math.max(0, this.luckyLevels - 1);
    if (card.kind === 'heal') return this.heal(HEAL_CARD);
    if (card.kind === 'maxhp') {
      this.player.maxHp += MAX_HP_CARD;
      return this.heal(MAX_HP_CARD);
    }
    if (card.kind === 'stat') this.mods[card.stat] += statValue(card);
    else {
      const owned = this.weapons.find((w) => w.kind === card.weapon);
      if (owned) owned.level++;
      else this.weapons.push(newWeapon(card.weapon));
    }
    this.checkEvolutions();
  }

  private checkEvolutions() {
    for (const w of evolve(this.weapons, this.mods)) {
      this.fx.popup(`${weaponName(w.kind, true)}!`, this.player.pos.x, this.player.pos.y - 40);
      this.fx.flash(0.3);
    }
  }

  // ---------- pickups ----------

  private updatePickups(dt: number) {
    const p = this.player.pos;
    for (const k of this.pickups) {
      const d = dist(k.pos, p);
      if (!k.pulled && d > PICKUP_R * (1 + this.mods.magnet)) continue;
      const step = Math.min(d, (k.pulled ? MAGNET_SPEED : PICKUP_SPEED) * dt);
      k.pos.x += ((p.x - k.pos.x) / (d || 1)) * step;
      k.pos.y += ((p.y - k.pos.y) / (d || 1)) * step;
      if (circlesHit(k.pos, 4, p, PLAYER_R)) this.collect(k);
    }
  }

  private collect(k: Pickup) {
    k.taken = true;
    if (k.kind === 'xp') return this.gainXp(k.value);
    this.fx.popup(k.kind, k.pos.x, k.pos.y - 10);
    if (k.kind === 'heal') this.heal(HEAL_DROP);
    else if (k.kind === 'magnet') for (const g of this.pickups) g.pulled ||= g.kind === 'xp';
    else if (k.kind === 'bomb') this.bomb();
    else if (k.kind === 'chest') {
      this.pendingLevels += k.value;
      this.luckyLevels += k.value;
    }
  }

  /** Kills every normal enemy on screen. */
  private bomb() {
    this.fx.flash(0.4);
    for (const e of this.enemies) if (!e.elite && !e.boss && e.hp > 0 && this.onScreen(e.pos)) this.kill(e);
  }

  private cleanup(dt: number) {
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    this.pickups = this.pickups.filter((k) => !k.taken);
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    this.blasts = this.blasts.filter((b) => (b.life -= dt) > 0);
  }
}
