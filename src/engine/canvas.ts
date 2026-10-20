// Full-screen canvas sized in CSS pixels, scaled for the device pixel ratio.
export const view = { w: 0, h: 0 };

const resizeListeners: (() => void)[] = [];

export function onResize(fn: () => void) {
  resizeListeners.push(fn);
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeListeners.forEach((fn) => fn());
  };
  window.addEventListener('resize', resize);
  resize();
  return ctx;
}
