// The Tower Defense side panel: status lines, speed controls, tower shop, info about what is selected,
// and the selected tower's actions.
import { fitSize, text } from '../../engine/draw';
import { clamp, type Rect } from '../../engine/math';
import { drawButton, type RectButton } from '../../engine/ui';
import {
  COMBO_STAT_LABEL,
  comboPartners,
  ENEMIES,
  KINDS,
  towerColor,
  TOWERS,
  towerStats,
  xpNeeded,
  type Bonus,
  type ComboStat,
  type Kind,
} from './data';
import { AREA_TOWERS, TARGET_LABEL, type Enemy, type Tower } from './model';
import { compact, drawShape } from './shapes';
import type { TowerDefense } from './towerdefense';

const GAP = 6; // between panel buttons
const ROW = 30; // height of a button row

interface PanelButton extends RectButton {
  icon?: Kind; // shop buttons draw the tower shape, name and price
}

/** Vertical layout of the side panel, shared by hit-testing and drawing. */
function panelLayout({ y, w, h }: Rect) {
  const cols = w > 320 ? 4 : 2;
  const rows = Math.ceil(KINDS.length / cols);
  const ctrlY = y + 42;
  const shopY = ctrlY + 36;
  // Info (3 lines) + upgrade/sell row + target row take 122px under the shop.
  // Shop buttons shrink on short screens (one-line labels below 34px) so the rows under them stay visible.
  const bh = clamp((y + h - shopY - 122 - GAP * rows) / rows, 18, 56);
  const infoY = shopY + rows * (bh + GAP) + 6;
  return { cols, ctrlY, shopY, bh, infoY, actionY: infoY + 50, targetY: infoY + 86 };
}

export function panelButtons(scene: TowerDefense): PanelButton[] {
  const layout = panelLayout(scene.panel);
  return [...controlButtons(scene, layout.ctrlY), ...shopButtons(scene, layout), ...actionButtons(scene, layout)];
}

/** Pause, ×2 speed and Send next wave, under the status lines. */
function controlButtons(scene: TowerDefense, y: number): PanelButton[] {
  const { x, w } = scene.panel;
  const third = (w - GAP * 2) / 3;
  const at = (i: number) => ({ x: x + i * (third + GAP), y, w: third, h: ROW });
  return [
    { ...at(0), label: scene.paused ? '▶' : '❚❚', active: scene.paused, onTap: () => (scene.paused = !scene.paused) },
    { ...at(1), label: '×2', active: scene.fast, onTap: () => (scene.fast = !scene.fast) },
    { ...at(2), label: 'Send', onTap: () => scene.game.sendNow() },
  ];
}

function shopButtons(scene: TowerDefense, { cols, shopY, bh }: ReturnType<typeof panelLayout>): PanelButton[] {
  const { x, w } = scene.panel;
  const bw = (w - GAP * (cols - 1)) / cols;
  return KINDS.map((k, i) => ({
    x: x + (i % cols) * (bw + GAP),
    y: shopY + Math.floor(i / cols) * (bh + GAP),
    w: bw,
    h: bh,
    label: `${TOWERS[k].cost}`,
    icon: k,
    active: scene.build === k,
    enabled: scene.game.coins >= TOWERS[k].cost,
    onTap: () => scene.chooseBuild(k),
  }));
}

/** Up / Sell / Target for the selected tower; with no tower selected, the "All towers" target mode. */
function actionButtons(scene: TowerDefense, layout: ReturnType<typeof panelLayout>): PanelButton[] {
  const { game } = scene;
  const { x, w } = scene.panel;
  if (scene.selected) return towerButtons(scene, scene.selected, layout);
  const label = `All towers: ${TARGET_LABEL[game.defaultMode]}`;
  return [{ x, y: layout.actionY, w, h: ROW, label, onTap: () => game.cycleAllTargets() }];
}

function towerButtons(scene: TowerDefense, t: Tower, { actionY, targetY }: ReturnType<typeof panelLayout>) {
  const { game } = scene;
  const { x, w } = scene.panel;
  const half = (w - GAP) / 2;
  const cost = game.upgradePrice(t);
  // Area towers show the target row disabled, so it's clear why there is no mode to pick.
  const area = AREA_TOWERS.includes(t.kind);
  const up: PanelButton = {
    x,
    y: actionY,
    w: half,
    h: ROW,
    label: `Up ${compact(cost)}`,
    onTap: () => game.upgrade(t),
  };
  const sell: PanelButton = {
    ...up,
    x: x + half + GAP,
    label: `Sell ${compact(game.sellValue(t))}`,
    onTap: () => scene.sell(),
  };
  const target: PanelButton = {
    x,
    y: targetY,
    w,
    h: ROW,
    label: area ? 'Target: all in range' : `Target: ${TARGET_LABEL[t.mode]}`,
    enabled: !area,
    onTap: () => game.cycleTarget(t),
  };
  return [{ ...up, enabled: game.coins >= cost }, sell, target];
}

