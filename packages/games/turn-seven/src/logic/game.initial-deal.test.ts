import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Initial Deal Edge Cases', () => {
  const logic = new TurnSevenLogic();

  // Helper to mock deck
  const mockDeck = (cards: Partial<CardModel>[]) => {
    const originalCreateDeck = (logic as any).createDeck;
    (logic as any).createDeck = () => {
      return cards.map((c, i) => ({
        id: c.id || `mock-${i}`,
        suit: c.suit || 'number',
        rank: c.rank || '1',
        isFaceUp: false,
        ...c
      })) as CardModel[];
    };
    return () => { (logic as any).createDeck = originalCreateDeck; };
  };

  it('handles Freeze drawn on initial deal', () => {
    // Setup: P1 draws Freeze. Targets P2.
    // Stack (top to bottom):
    // 1. Freeze (P1 -> P2)
    // 2. 5 (P1 replacement)
    // 3. 6 (P2 deal)
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'a1', suit: 'action', rank: 'Freeze' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have '5'
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('5');
    expect(p1.isActive).toBe(true);
    expect(p1.isFrozen).toBe(false);

    // P2 should have Freeze + '6'
    expect(p2.hand).toHaveLength(2);
    expect(p2.hand.map(c => c.rank)).toContain('Freeze');
    expect(p2.hand.map(c => c.rank)).toContain('6');
    
    // P2 should be frozen
    expect(p2.isFrozen).toBe(true);
    expect(p2.isActive).toBe(false);
    expect(p2.hasStayed).toBe(true);
  });

  it('handles Second Chance drawn on initial deal', () => {
    // Setup: P1 draws Second Chance. Keeps it.
    // Stack:
    // 1. Second Chance (P1)
    // 2. 6 (P2)
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'a1', suit: 'action', rank: 'SecondChance' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have Second Chance only
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('SecondChance');
    expect(p1.hasSecondChance).toBe(true);

    // P2 should have '6'
    expect(p2.hand).toHaveLength(1);
    expect(p2.hand[0].rank).toBe('6');
  });

  it('handles Turn Three revealing another Action (Chain Reaction)', () => {
    // Setup: P1 draws Turn Three (T3) -> Targets P2.
    // P2 draws 3 cards: 8, Freeze, 9.
    // Freeze is revealed but NOT resolved immediately (queued).
    // P1 draws replacement: 5.
    // P2 draws initial card: 6.
    
    // Stack (top to bottom):
    // 1. TurnThree (P1 -> P2)
    // 2. 8 (P2 T3 draw 1)
    // 3. Freeze (P2 T3 draw 2 - queued)
    // 4. 9 (P2 T3 draw 3)
    // 5. 5 (P1 replacement)
    // 6. 6 (P2 initial deal)
    
    // Reverse for stack construction: 6, 5, 9, Freeze, 8, TurnThree
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'n9', rank: '9' },
      { id: 'a2', suit: 'action', rank: 'Freeze' },
      { id: 'n8', rank: '8' },
      { id: 'a1', suit: 'action', rank: 'TurnThree' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1: 5
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('5');

    // P2: TurnThree, 8, Freeze, 9, 6 (5 cards)
    expect(p2.hand).toHaveLength(5);
    const ranks = p2.hand.map(c => c.rank);
    expect(ranks).toContain('TurnThree');
    expect(ranks).toContain('Freeze');
    expect(ranks).toContain('8');
    expect(ranks).toContain('9');
    expect(ranks).toContain('6');

    // P2 should have pending action (Freeze)
    expect(p2.pendingImmediateActionIds).toContain('a2');
    
    // P2 is NOT frozen yet because Freeze was queued, not resolved
    expect(p2.isFrozen).toBe(false);
  });

  it('handles Deck Depletion during initial deal gracefully', () => {
    // Setup: Deck has only 1 card.
    // P1 gets it.
    // P2 gets nothing.
    
    const restore = mockDeck([
      { id: 'n1', rank: '1' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

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
