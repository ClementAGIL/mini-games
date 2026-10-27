// Polygon Horde HUD: XP bar, run time, level and kills, player HP, boss bar, and the inventory (bottom left).
import { bar, rect, text } from '../../engine/draw';
import { WEAPON_SLOTS, ITEM_SLOTS, xpToNext } from './data';
import type { Run } from './game';
import { drawItem, drawWeapon } from './shapes';

const SLOT = 30; // inventory slot size in px

/** mm:ss */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function drawHud(ctx: CanvasRenderingContext2D, run: Run, w: number, h: number, best: number) {
  bar(ctx, 1, 1, w - 2, run.xp / xpToNext(run.level), false, 5);
  text(ctx, clock(run.time), w / 2, 26, 22);
  text(ctx, `Lv ${run.level} · ${run.kills} kills · best ${clock(best)}`, w / 2, 48, 12);
  const hpW = Math.min(130, w * 0.25);
  bar(ctx, w - hpW - 16, 16, hpW, run.player.hp / run.player.maxHp, false, 8);
  text(ctx, `${Math.ceil(run.player.hp)} / ${run.player.maxHp}`, w - 16, 36, 11, 'right');
  if (run.boss) {
    const bw = Math.min(300, w - 40);
    text(ctx, 'BOSS', w / 2, 64, 11);
    bar(ctx, (w - bw) / 2, 72, bw, run.boss.hp / run.boss.maxHp, false, 6);
  }
  drawInventory(ctx, run, h);
}

// Weapons on one row (level under each, filled box once evolved), items on the row below.
function drawInventory(ctx: CanvasRenderingContext2D, run: Run, h: number) {
  const y1 = h - SLOT * 2 - 24;
  const y2 = h - SLOT - 12;
  for (let i = 0; i < WEAPON_SLOTS; i++) {
    const x = 12 + i * (SLOT + 4);
    ctx.globalAlpha = 0.3;
    rect(ctx, x, y1, SLOT, SLOT);
    ctx.globalAlpha = 1;
    const wp = run.weapons[i];
    if (!wp) continue;
    drawWeapon(ctx, wp.kind, x + SLOT / 2, y1 + SLOT / 2 - 2, SLOT * 0.32);
    text(ctx, wp.evolved ? '★' : `${wp.level}`, x + SLOT - 5, y1 + SLOT - 6, 9);
  }
  for (let i = 0; i < ITEM_SLOTS; i++) {
    const x = 12 + i * (SLOT + 4);
    ctx.globalAlpha = 0.3;
    rect(ctx, x, y2, SLOT, SLOT);
    ctx.globalAlpha = 1;
    const it = run.items[i];
    if (it) drawItem(ctx, it, x + SLOT / 2, y2 + SLOT / 2, SLOT * 0.32);
  }
}
