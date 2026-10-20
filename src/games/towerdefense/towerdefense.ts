// Tower Defense scene: connects input, screen layout, the game simulation (game.ts), saving (save.ts)
// and drawing (render.ts, panel.ts).
import { overlay, text } from '../../engine/draw';
import { input } from '../../engine/input';
import { clamp, dist } from '../../engine/math';
import type { Scene } from '../../engine/scene';
import { drawButton, tapButtons, type RectButton } from '../../engine/ui';
import { KINDS, type Kind } from './data';
import { TdGame } from './game';
import type { Enemy, Tower } from './model';
import { drawSummary } from './overlays';
import { drawPanel, panelButtons } from './panel';
import { COLS, ROWS } from './path';
import { drawWorld, type MapView } from './render';
import { clearSave, loadGame, savedWave, saveGame } from './save';

export class TowerDefense implements Scene {
  game = new TdGame();
  paused = false;
  fast = false;
  build: Kind | null = null;
  pending: { tx: number; ty: number } | null = null; // tile tapped once while building
  selected: Tower | null = null;
  selectedEnemy: Enemy | null = null;
  /** Wave of a saved game waiting for "Continue / New game", 0 when there is none. */
  resumeWave = savedWave();
  private w = 0;
  private h = 0;

  // Layout, in CSS pixels.
  map: MapView = { ox: 0, oy: 0, tile: 0 };
  panel = { x: 0, y: 0, w: 0, h: 0 };

  constructor() {
    this.game.onWaveStart = () => saveGame(this.game);
  }

  /** Back to the menu: the scene is kept while the app runs, so pause until the player returns. */
  leave() {
    this.paused = true;
  }

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    if (w >= h) {
      const pw = clamp(w * 0.22, 176, 240);
      this.panel = { x: w - pw - 8, y: 8, w: pw, h: h - 16 };
      // Left margin keeps the map clear of the global back button.
      const availW = this.panel.x - 60;
      const tile = Math.floor(Math.min(availW / COLS, (h - 16) / ROWS));
      this.map = { tile, ox: Math.floor(56 + (availW - tile * COLS) / 2), oy: Math.floor((h - tile * ROWS) / 2) };
    } else {
      const tile = Math.floor((w - 16) / COLS);
      this.map = { tile, ox: Math.floor((w - tile * COLS) / 2), oy: 60 };
      const top = this.map.oy + tile * ROWS + 10;
      this.panel = { x: 8, y: top, w: w - 16, h: h - top - 8 };
    }
    return [];
  }

  private restart() {
    this.game.reset();
    this.paused = false;
    this.build = null;
    this.pending = null;
    this.selected = null;
    this.selectedEnemy = null;
  }

  update(dt: number) {
    if (this.resumeWave) return this.updateResumePrompt();
    if (this.game.over) {
      if (input.confirmed()) this.restart();
      return;
    }
    this.handleInput();
    if (this.selectedEnemy && !this.game.enemies.includes(this.selectedEnemy)) this.selectedEnemy = null;
    if (this.paused) return;
    for (let i = 0; i < (this.fast ? 2 : 1); i++) this.game.simulate(dt);
    if (this.game.over) clearSave();
  }

  // ---------- resume prompt ----------

  private promptButtons(): RectButton[] {
    const bw = 130;
    const y = this.h / 2 + 10;
    return [
      { x: this.w / 2 - bw - 8, y, w: bw, h: 36, label: 'Continue', onTap: () => this.resume() },
      { x: this.w / 2 + 8, y, w: bw, h: 36, label: 'New game', onTap: () => this.newGame() },
    ];
  }

  private updateResumePrompt() {
    if (input.hit('Enter', 'Space')) return this.resume();
    if (input.hit('KeyN')) return this.newGame();
    tapButtons(this.promptButtons(), input.taps);
  }

  private resume() {
    // Paused: give the player a moment to look before the wave starts.
    if (loadGame(this.game)) this.paused = true;
    this.resumeWave = 0;
  }

  private newGame() {
    clearSave();
    this.restart();
    this.resumeWave = 0;
  }

  // ---------- playing ----------

  private handleInput() {
    const { game } = this;
    const sel = this.selected;
    KINDS.forEach((k, i) => input.hit(`Digit${i + 1}`) && this.chooseBuild(k));
    if (input.hit('KeyU') && sel) game.upgrade(sel);
    if (input.hit('KeyS') && sel) this.sell();
    if (input.hit('KeyT') && sel) game.cycleTarget(sel);
    if (input.hit('KeyG')) game.cycleAllTargets();
    if (input.hit('KeyP')) this.paused = !this.paused;
    if (input.hit('KeyF')) this.fast = !this.fast;
    if (input.hit('KeyN', 'Space')) game.sendNow();

    for (const t of tapButtons(panelButtons(this), input.taps)) {
      const { ox, oy, tile } = this.map;
      const m = { x: (t.x - ox) / tile, y: (t.y - oy) / tile };
      if (m.x >= 0 && m.y >= 0 && m.x < COLS && m.y < ROWS) this.tapMap(m.x, m.y);
    }
  }

  /** Tap on the map, in tile units: a tower, else an enemy, else a tile to build on. */
  private tapMap(mx: number, my: number) {
    const tx = Math.floor(mx);
    const ty = Math.floor(my);
    const tower = this.game.towerAt(tx, ty);
    if (tower) {
      this.select(tower);
      return;
    }
    const enemy = this.enemyAt(mx, my);
    if (enemy) {
      this.select(null);
      this.build = null;
      this.pending = null;
      this.selectedEnemy = enemy;
      return;
    }
    if (this.build && this.game.isFree(tx, ty)) {
      // First tap previews (range and combo bonuses), a second tap on the same tile builds.
      if (this.pending?.tx === tx && this.pending.ty === ty) {
        if (this.game.build(this.build, tx, ty)) this.pending = null;
      } else {
        this.pending = { tx, ty };
      }
      return;
    }
    this.select(null);
    this.pending = null;
    this.selectedEnemy = null;
  }

  private enemyAt(mx: number, my: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = 0.6; // tiles: generous, enemies are small on a phone
    for (const e of this.game.enemies) {
      const d = dist(e.pos, { x: mx, y: my });
      if (d < bestDist) [best, bestDist] = [e, d];
    }
    return best;
  }

  private select(tower: Tower | null) {
    this.selected = tower;
    if (tower) {
      this.build = null;
      this.pending = null;
      this.selectedEnemy = null;
    }
  }

  chooseBuild(kind: Kind) {
    this.build = this.build === kind ? null : kind;
    this.pending = null;
    this.selected = null;
    this.selectedEnemy = null;
  }

  sell() {
    if (!this.selected) return;
    this.game.sell(this.selected);
    this.selected = null;
  }

  // ---------- drawing ----------

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.resumeWave) {
      overlay(ctx, w, h, `Resume wave ${this.resumeWave}?`, '');
      for (const b of this.promptButtons()) drawButton(ctx, b, 15);
      return;
    }
    const ui = { selected: this.selected, selectedEnemy: this.selectedEnemy, build: this.build, pending: this.pending };
    drawWorld(ctx, this.game, this.map, ui);
    drawPanel(ctx, this);
    if (this.paused && !this.game.over) {
      text(ctx, 'PAUSED', this.map.ox + (COLS * this.map.tile) / 2, this.map.oy + (ROWS * this.map.tile) / 2, 28);
    }
    if (this.game.over) drawSummary(ctx, this.game, w, h, input.hint('restart'));
  }
}
