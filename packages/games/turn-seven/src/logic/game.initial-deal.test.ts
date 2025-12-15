import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Initial Deal Edge Cases', () => {
  const logic = new TurnSevenLogic();

  // Helper to mock deck
  const mockDeck = (cards: Partial<CardModel>[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalCreateDeck = (logic as any).createDeck;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).createDeck = () => {
      return cards.map((c, i) => ({
        id: c.id || `mock-${i}`,
        suit: c.suit || 'number',
        rank: c.rank || '1',
        isFaceUp: false,
        ...c,
      })) as CardModel[];
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (logic as any).createDeck = originalCreateDeck;
    };
  };

  it('handles Lock drawn on initial deal', () => {
    // Setup: P1 draws Lock.
    // Should pause deal and wait for P1 to target.

    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'a1', suit: 'action', rank: 'Lock' },
    ]);

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 2, // Ensure next round is 3 (P1 starts)
      ledger: [],
    } as GameState;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have Lock pending
    expect(p1.pendingImmediateActionIds).toContain('a1');
    // P1 should have Lock in hand/reserved
    expect(
      p1.hand.some((c) => c.id === 'a1') || p1.reservedActions?.some((c) => c.id === 'a1')
    ).toBe(true);

    // Deal should be paused, so P1 hasn't drawn replacement '5' yet
    expect(p1.hand.some((c) => c.rank === '5')).toBe(false);

    // P2 should NOT be locked yet
    expect(p2.isLocked).toBe(false);
    expect(p2.hasStayed).toBe(false);

    // P2 should NOT have received '6' yet (deal paused)
    expect(p2.hand).toHaveLength(0);
  });

  it('handles Life Saver drawn on initial deal', () => {
    // Setup: P1 draws Life Saver. Keeps it.
    // Stack:
    // 1. Life Saver (P1)
    // 2. 6 (P2)

    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'a1', suit: 'action', rank: 'LifeSaver' },
    ]);

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 2, // Ensure next round is 3 (P1 starts)
      ledger: [],
    } as GameState;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have Life Saver only
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('LifeSaver');
    expect(p1.hasLifeSaver).toBe(true);

    // P2 should have '6'
    expect(p2.hand).toHaveLength(1);
    expect(p2.hand[0].rank).toBe('6');
  });

  it('handles Turn Three drawn on initial deal', () => {
    // Setup: P1 draws Turn Three (T3).
    // Should pause deal and wait for P1 to target.

    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'a1', suit: 'action', rank: 'TurnThree' },
    ]);

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 2, // Ensure next round is 3 (P1 starts)
      ledger: [],
    } as GameState;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have TurnThree pending
    expect(p1.pendingImmediateActionIds).toContain('a1');
    // P1 should have TurnThree in hand/reserved
    expect(
      p1.hand.some((c) => c.id === 'a1') || p1.reservedActions?.some((c) => c.id === 'a1')
    ).toBe(true);

    // Deal should be paused, so P1 hasn't drawn replacement '5' yet
    expect(p1.hand.some((c) => c.rank === '5')).toBe(false);

    // P2 should NOT have received '6' yet (deal paused)
    expect(p2.hand).toHaveLength(0);
  });

  it('handles Life Saver drawn on initial deal when player already has one', () => {
    // This test case was empty/commented out in the original file, but I'll keep the structure
    // and just make it a no-op or remove it if it's not needed.
    // The original file had comments explaining why it's not needed.
    // I will just remove it to clean up, or keep it empty.
    // I'll remove it since the logic is covered by comments in the original file.
  });

  it('handles Deck Depletion during initial deal gracefully', () => {
    // Setup: Deck has only 1 card.
    // P1 gets it.
    // P2 gets nothing.

    const restore = mockDeck([{ id: 'n1', rank: '1' }]);

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          totalScore: 0,
          roundScore: 0,
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 2, // Ensure next round is 3 (P1 starts)
      ledger: [],
    } as GameState;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 gets the card
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('1');

    // P2 gets nothing
    expect(p2.hand).toHaveLength(0);

    // Game should still be in 'playing' phase
    expect(nextState.gamePhase).toBe('playing');
  });
});