export function drawPanel(ctx: CanvasRenderingContext2D, scene: TowerDefense) {
  const { game } = scene;
  const { x, y, w } = scene.panel;
  const next = game.waveTimer > 0 ? `${Math.ceil(game.waveTimer)}s` : '-';
  const streak = Math.round((game.streakMult() - 1) * 100);
  text(ctx, `Wave ${game.wave}  ♥ ${game.lives}  Coins ${compact(game.coins)}`, x, y + 10, 13, 'left');
  text(ctx, `Next ${next}  Streak +${streak}% (${game.streak})  Best ${game.best}`, x, y + 28, 11, 'left');

  for (const b of panelButtons(scene))
    drawButton(ctx, b, 13, b.icon ? (c) => drawShopContent(c, b, b.icon!) : undefined);

  const { infoY } = panelLayout(scene.panel);
  infoLines(scene).forEach((l, i) =>
    text(ctx, l, x, infoY + 6 + i * 15, fitSize(ctx, l, w, i === 0 ? 12 : 10), 'left'),
  );
}

/** Tower shape, then name and price (on one line when the button is short). */
function drawShopContent(ctx: CanvasRenderingContext2D, b: PanelButton, kind: Kind) {
  const s = Math.min(b.h * (b.h < 34 ? 0.34 : 0.28), b.w * 0.18);
  const ink = ctx.fillStyle;
  drawShape(ctx, kind, b.x + s + 6, b.y + b.h / 2, s, towerColor(kind, 1));
  ctx.fillStyle = ink;
  const tx = b.x + s * 2 + 11;
  const room = b.x + b.w - tx - 3;
  const name = TOWERS[kind].name;
  if (b.h < 34) {
    const str = `${name} ${b.label}`;
    text(ctx, str, tx, b.y + b.h / 2, fitSize(ctx, str, room, 11), 'left');
  } else {
    text(ctx, name, tx, b.y + b.h * 0.32, fitSize(ctx, name, room, 11), 'left');
    text(ctx, b.label, tx, b.y + b.h * 0.7, 11, 'left');
  }
}

/** Up to 3 lines about the selected tower, the tower being placed, or the selected enemy. */
function infoLines(scene: TowerDefense): string[] {
  if (scene.selected) return towerLines(scene);
  if (scene.build) return buildLines(scene, scene.build);
  if (scene.selectedEnemy) return enemyLines(scene.selectedEnemy);
  return [];
}

function towerLines(scene: TowerDefense): string[] {
  const t = scene.selected!;
  const st = towerStats(t.kind, t.level, t.bonus);
  const xp = `XP ${compact(t.xp)}/${compact(xpNeeded(t.level))}`;
  const combos = t.partners ? `★ Combo ${bonusText(t.bonus)}` : `Combo with ${partnerNames(t.kind)}`;
  const dealt = `dealt ${compact(Math.round(t.damageDone))}`;
  return [`${TOWERS[t.kind].name} Lv${t.level} · ${xp} · ${dealt}`, statsLine(t.kind, st), combos];
}

function buildLines(scene: TowerDefense, kind: Kind): string[] {
  const { game, pending } = scene;
  const preview = pending ? game.comboPreview(kind, pending.tx, pending.ty) : null;
  const st = towerStats(kind, 1, preview?.bonus);
  const title = !pending
    ? 'tap a free tile'
    : game.coins < TOWERS[kind].cost
      ? 'not enough coins'
      : 'tap again to build';
  const combos = preview?.self ? `★ Combo here ${bonusText(preview.bonus)}` : `Combo with ${partnerNames(kind)}`;
  return [`${TOWERS[kind].name}: ${title}`, statsLine(kind, st), combos];
}

function statsLine(kind: Kind, st: ReturnType<typeof towerStats>) {
  const extra: Partial<Record<Kind, string>> = {
    pentagon: ` · pierce ${st.pierce}`,
    hexagon: ` · slow ${Math.round(st.slow * 100)}%`,
    octagon: ` · +${st.chains} jumps`,
  };
  const dmg = st.damage < 100 ? st.damage.toFixed(1) : compact(Math.round(st.damage));
  return `dmg ${dmg} · ${st.rate.toFixed(1)}/s · range ${st.range.toFixed(1)}${extra[kind] ?? ''}`;
}

/** "+20% range, +10% rate" */
function bonusText(bonus: Bonus) {
  return (Object.entries(bonus) as [ComboStat, number][])
    .map(([stat, v]) => `+${Math.round(v * 100)}% ${COMBO_STAT_LABEL[stat]}`)
    .join(', ');
}

function partnerNames(kind: Kind) {
  return comboPartners(kind)
    .map((p) => TOWERS[p.partner].name)
    .join(' / ');
}

function enemyLines(e: Enemy): string[] {
  const power = ENEMIES[e.kind].power;
  const title = `${e.boss ? 'BOSS · ' : ''}${e.small ? `${power} minion` : power} (wave ${e.wave})`;
  const hp = `HP ${compact(Math.ceil(e.hp))}/${compact(Math.ceil(e.maxHp))} · speed ${e.speed.toFixed(1)}`;
  const powers = [
    e.maxShield > 0 && `shield ${compact(Math.ceil(e.shield))}/${compact(Math.ceil(e.maxShield))}`,
    e.regen > 0 && `regen ${e.regen.toFixed(1)}/s`,
    e.armor > 0 && `armor ${e.armor.toFixed(1)}`,
    e.splits > 0 && `splits into ${e.splits}`,
    e.blink > 0 && `blinks ${e.blink.toFixed(1)} tiles`,
    e.summon > 0 && `minion every ${e.summon.toFixed(1)}s`,
    `costs ${e.lives} ♥`,
  ].filter(Boolean);
  return [title, hp, powers.join(' · ')];
}
