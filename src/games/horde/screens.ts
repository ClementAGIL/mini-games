// Polygon Horde pop-up screens drawn over the paused world: level-up cards, chest, full-bag swap, game over.
import { fitSize, INK, PAPER, rect, text } from '../../engine/draw';
import { input } from '../../engine/input';
import { compact } from '../../engine/math';
import { drawButton, type RectButton } from '../../engine/ui';
import { baseStats, WEAPONS, weaponName, type WeaponKind } from './arsenal';
import { HEAL_CARD, ITEMS, MAX_HP_CARD, MAX_LEVEL } from './data';
import type { Run } from './game';
import { clock } from './hud';
import { itemName, itemText } from './inventory';
import type { Card, Item } from './model';
import { drawItem, drawWeapon } from './shapes';

type Icon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

export interface CardView {
  title: string;
  sub: string;
  lines: string[];
  icon: Icon;
}

const num = (v: number) => `${Math.round(v * 100) / 100}`;

/** "Damage 10 → 14"-style lines for what changes between two levels. */
function statDiff(kind: WeaponKind, from: number, to: number): string[] {
  const a = baseStats(kind, from, false);
  const b = baseStats(kind, to, false);
  const [count, size, extra] = WEAPONS[kind].labels;
  const rows: [string, number, number][] = [
    ['Damage', a.damage, b.damage],
    [kind === 'orbit' ? 'Re-hit' : 'Delay', a.cooldown, b.cooldown],
    [count, a.count, b.count],
    [size, a.size, b.size],
    [extra, a.extra, b.extra],
  ];
  return rows.filter(([label, x, y]) => label && x !== y).map(([label, x, y]) => `${label} ${num(x)} → ${num(y)}`);
}

export function describeCard(card: Card, run: Run): CardView {
  if (card.kind === 'heal') return { title: 'Heal', sub: '', lines: [`+${HEAL_CARD} HP`], icon: crossIcon };
  if (card.kind === 'maxhp') return { title: 'Vitality', sub: '', lines: [`+${MAX_HP_CARD} max HP`], icon: crossIcon };
  const kind = card.weapon;
  const def = WEAPONS[kind];
  const icon: Icon = (ctx, x, y, r) => drawWeapon(ctx, kind, x, y, r);
  const owned = run.weapons.find((w) => w.kind === kind);
  if (!owned) return { title: def.name, sub: 'NEW', lines: [def.text], icon };
  const lines = statDiff(kind, owned.level, owned.level + 1);
  if (owned.level + 1 === MAX_LEVEL) lines.push(`Evolves with ${ITEMS[def.evo.item].name} III`);
  return { title: def.name, sub: `Lv ${owned.level} → ${owned.level + 1}`, lines, icon };
}

const crossIcon: Icon = (ctx, x, y, r) => drawItem(ctx, { kind: 'heart', tier: 3 }, x, y, r);

/** Faded world behind a screen, and a title above it. */
function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, y: number) {
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  text(ctx, title, w / 2, y, 26);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  rect(ctx, x, y, w, h);
}

// ---------- level-up ----------

/** Cards side by side in landscape, stacked in portrait. Key n picks card n. */
export function cardButtons(w: number, h: number, n: number, onPick: (i: number) => void): RectButton[] {
  const wide = w >= h;
  const cw = wide ? Math.min(210, (w - 40 - 16 * (n - 1)) / n) : Math.min(340, w - 32);
  const ch = wide ? Math.min(190, h - 140) : Math.min(120, (h - 150) / n - 12);
  const left = wide ? (w - (cw * n + 16 * (n - 1))) / 2 : (w - cw) / 2;
  const top = wide ? (h - ch) / 2 + 20 : (h - (ch * n + 12 * (n - 1))) / 2 + 20;
  return Array.from({ length: n }, (_, i) => ({
    x: wide ? left + i * (cw + 16) : left,
    y: wide ? top : top + i * (ch + 12),
    w: cw,
    h: ch,
    label: '',
    onTap: () => onPick(i),
  }));
}

function drawCard(ctx: CanvasRenderingContext2D, b: RectButton, v: CardView, index: number) {
  drawButton(ctx, b, 13, () => {
    v.icon(ctx, b.x + 24, b.y + 26, 13);
    text(ctx, `${index + 1}. ${v.title}`, b.x + 46, b.y + 22, fitSize(ctx, v.title, b.w - 60, 16), 'left');
    text(ctx, v.sub, b.x + 46, b.y + 40, 11, 'left');
    const rows = Math.max(1, Math.floor((b.h - 58) / 16) + 1);
    v.lines.slice(0, rows).forEach((l, i) => {
      text(ctx, l, b.x + 12, b.y + 60 + i * 16, fitSize(ctx, l, b.w - 20, 12), 'left');
    });
  });
}

