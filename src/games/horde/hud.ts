// Polygon Horde HUD: XP bar, run time, level and kills, player HP, boss bar, weapons, artifacts and stats (bottom left).
import { bar, rect, text } from '../../engine/draw';
import { STAT_KINDS, WEAPON_SLOTS, xpToNext, type StatKind } from './data';
import type { Run } from './game';
import { bossDef } from './bosses';
import { drawArtifact, drawStat, drawWeapon } from './icons';

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
  const bosses = run.bosses;
  if (bosses.length) {
    const bw = Math.min(300, w - 40);
    const hp = bosses.reduce((sum, e) => sum + e.hp, 0);
    const maxHp = bosses.reduce((sum, e) => sum + e.maxHp, 0);
    text(ctx, bossDef(bosses[0]).name.toUpperCase(), w / 2, 64, 11);
    bar(ctx, (w - bw) / 2, 72, bw, hp / maxHp, false, 6);
  }
  drawInventory(ctx, run, h);
}

// Weapons then artifacts on one row (level in the corner, ★ once evolved), the stats taken on the row below.
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
  const artifactsX = 12 + WEAPON_SLOTS * (SLOT + 4) + 16;
  run.relics.owned.forEach((k, i) => drawArtifact(ctx, k, artifactsX + i * (SLOT + 2), y1 + SLOT / 2, SLOT * 0.42));
  STAT_KINDS.filter((k) => run.mods[k] > 0).forEach((k, i) => {
    const x = 12 + i * (SLOT + 10) + SLOT / 2;
    drawStat(ctx, k, x, y2 + 8, 8);
    text(ctx, statShort(k, run.mods[k]), x, y2 + 26, 9);
  });
}

/** Total of a stat in a few characters: "+35%", "+2", "1.4/s". */
function statShort(k: StatKind, v: number) {
  if (k === 'pierce' || k === 'luck') return `+${v}`;
  if (k === 'regen') return `${Math.round(v * 10) / 10}/s`;
  return `+${Math.round(v * 100)}%`;
}
