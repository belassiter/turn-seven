import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Scoring Logic', () => {
  const logic = new TurnSevenLogic();

  // Helper to create a state with a specific hand for a player
  const createStateWithHand = (hand: Partial<CardModel>[]): GameState => {
    return {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: hand.map((c, i) => ({
            id: c.id || `c${i}`,
            suit: c.suit || 'number',
            rank: c.rank || '1',
            isFaceUp: true,
            ...c,
          })) as CardModel[],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: null,
      gamePhase: 'ended', // Force end to trigger scoring if we were calling a method, but here we might call computeScores directly or via checkRoundEnd
      roundNumber: 1,
    } as GameState;
  };

  // We need to access the private computeScores method or trigger it via an action.
  // Since computeScores is private, we can trigger it by ending the round.
  // Or we can cast logic to any to access private method.
  const computeScore = (hand: Partial<CardModel>[]) => {
    const state = createStateWithHand(hand);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).computeScores(state);
    return state.players[0].roundScore;
  };

  it('scores simple number cards correctly', () => {
    const score = computeScore([{ rank: '5' }, { rank: '10' }]);
    expect(score).toBe(15);
  });

  it('scores 0 for busted players', () => {
    const state = createStateWithHand([{ rank: '5' }, { rank: '5' }]);
    state.players[0].hasBusted = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).computeScores(state);
    expect(state.players[0].roundScore).toBe(0);
  });

  it('adds modifier cards (+2, +10)', () => {
    const score = computeScore([
      { rank: '5' },
      { suit: 'modifier', rank: '+2' },
      { suit: 'modifier', rank: '+10' },
    ]);
    // 5 + 2 + 10 = 17
    expect(score).toBe(17);
  });

  it('applies x2 multiplier to number cards only', () => {
    const score = computeScore([{ rank: '5' }, { rank: '3' }, { suit: 'modifier', rank: 'x2' }]);
    // (5 + 3) * 2 = 16
    expect(score).toBe(16);
  });

  it('applies x2 multiplier BEFORE adding +X modifiers', () => {
    const score = computeScore([
      { rank: '5' },
      { suit: 'modifier', rank: '+10' },
      { suit: 'modifier', rank: 'x2' },
    ]);
    // (5 * 2) + 10 = 20.
    // If it were (5+10)*2 it would be 30.
    expect(score).toBe(20);
  });

  it('stacks multiple x2 multipliers exponentially', () => {
    const score = computeScore([
      { rank: '5' },
      { suit: 'modifier', rank: 'x2' },
      { suit: 'modifier', rank: 'x2' },
    ]);
    // 5 * 2 * 2 = 20
    expect(score).toBe(20);
  });

  it('scores only modifiers if no number cards present', () => {
    const score = computeScore([
      { suit: 'modifier', rank: '+10' },
      { suit: 'modifier', rank: 'x2' }, // Should do nothing to 0 sum
    ]);
    // (0 * 2) + 10 = 10
    expect(score).toBe(10);
  });

  it('adds 15 point bonus for 7 unique number cards', () => {
    const score = computeScore([
      { rank: '1' },
      { rank: '2' },
      { rank: '3' },
      { rank: '4' },
      { rank: '5' },
      { rank: '6' },
      { rank: '7' },
    ]);
    // Sum: 28. Bonus: 15. Total: 43.
    expect(score).toBe(43);
  });

  it('adds 15 point bonus even with modifiers', () => {
    const score = computeScore([
      { rank: '1' },
      { rank: '2' },
      { rank: '3' },
      { rank: '4' },
      { rank: '5' },
      { rank: '6' },
      { rank: '7' },
      { suit: 'modifier', rank: '+10' },
      { suit: 'modifier', rank: 'x2' },
    ]);
    // Sum: 28.
    // x2: 56.
    // +10: 66.
    // Bonus +15: 81.
    expect(score).toBe(81);
  });
});