export function drawLevelUp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  buttons: RectButton[],
  views: CardView[],
) {
  backdrop(ctx, w, h, 'LEVEL UP', buttons[0].y - 28);
  buttons.forEach((b, i) => drawCard(ctx, b, views[i], i));
}

// ---------- chest ----------

export function drawChest(ctx: CanvasRenderingContext2D, w: number, h: number, items: Item[]) {
  const bw = Math.min(340, w - 32);
  const bh = 70 + items.length * 40;
  const x = (w - bw) / 2;
  const y = (h - bh) / 2;
  backdrop(ctx, w, h, 'CHEST', y - 24);
  box(ctx, x, y, bw, bh);
  items.forEach((it, i) => {
    const ry = y + 28 + i * 40;
    drawItem(ctx, it, x + 28, ry, 12);
    text(ctx, itemName(it), x + 52, ry - 7, 14, 'left');
    text(ctx, itemText(it), x + 52, ry + 10, 11, 'left');
  });
  text(ctx, input.hint('continue'), w / 2, y + bh - 20, 13);
}

// ---------- swap ----------

/** 6 slot buttons (3 columns) and "Leave it". Keys 1–6 replace a slot, 7 leaves the new item. */
export function swapButtons(w: number, h: number, run: Run, onPick: (slot: number) => void): RectButton[] {
  const bw = Math.min(150, (w - 52) / 3);
  const left = (w - (bw * 3 + 20)) / 2;
  const top = h / 2 - 20;
  const slots: RectButton[] = run.items.map((it, i) => ({
    x: left + (i % 3) * (bw + 10),
    y: top + Math.floor(i / 3) * 54,
    w: bw,
    h: 46,
    label: itemName(it),
    onTap: () => onPick(i),
  }));
  const leave = {
    x: (w - bw) / 2,
    y: top + 116,
    w: bw,
    h: 38,
    label: `${slots.length + 1}. Leave it`,
    onTap: () => onPick(-1),
  };
  return [...slots, leave];
}

export function drawSwap(ctx: CanvasRenderingContext2D, w: number, h: number, run: Run, buttons: RectButton[]) {
  const it = run.pendingItems[0];
  backdrop(ctx, w, h, 'BAG FULL', buttons[0].y - 100);
  drawItem(ctx, it, w / 2 - 80, buttons[0].y - 56, 14);
  text(ctx, `${itemName(it)}: ${itemText(it)}`, w / 2 - 58, buttons[0].y - 56, 14, 'left');
  text(ctx, 'Replace which item?', w / 2, buttons[0].y - 22, 12);
  buttons.forEach((b, i) => {
    const old = run.items[i];
    if (!old) return drawButton(ctx, b, 13);
    drawButton(ctx, b, 12, () => {
      drawItem(ctx, old, b.x + 18, b.y + b.h / 2, 10);
      text(
        ctx,
        `${i + 1}. ${itemName(old)}`,
        b.x + 34,
        b.y + b.h / 2,
        fitSize(ctx, itemName(old), b.w - 56, 12),
        'left',
      );
    });
  });
}

// ---------- game over ----------

export function drawGameOver(ctx: CanvasRenderingContext2D, w: number, h: number, run: Run, best: number) {
  const bw = Math.min(340, w - 32);
  const bh = 130 + run.weapons.length * 24;
  const x = (w - bw) / 2;
  const y = (h - bh) / 2;
  backdrop(ctx, w, h, 'GAME OVER', y - 24);
  box(ctx, x, y, bw, bh);
  const record = run.time >= best ? 'new best!' : `best ${clock(best)}`;
  text(ctx, `Survived ${clock(run.time)} · ${record}`, w / 2, y + 24, 15);
  text(ctx, `${run.kills} kills · level ${run.level}`, w / 2, y + 46, 13);
  run.weapons.forEach((wp, i) => {
    const ry = y + 76 + i * 24;
    drawWeapon(ctx, wp.kind, x + 30, ry, 8);
    text(ctx, weaponName(wp.kind, wp.evolved), x + 48, ry, 13, 'left');
    text(ctx, `${compact(Math.round(wp.dealt))} damage`, x + bw - 20, ry, 13, 'right');
  });
  text(ctx, input.hint('restart'), w / 2, y + bh - 20, 13);
}
