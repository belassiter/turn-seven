import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Round Start Logic', () => {
  const logic = new TurnSevenLogic();

  it('startNextRound ensures every player gets a card even if actions are drawn', () => {
    // Setup: P1, P2, P3.
    // Deck stack (top to bottom):
    // 1. TurnThree (drawn by P1, given to P2)
    // 2. 5 (drawn by P1 as replacement)
    // 3. 6 (drawn by P2)
    // 4. 7 (drawn by P3)
    // 5. 8, 9, 10 (drawn by P2 due to TurnThree resolution)
    
    // Wait, resolution happens immediately.
    // P1 draws TurnThree -> resolves on P2.
    // P2 draws 3 cards (8, 9, 10).
    // P1 loop continues -> draws 5.
    // P2 loop starts -> draws 6.
    // P3 loop starts -> draws 7.
    
    // So deck stack (pushed in reverse order of popping):
    // Bottom: 7, 6, 5, 10, 9, 8, TurnThree :Top
    
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 10 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 20 },
        { id: 'p3', name: 'P3', hand: [], totalScore: 30 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    // Mock createDeck to return our specific stack
    const originalCreateDeck = (logic as any).createDeck;
    (logic as any).createDeck = () => {
      return [
        { id: 'n7', suit: 'number', rank: '7', isFaceUp: false },
        { id: 'n6', suit: 'number', rank: '6', isFaceUp: false },
        { id: 'n5', suit: 'number', rank: '5', isFaceUp: false },
        { id: 'n10', suit: 'number', rank: '10', isFaceUp: false },
        { id: 'n9', suit: 'number', rank: '9', isFaceUp: false },
        { id: 'n8', suit: 'number', rank: '8', isFaceUp: false },
        { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: false },
      ] as any[];
    };

    const nextState = logic.startNextRound(state);
    
    // Restore mock
    (logic as any).createDeck = originalCreateDeck;

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];
    const p3 = nextState.players[2];

    // P1 should have the '5' (replacement for TurnThree)
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('5');

    // P2 should have TurnThree + 3 drawn (8,9,10) + 1 initial deal (6) = 5 cards
    expect(p2.hand).toHaveLength(5);
    const ranks = p2.hand.map(c => c.rank);
    expect(ranks).toContain('TurnThree');
    expect(ranks).toContain('8');
    expect(ranks).toContain('9');
    expect(ranks).toContain('10');
    expect(ranks).toContain('6');

    // P3 should have '7'
    expect(p3.hand).toHaveLength(1);
    expect(p3.hand[0].rank).toBe('7');
  });
});
