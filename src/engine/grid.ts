// Spatial hash: buckets objects by square cell so collision checks only look at nearby objects instead of
// testing everything against everything.

export class SpatialGrid<T> {
  private cells = new Map<string, T[]>();

  constructor(private cell: number) {}

  clear() {
    this.cells.clear();
  }

  /** Adds `item` to every cell its circle (x, y, r) overlaps. */
  insert(item: T, x: number, y: number, r: number) {
    this.forCells(x, y, r, (k) => {
      const list = this.cells.get(k);
      if (list) list.push(item);
      else this.cells.set(k, [item]);
    });
  }

  /** Items whose cells overlap the circle (x, y, r): a superset of what can actually touch it. */
  near(x: number, y: number, r: number): Set<T> {
    const found = new Set<T>();
    this.forCells(x, y, r, (k) => this.cells.get(k)?.forEach((it) => found.add(it)));
    return found;
  }

  private forCells(x: number, y: number, r: number, fn: (key: string) => void) {
    const c = this.cell;
    for (let cx = Math.floor((x - r) / c); cx <= Math.floor((x + r) / c); cx++) {
      for (let cy = Math.floor((y - r) / c); cy <= Math.floor((y + r) / c); cy++) fn(`${cx},${cy}`);
    }
  }
}
