import type { CardModel } from '../types';

// Compute the round score for a hand. This mirrors the scoring logic used in the
// TurnSeven game rules so that UI and helpers can share a single implementation.
export function computeHandScore(h: CardModel[] = []): number {
  let numberSum = 0;
  let multiplierCount = 0;
  let plusModifiers = 0;

  for (const c of h) {
    if (!c.suit || c.suit === 'number') {
      const v = parseInt(String(c.rank), 10);
      if (!isNaN(v)) numberSum += v;
    } else if (c.suit === 'modifier') {
      const r = String(c.rank);
      if (r.startsWith('x')) {
        const mult = parseInt(r.slice(1), 10);
        if (!isNaN(mult) && mult === 2) multiplierCount += 1;
      } else if (r.startsWith('+')) {
        const add = parseInt(r.slice(1), 10);
        if (!isNaN(add)) plusModifiers += add;
      }
    }
  }

  const multiplier = Math.pow(2, multiplierCount);
  let roundTotal = numberSum * multiplier + plusModifiers;

  const uniqueNumbers = new Set(h.filter((x) => !x.suit || x.suit === 'number').map((x) => x.rank));
  if (uniqueNumbers.size >= 7) roundTotal += 15;
  return roundTotal;
}
