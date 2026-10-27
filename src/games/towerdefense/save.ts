// Save and resume a Tower Defense game in localStorage. The game is saved once per wave, just before the wave
// starts, so resuming always restarts that wave from its beginning (enemies still alive from the previous wave
// are kept). Bullets, arrows and visual effects only live for a moment and are not saved.
import type { Vec } from '../../engine/math';
import { loadJson, removeKey, saveJson } from '../../engine/storage';
import type { TdGame } from './game';
import type { Enemy, GameStats, QueuedEnemy, Spawner, TargetMode, Tower } from './model';

const KEY = 'towerdefense.save';
const VERSION = 3; // bump when the saved shape changes: older saves are then ignored

type SavedTower = Omit<Tower, 'bonus' | 'partners'>;
type SavedEnemy = Omit<Enemy, 'lastTower' | 'burnBy' | 'poisonBy' | 'lastHit'> & {
  lastTower: number;
  burnBy: number;
  poisonBy: number;
  lastHit: number | null; // -Infinity does not survive JSON
};

interface SaveData {
  version: number;
  path: Vec[];
  towers: SavedTower[];
  enemies: SavedEnemy[];
  spawners: Spawner[];
  nextQueue: QueuedEnemy[];
  wave: number;
  waveTimer: number;
  coins: number;
  lives: number;
  streak: number;
  bossWaves: number[];
  time: number;
  defaultMode: TargetMode;
  stats: GameStats;
}

export function saveGame(game: TdGame) {
  const index = (t: Tower | null) => (t ? game.towers.indexOf(t) : -1);
  const data: SaveData = {
    version: VERSION,
    path: game.path,
    towers: game.towers.map(({ bonus: _b, partners: _p, ...t }) => t),
    enemies: game.enemies.map((e) => ({
      ...e,
      lastTower: index(e.lastTower),
      burnBy: index(e.burnBy),
      poisonBy: index(e.poisonBy),
      lastHit: Number.isFinite(e.lastHit) ? e.lastHit : null,
    })),
    spawners: game.spawners,
    nextQueue: game.nextQueue,
    wave: game.wave,
    waveTimer: 0, // the wave starts as soon as the game is resumed
    coins: game.coins,
    lives: game.lives,
    streak: game.streak,
    bossWaves: game.bossWaves,
    time: game.time,
    defaultMode: game.defaultMode,
    stats: game.stats,
  };
  saveJson(KEY, data);
}

function readSave(): SaveData | null {
  const data = loadJson<SaveData>(KEY);
  return data?.version === VERSION ? data : null;
}

/** The wave a resumed game starts with, or 0 when there is nothing to resume. */
export function savedWave() {
  const data = readSave();
  return data ? data.wave + 1 : 0; // saved just before the wave number goes up
}

export const clearSave = () => removeKey(KEY);

/** Replaces the game's state with the saved one. Returns false if there was no usable save. */
export function loadGame(game: TdGame) {
  const data = readSave();
  if (!data) return false;
  game.reset();
  game.setPath(data.path);
  game.towers = data.towers.map((t) => ({ ...t, bonus: {}, partners: 0 }));
  const tower = (i: number) => game.towers[i] ?? null;
  game.enemies = data.enemies.map((e) => ({
    ...e,
    lastTower: tower(e.lastTower),
    burnBy: tower(e.burnBy),
    poisonBy: tower(e.poisonBy),
    lastHit: e.lastHit ?? -Infinity,
  }));
  game.spawners = data.spawners;
  game.nextQueue = data.nextQueue;
  game.wave = data.wave;
  game.waveTimer = data.waveTimer;
  game.coins = data.coins;
  game.lives = data.lives;
  game.streak = data.streak;
  game.bossWaves = data.bossWaves;
  game.time = data.time;
  game.defaultMode = data.defaultMode;
  game.stats = data.stats;
  game.refreshCombos();
  return true;
}
