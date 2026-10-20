// Short-lived visual feedback shared by the games: floating score popups, explosion sparks and a screen flash.
// Positions are in screen pixels.
import { INK, line, text } from './draw';
import { rand } from './math';

interface Popup {
  text: string;
  x: number;
  y: number;
  life: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const POPUP_TIME = 0.8;
const SPARK_TIME = 0.5;

export class Effects {
  private popups: Popup[] = [];
  private sparks: Spark[] = [];
  private flashLeft = 0;
  private flashTime = 1;

  /** Text that floats up and fades, e.g. "+20". */
  popup(str: string, x: number, y: number) {
    this.popups.push({ text: str, x, y, life: POPUP_TIME });
  }

  /** Short lines flying out from (x, y). */
  burst(x: number, y: number, count = 8, speed = 120) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.4, 1) * speed;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: SPARK_TIME });
    }
  }

  /** Whole screen briefly darkened, e.g. when a game ends. */
  flash(duration = 0.4) {
    this.flashLeft = this.flashTime = duration;
  }

  clear() {
    this.popups = [];
    this.sparks = [];
    this.flashLeft = 0;
  }

  update(dt: number) {
    for (const p of this.popups) p.y -= 30 * dt;
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    this.sparks = this.sparks.filter((s) => (s.life -= dt) > 0);
    this.flashLeft = Math.max(0, this.flashLeft - dt);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    for (const s of this.sparks) {
      ctx.globalAlpha = s.life / SPARK_TIME;
      line(ctx, s.x, s.y, s.x - s.vx * 0.05, s.y - s.vy * 0.05);
    }
    for (const p of this.popups) {
      ctx.globalAlpha = p.life / POPUP_TIME;
      text(ctx, p.text, p.x, p.y, 14);
    }
    if (this.flashLeft > 0) {
      ctx.globalAlpha = 0.35 * (this.flashLeft / this.flashTime);
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }
}
