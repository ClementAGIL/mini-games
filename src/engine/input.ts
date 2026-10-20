// Keyboard and touch input in one place. Touch buttons emulate keyboard codes, swipes emulate arrow presses,
// so games only check key codes. Drags (pointers that did not start on a button) are exposed for joysticks.
import { circle, text } from './draw';
import { dist, type Vec } from './math';

// On-screen touch button. `id` is the keyboard code it emulates (e.g. 'ArrowLeft'),
// so games only check one code for both keyboard and touch.
export interface Button {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
}

/** Key codes for the four directions. */
export interface DirKeys {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
}

export const ARROWS: DirKeys = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'] };
export const WASD: DirKeys = { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] };
/** Arrows or WASD: the usual one-player controls. */
export const ANY_DIR: DirKeys = {
  up: [...ARROWS.up, ...WASD.up],
  down: [...ARROWS.down, ...WASD.down],
  left: [...ARROWS.left, ...WASD.left],
  right: [...ARROWS.right, ...WASD.right],
};
const DIR_VEC: Record<keyof DirKeys, Vec> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const DIR_ORDER = Object.keys(DIR_VEC) as (keyof DirKeys)[];

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const SWIPE_MIN = 30; // px
const SWIPE_TIME = 500; // ms

interface Pointer {
  pos: Vec;
  start: Vec;
  t0: number;
  onButton: boolean;
}

class Input {
  readonly isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  buttons: Button[] = [];
  /** Pointer-down positions this frame that did not land on a button. */
  taps: Vec[] = [];

  private keys = new Set<string>();
  private pressed = new Set<string>();
  private pointers = new Map<number, Pointer>();
  private held = new Set<string>();

  attach(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      const p = { x: e.clientX, y: e.clientY };
      const onButton = !!this.buttonAt(p);
      this.pointers.set(e.pointerId, { pos: p, start: p, t0: performance.now(), onButton });
      if (!onButton) this.taps.push(p);
      this.refreshHeld();
    });
    canvas.addEventListener('pointermove', (e) => {
      const ptr = this.pointers.get(e.pointerId);
      if (!ptr) return;
      ptr.pos = { x: e.clientX, y: e.clientY };
      this.refreshHeld();
    });
    const up = (e: PointerEvent) => {
      const ptr = this.pointers.get(e.pointerId);
      if (ptr) this.detectSwipe(ptr);
      this.pointers.delete(e.pointerId);
      this.refreshHeld();
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  /** True while any of the codes is held (key or touch button). */
  down(...codes: string[]) {
    return codes.some((c) => this.keys.has(c) || this.held.has(c));
  }

  /** True on the frame any of the codes was first pressed. */
  hit(...codes: string[]) {
    return codes.some((c) => this.pressed.has(c));
  }

  /** Direction whose key was just pressed (or swiped), else null. */
  dirHit(keys: DirKeys): Vec | null {
    const d = DIR_ORDER.find((k) => this.hit(...keys[k]));
    return d ? DIR_VEC[d] : null;
  }

  /** Direction held right now (left, right, up, down priority), else null. */
  dirDown(keys: DirKeys): Vec | null {
    const d = DIR_ORDER.find((k) => this.down(...keys[k]));
    return d ? DIR_VEC[d] : null;
  }

  /** Enter, Space or a tap outside the touch buttons: used to restart / continue after a message. */
  confirmed() {
    return this.hit('Enter', 'Space') || this.taps.length > 0;
  }

  /** "Tap to restart" on touch screens, "Press Enter to restart" with a keyboard. */
  hint(action: string) {
    return `${this.isTouch ? 'Tap' : 'Press Enter'} to ${action}`;
  }

  /** Pointers held down that did not start on a button: start and current position (for virtual joysticks). */
  drags(): { start: Vec; pos: Vec }[] {
    return [...this.pointers.values()].filter((p) => !p.onButton).map(({ start, pos }) => ({ start, pos }));
  }

  endFrame() {
    this.pressed.clear();
    this.taps = [];
  }

  reset() {
    this.endFrame();
    this.pointers.clear();
    this.held.clear();
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const b of this.buttons) {
      ctx.globalAlpha = this.held.has(b.id) ? 0.6 : 0.3;
      circle(ctx, b.x, b.y, b.r, this.held.has(b.id));
      ctx.globalAlpha = 1;
      text(ctx, b.label, b.x, b.y, b.r * 0.7);
    }
  }

  // A quick straight move becomes an arrow key press, so swipes work wherever arrows do.
  private detectSwipe(p: Pointer) {
    const dx = p.pos.x - p.start.x;
    const dy = p.pos.y - p.start.y;
    if (p.onButton || dist(p.pos, p.start) < SWIPE_MIN || performance.now() - p.t0 > SWIPE_TIME) return;
    if (Math.abs(dx) > Math.abs(dy)) this.pressed.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    else this.pressed.add(dy > 0 ? 'ArrowDown' : 'ArrowUp');
  }

  private buttonAt(p: Vec) {
    return this.buttons.find((b) => dist(p, b) <= b.r * 1.15);
  }

  private refreshHeld() {
    const now = new Set<string>();
    for (const p of this.pointers.values()) {
      const b = this.buttonAt(p.pos);
      if (b) now.add(b.id);
    }
    for (const id of now) if (!this.held.has(id)) this.pressed.add(id);
    this.held = now;
  }
}

export const input = new Input();

/** Four direction buttons arranged as a d-pad around (cx, cy). */
export function dpad(cx: number, cy: number, r = 30): Button[] {
  const d = r * 1.9;
  return [
    { id: 'ArrowUp', x: cx, y: cy - d, r, label: '▲' },
    { id: 'ArrowDown', x: cx, y: cy + d, r, label: '▼' },
    { id: 'ArrowLeft', x: cx - d, y: cy, r, label: '◀' },
    { id: 'ArrowRight', x: cx + d, y: cy, r, label: '▶' },
  ];
}
