import { describe, it, expect } from 'vitest';
import { computeBustProbability } from './odds';

const numberCard = (id: string, rank: string) => ({ id, suit: 'number', rank, isFaceUp: false });
const modifierCard = (id: string, rank: string) => ({ id, suit: 'modifier', rank, isFaceUp: false });
const actionCard = (id: string, rank: string) => ({ id, suit: 'action', rank, isFaceUp: false });

describe('computeBustProbability', () => {
  it('returns correct fraction when duplicates present and no second chance', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [numberCard('d1', '5'), numberCard('d2', '6'), modifierCard('m1', '+2')];

    const p = computeBustProbability(hand as any, deck as any);
    // total considered: 3 (5,6,+2) ; bust count: 1 (5) => 1/3
    expect(Math.abs(p - (1 / 3)) < 1e-8).toBeTruthy();
  });

  it('ignores action cards entirely', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [actionCard('a1', 'Freeze'), actionCard('a2', 'SecondChance')];

    // no considered cards => zero
    expect(computeBustProbability(hand as any, deck as any)).toBe(0);
  });

  it('counts action cards in denominator (they are non-busting)', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [numberCard('d1', '5'), actionCard('a1', 'Freeze'), actionCard('a2', 'SecondChance')];

    // denominator should be full deck length (3), bust count 1 (the extra 5) => 1/3
    const p = computeBustProbability(hand as any, deck as any);
    expect(Math.abs(p - (1 / 3)) < 1e-8).toBeTruthy();
  });

  it('respects a Second Chance in hand (no bust on duplicate)', () => {
    const hand = [numberCard('h1', '5'), actionCard('sc', 'SecondChance')];
    const deck = [numberCard('d1', '5'), numberCard('d2', '6')];

    // duplicates shouldn't bust because of SecondChance
    expect(computeBustProbability(hand as any, deck as any)).toBe(0);
  });

  it('handles empty deck gracefully', () => {
    expect(computeBustProbability([], [])).toBe(0);
  });

  it('handles TurnThree chain causing bust when only one active player remains', () => {
    const hand = [numberCard('h1', '5')];
    // deck: TurnThree, 5, 5 -> top-level draw of 5 (2/3) causes bust, or drawing TurnThree (1/3)
    // will lead to drawing 3 cards from the remaining [5,5], which guarantees a bust.
    const deck = [actionCard('t1', 'TurnThree'), numberCard('d1', '5'), numberCard('d2', '5')];

    const p = computeBustProbability(hand as any, deck as any, 1);
    expect(Math.abs(p - 1) < 1e-8).toBeTruthy();
  });

  it('handles TurnThree chain with no bust outcomes', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [actionCard('t1', 'TurnThree'), numberCard('d1', '6'), numberCard('d2', '7')];

    // No duplicates present; even with TurnThree draws the player cannot bust
    const p = computeBustProbability(hand as any, deck as any, 1);
    expect(p).toBe(0);
  });
});
