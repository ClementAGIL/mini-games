import { rect, text } from '../engine/draw';
import { input } from '../engine/input';
import { inRect, type Rect } from '../engine/math';
import type { GameEntry, Scene } from '../engine/scene';

export class Menu implements Scene {
  private selected = 0;
  private cards: Rect[] = [];

  constructor(
    private games: GameEntry[],
    private start: (game: GameEntry) => void,
  ) {}

  layout(w: number, h: number) {
    const n = this.games.length;
    const cols = w >= h ? n : 2;
    const rows = Math.ceil(n / cols);
    const gap = 16;
    const top = 90;
    const cw = Math.min(200, (w - gap * (cols + 1)) / cols);
    const ch = Math.min(180, (h - top - gap * (rows + 1)) / rows);
    const left = (w - (cw * cols + gap * (cols - 1))) / 2;
    this.cards = this.games.map((_, i) => ({
      x: left + (i % cols) * (cw + gap),
      y: top + Math.floor(i / cols) * (ch + gap),
      w: cw,
      h: ch,
    }));
    return [];
  }

  update() {
    const n = this.games.length;
    if (input.hit('ArrowRight', 'ArrowDown')) this.selected = (this.selected + 1) % n;
    if (input.hit('ArrowLeft', 'ArrowUp')) this.selected = (this.selected + n - 1) % n;
    if (input.hit('Enter', 'Space')) this.open(this.selected);
    for (const t of input.taps) {
      const i = this.cards.findIndex((c) => inRect(t, c));
      if (i >= 0) this.open(i);
    }
  }

  private open(i: number) {
    this.selected = i;
    this.start(this.games[i]);
  }

  draw(ctx: CanvasRenderingContext2D, w: number) {
    text(ctx, 'MINI GAMES', w / 2, 45, 34);
    this.games.forEach((g, i) => {
      const c = this.cards[i];
      ctx.lineWidth = i === this.selected && !input.isTouch ? 4 : 2;
      rect(ctx, c.x, c.y, c.w, c.h);
      ctx.lineWidth = 2;
      g.icon(ctx, c.x + c.w / 2, c.y + c.h * 0.42, Math.min(c.w, c.h) * 0.22);
      text(ctx, g.name, c.x + c.w / 2, c.y + c.h - 26, 18);
    });
  }
}
