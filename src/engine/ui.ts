// Rectangular on-screen buttons (panels, prompts): drawing and tap handling in one place.
import { fitSize, INK, PAPER, rect, text } from './draw';
import { input } from './input';
import { inRect, type Rect, type Vec } from './math';

export interface RectButton extends Rect {
  label: string;
  onTap: () => void;
  enabled?: boolean; // false: drawn faded and ignores taps
  active?: boolean; // drawn inverted (filled black), e.g. a toggle that is on
}

/** Runs the button under each tap. Returns the taps that hit no button, for the caller to handle. */
export function tapButtons(buttons: RectButton[], taps: Vec[]): Vec[] {
  return taps.filter((t) => {
    const b = buttons.find((b) => inRect(t, b));
    if (b && b.enabled !== false) b.onTap();
    return !b;
  });
}

/** Outlined (or filled when active) box with a centered label; `content` replaces the label if given. */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  b: RectButton,
  size = 13,
  content?: (ctx: CanvasRenderingContext2D) => void,
) {
  ctx.globalAlpha = b.enabled === false ? 0.35 : 1;
  rect(ctx, b.x, b.y, b.w, b.h, !!b.active);
  ctx.fillStyle = b.active ? PAPER : INK;
  if (content) content(ctx);
  else text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, size);
  ctx.fillStyle = INK;
  ctx.globalAlpha = 1;
}

export interface Choice {
  label: string;
  onPick: () => void;
}

/**
 * A start screen: a title, a subtitle and a column of choices. Tap a choice or press its number key (1, 2, ...).
 */
export class ChoiceMenu {
  constructor(
    private title: string,
    private choices: () => Choice[],
    private subtitle: () => string = () => '',
  ) {}

  private buttons(w: number, h: number): RectButton[] {
    const list = this.choices();
    const bw = Math.min(280, w - 40);
    const top = h / 2 - (list.length * 46) / 2 + 20;
    return list.map((c, i) => ({
      x: (w - bw) / 2,
      y: top + i * 46,
      w: bw,
      h: 38,
      label: `${i + 1}. ${c.label}`,
      onTap: c.onPick,
    }));
  }

  update(w: number, h: number) {
    const list = this.choices();
    const key = list.findIndex((_, i) => input.hit(`Digit${i + 1}`));
    if (key >= 0) return list[key].onPick();
    tapButtons(this.buttons(w, h), input.taps);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const buttons = this.buttons(w, h);
    text(ctx, this.title, w / 2, buttons[0].y - 52, 30);
    const sub = this.subtitle();
    text(ctx, sub, w / 2, buttons[0].y - 22, fitSize(ctx, sub, w - 24, 13));
    for (const b of buttons) drawButton(ctx, b, 15);
  }
}
