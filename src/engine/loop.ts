const STEP = 1 / 60;

// Fixed-step update with variable-rate drawing.
export function startLoop(update: (dt: number) => void, draw: () => void) {
  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
