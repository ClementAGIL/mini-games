// The level-up screen (cards, with Reroll and Banish when owned) and the boss-chest artifact choice.
import { input } from '../../engine/input';
import { tapButtons, type RectButton } from '../../engine/ui';
import { ARTIFACTS, REROLLS, type ArtifactKind } from './artifacts';
import type { Run } from './game';
import { drawArtifact } from './icons';
import { cardKey, levelUpCards } from './inventory';
import type { Card } from './model';
import { cardButtons, describeCard, drawCards, type CardView } from './screens';

/** Key n presses button n, a tap presses the button under it. */
export function choose(buttons: RectButton[]) {
  const key = buttons.findIndex((_, i) => input.hit(`Digit${i + 1}`));
  if (key >= 0) buttons[key].onTap();
  else tapButtons(buttons, input.taps);
}

const artifactView = (k: ArtifactKind): CardView => ({
  title: ARTIFACTS[k].name,
  sub: 'Artifact',
  lines: [ARTIFACTS[k].text],
  icon: (ctx, x, y, r) => drawArtifact(ctx, k, x, y, r),
  color: ARTIFACTS[k].color,
});

export class LevelUp {
  private cards: Card[] = [];
  private views: CardView[] = [];
  private rerolls = 0;
  private banishing = false;

  /** New cards; `fresh` for a new level (refills the rerolls), false for a reroll. */
  deal(run: Run, fresh = true) {
    if (fresh) this.rerolls = run.relics.has('reroll') ? REROLLS : 0;
    this.banishing = false;
    const count = run.relics.has('fourth') ? 4 : 3;
    this.cards = levelUpCards(run.weapons, run.cardLuck, count, run.relics.banished);
    this.views = this.cards.map((c) => describeCard(c, run));
  }

  private cardButtons(run: Run, w: number, h: number) {
    return cardButtons(w, h, this.cards.length, (i) => {
      const key = cardKey(this.cards[i]);
      if (this.banishing && key) return this.banish(run, key);
      run.pickCard(this.cards[i]);
      if (run.pendingLevels > 0) this.deal(run);
    });
  }

  private banish(run: Run, key: string) {
    run.relics.banished.add(key);
    run.relics.banishLeft--;
    this.deal(run, false);
  }

  private reroll(run: Run) {
    this.rerolls--;
    this.deal(run, false);
  }

  /** Reroll / Banish buttons (with their key) under the cards, only for the artifacts owned. */
  private tools(run: Run, cards: RectButton[]): { button: RectButton; key: string }[] {
    const tools: { button: RectButton; key: string }[] = [];
    const add = (key: string, label: string, onTap: () => void, active = false) =>
      tools.push({ key, button: { x: 0, y: 0, w: 130, h: 32, label, onTap, active } });
    if (run.relics.has('reroll') && this.rerolls > 0)
      add('KeyR', `R. Reroll (${this.rerolls})`, () => this.reroll(run));
    if (run.relics.has('banish') && run.relics.banishLeft > 0) {
      add('KeyB', `B. Banish (${run.relics.banishLeft})`, () => (this.banishing = !this.banishing), this.banishing);
    }
    const bottom = Math.max(...cards.map((c) => c.y + c.h)) + 12;
    const center = (cards[0].x + Math.max(...cards.map((c) => c.x + c.w))) / 2;
    tools.forEach((t, i) => Object.assign(t.button, { x: center - tools.length * 70 + i * 140 + 5, y: bottom }));
    return tools;
  }

  update(run: Run, w: number, h: number) {
    const cards = this.cardButtons(run, w, h);
    const tools = this.tools(run, cards);
    const pressed = tools.find((t) => input.hit(t.key));
    if (pressed) return pressed.button.onTap();
    tapButtons(
      tools.map((t) => t.button),
      input.taps,
    );
    choose(cards);
  }

  draw(ctx: CanvasRenderingContext2D, run: Run, w: number, h: number) {
    const cards = this.cardButtons(run, w, h);
    const title = this.banishing ? 'BANISH WHICH CARD?' : 'LEVEL UP';
    drawCards(
      ctx,
      w,
      h,
      cards,
      this.views,
      title,
      this.tools(run, cards).map((t) => t.button),
    );
  }
}

/** The boss chest: pick one of the offered artifacts. */
export function artifactButtons(run: Run, w: number, h: number) {
  const offer = run.artifactChoice ?? [];
  return cardButtons(w, h, offer.length, (i) => run.pickArtifact(offer[i]));
}

export function drawArtifactChoice(ctx: CanvasRenderingContext2D, run: Run, w: number, h: number) {
  const views = (run.artifactChoice ?? []).map(artifactView);
  drawCards(ctx, w, h, artifactButtons(run, w, h), views, 'BOSS CHEST: CHOOSE AN ARTIFACT');
}
