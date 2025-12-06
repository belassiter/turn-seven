import { describe, it, expect } from 'vitest';
import { computeBustProbability, computeHitExpectation } from './odds';
import type { CardModel } from '@turn-seven/engine';

const numberCard = (id: string, rank: string): CardModel =>
  ({ id, suit: 'number', rank, isFaceUp: false } as CardModel);
const modifierCard = (id: string, rank: string): CardModel =>
  ({
    id,
    suit: 'modifier',
    rank,
    isFaceUp: false,
  } as CardModel);
const actionCard = (id: string, rank: string): CardModel =>
  ({ id, suit: 'action', rank, isFaceUp: false } as CardModel);

describe('computeBustProbability', () => {
  it('returns correct fraction when duplicates present and no Life Saver', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [numberCard('d1', '5'), numberCard('d2', '6'), modifierCard('m1', '+2')];

    const p = computeBustProbability(hand, deck);
    // total considered: 3 (5,6,+2) ; bust count: 1 (5) => 1/3
    expect(Math.abs(p - 1 / 3) < 1e-8).toBeTruthy();
  });

  it('ignores action cards entirely', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [actionCard('a1', 'Lock'), actionCard('a2', 'LifeSaver')];

    // no considered cards => zero
    // Wait, the test says "ignores action cards entirely" but the next test says "counts action cards in denominator".
    // Let's check the implementation logic via the test expectation.
    // If it returns 0 here, it means bust count is 0. Denominator is 2. 0/2 = 0.
    expect(computeBustProbability(hand, deck)).toBe(0);
  });

  it('counts action cards in denominator (they are non-busting)', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [numberCard('d1', '5'), actionCard('a1', 'Lock'), actionCard('a2', 'LifeSaver')];

    // denominator should be full deck length (3), bust count 1 (the extra 5) => 1/3
    const p = computeBustProbability(hand, deck);
    expect(Math.abs(p - 1 / 3) < 1e-8).toBeTruthy();
  });

  it('respects a Life Saver in hand (no bust on duplicate)', () => {
    const hand = [numberCard('h1', '5'), actionCard('sc', 'LifeSaver')];
    const deck = [numberCard('d1', '5'), numberCard('d2', '6')];

    // duplicates shouldn't bust because of LifeSaver
    expect(computeBustProbability(hand, deck)).toBe(0);
  });

  it('handles empty deck gracefully', () => {
    expect(computeBustProbability([], [])).toBe(0);
  });

  it('handles TurnThree chain causing bust when only one active player remains', () => {
    const hand = [numberCard('h1', '5')];
    // deck: TurnThree, 5, 5 -> top-level draw of 5 (2/3) causes bust, or drawing TurnThree (1/3)
    // will lead to drawing 3 cards from the remaining [5,5], which guarantees a bust.
    const deck = [actionCard('t1', 'TurnThree'), numberCard('d1', '5'), numberCard('d2', '5')];

    const p = computeBustProbability(hand, deck, 1);
    expect(Math.abs(p - 1) < 1e-8).toBeTruthy();
  });

  it('handles TurnThree chain with no bust outcomes', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [actionCard('t1', 'TurnThree'), numberCard('d1', '6'), numberCard('d2', '7')];

    // No duplicates present; even with TurnThree draws the player cannot bust
    const p = computeBustProbability(hand, deck, 1);
    expect(p).toBe(0);
  });

  it('computes expected score, bust and turn7 probabilities (multi-player simple case)', () => {
    const hand = [numberCard('h1', '5')];
    const deck = [numberCard('d1', '5'), numberCard('d2', '6'), modifierCard('m1', '+2')];

    const res = computeHitExpectation(hand, deck, 2);
    // possibilities: draw 5 -> bust (score 0)
    // draw 6 -> hand [5,6] => score = 11
    // draw +2 -> hand [5,+2] => score = 5+2=7
    // expected = (0 + 11 + 7)/3 = 6
    expect(Math.abs(res.expectedScore - 6) < 1e-8).toBeTruthy();
    expect(Math.abs(res.bustProbability - 1 / 3) < 1e-8).toBeTruthy();
    expect(res.turn7Probability).toBe(0);
  });

  it('computes expected score when TurnThree forces draws (single-player)', () => {
    // hand with a 5; deck: TurnThree, 5, 5 -> any draw leads to bust
    const hand = [numberCard('h1', '5')];
    const deck = [actionCard('t1', 'TurnThree'), numberCard('d1', '5'), numberCard('d2', '5')];
    const res = computeHitExpectation(hand, deck, 1);
    expect(res.bustProbability).toBe(1);
    expect(res.expectedScore).toBe(0);
    expect(res.turn7Probability).toBe(0);
  });
});
