// Spawning: how many enemies appear and where, which kinds, elites every minute, bosses every 3 minutes.
import { dist, rand, type Vec } from '../../engine/math';
import { BOSS_EVERY, ELITE_EVERY, ENEMIES, MAX_ENEMIES, RECYCLE, RUNNER_PACK, spawnRate, type EnemyKind } from './data';
import { makeEnemy } from './enemies';
import type { Run } from './game';

const KINDS = (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => ENEMIES[k].weight > 0);

export class Director {
  private due = 0; // fractional enemies owed by the spawn rate
  private nextElite = ELITE_EVERY;
  private nextBoss = BOSS_EVERY;
  private bosses = 0;

  update(run: Run, dt: number) {
    this.due += spawnRate(run.time) * dt;
    for (; this.due >= 1; this.due--) if (run.enemies.length < MAX_ENEMIES) this.spawnGroup(run);
    if (run.time >= this.nextBoss) {
      this.nextBoss += BOSS_EVERY;
      this.bosses++;
      const boss = makeEnemy('boss', this.spawnPoint(run), run.time, { bossNumber: this.bosses });
      run.enemies.push(boss);
      run.boss = boss;
      run.fx.flash(0.3);
    }
    if (run.time >= this.nextElite) {
      // No elite on boss minutes: the boss is the event.
      if (this.nextElite % BOSS_EVERY !== 0)
        run.enemies.push(makeEnemy(this.pickKind(run.time), this.spawnPoint(run), run.time, { elite: true }));
      this.nextElite += ELITE_EVERY;
    }
    this.recycle(run);
  }

  private spawnGroup(run: Run) {
    const kind = this.pickKind(run.time);
    const at = this.spawnPoint(run);
    const count = kind === 'runner' ? RUNNER_PACK : 1;
    for (let i = 0; i < count; i++) {
      const pos = { x: at.x + rand(-20, 20), y: at.y + rand(-20, 20) };
      run.enemies.push(makeEnemy(kind, pos, run.time));
    }
  }

  /** Weighted pick among the kinds already unlocked at time `t`. */
  private pickKind(t: number): EnemyKind {
    const open = KINDS.filter((k) => ENEMIES[k].from <= t);
    let roll = rand(
      0,
      open.reduce((sum, k) => sum + ENEMIES[k].weight, 0),
    );
    return open.find((k) => (roll -= ENEMIES[k].weight) < 0) ?? 'grunt';
  }

  /** A random point just outside the view, around the player. */
  private spawnPoint(run: Run): Vec {
    const a = rand(0, Math.PI * 2);
    const d = run.spawnDist;
    return { x: run.player.pos.x + Math.cos(a) * d, y: run.player.pos.y + Math.sin(a) * d };
  }

  // Enemies left far behind are put back in front, so the horde keeps up with a running player.
  private recycle(run: Run) {
    const limit = run.spawnDist * RECYCLE;
    const p = run.player.pos;
    for (const e of run.enemies) {
      if (dist(e.pos, p) < limit) continue;
      const ahead = Math.atan2(run.player.facing.y, run.player.facing.x) + rand(-1, 1);
      e.pos = { x: p.x + Math.cos(ahead) * run.spawnDist, y: p.y + Math.sin(ahead) * run.spawnDist };
    }
  }
}
