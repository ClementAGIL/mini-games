import type { Button } from './input';

export interface Scene {
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  /** Called on enter and on resize; returns the touch buttons for this layout. */
  layout?(w: number, h: number): Button[];
  /** Called when the player goes back to the menu (e.g. to pause a scene that is kept alive). */
  leave?(): void;
  /** True to get the shared pause (P key / ❚❚ button, handled by main.ts). Scenes with their own pause leave it unset. */
  pausable?: boolean;
}

export interface GameEntry {
  name: string;
  /** Shapes shown in the menu button, purely decorative. */
  icon: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void;
  create: () => Scene;
  /** Keep the scene while the app runs: going back to the menu and in again continues the same game. */
  keep?: boolean;
}

let layoutHandler = () => {};

/** Asks for the current scene's `layout()` to run again, e.g. when its touch buttons change. */
export const requestLayout = () => layoutHandler();

/** main.ts registers how to re-run the layout. */
export const onLayoutRequest = (fn: () => void) => (layoutHandler = fn);
