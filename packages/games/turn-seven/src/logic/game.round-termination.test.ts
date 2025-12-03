import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Round Termination Scenarios', () => {
  const logic = new TurnSevenLogic();

  // Helper to create a basic state
  const createBaseState = (numPlayers: number = 2): GameState => {
    const players = Array.from({ length: numPlayers }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      hasStayed: false,
      isFrozen: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasSecondChance: false,
    }));
    return {
      players,
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
    } as any;
  };

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
    // We also need to inject these cards into the current state's deck if we're not calling createInitialState
    // But for these tests we usually manipulate state.deck directly or use handleHit which pops from state.deck
    return () => { (logic as any).createDeck = originalCreateDeck; };
  };

  it('ends round when last active player busts', () => {
    const state = createBaseState(2);
    // P1 has stayed
    state.players[0].hasStayed = true;
    state.players[0].isActive = false;
    
    // P2 is active. P2 has a '5'.
    state.players[1].hand = [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true }];
    state.currentPlayerId = 'p2';

    // Deck has a '5' (will cause bust)
    state.deck = [{ id: 'c2', suit: 'number', rank: '5', isFaceUp: false }];

    const nextState = logic.performAction(state, { type: 'HIT' });

    expect(nextState.players[1].hasBusted).toBe(true);
    expect(nextState.players[1].isActive).toBe(false);
    expect(nextState.gamePhase).toBe('ended'); // or gameover if score limit reached, but here 0 score
    expect(nextState.currentPlayerId).toBeNull();
  });

  it('ends round immediately when a player achieves Turn 7 (7 unique numbers)', () => {
    const state = createBaseState(2);
    // P1 has 6 unique numbers
    state.players[0].hand = [
      { id: 'c1', suit: 'number', rank: '1', isFaceUp: true },
      { id: 'c2', suit: 'number', rank: '2', isFaceUp: true },
      { id: 'c3', suit: 'number', rank: '3', isFaceUp: true },
      { id: 'c4', suit: 'number', rank: '4', isFaceUp: true },
      { id: 'c5', suit: 'number', rank: '5', isFaceUp: true },
      { id: 'c6', suit: 'number', rank: '6', isFaceUp: true },
    ];
    state.currentPlayerId = 'p1';

    // Deck has '7'
    state.deck = [{ id: 'c7', suit: 'number', rank: '7', isFaceUp: false }];

    const nextState = logic.performAction(state, { type: 'HIT' });

    // P1 should have 7 unique
    const p1Ranks = nextState.players[0].hand.map(c => c.rank);
    expect(new Set(p1Ranks).size).toBe(7);

    // Round should end immediately
    expect(nextState.gamePhase).toBe('ended');
    expect(nextState.currentPlayerId).toBeNull();
    
    // P1 should get bonus (score calculation check)
    // Sum: 1+2+3+4+5+6+7 = 28. Bonus +15 = 43.
    expect(nextState.players[0].roundScore).toBe(43);
  });

  it('ends round when last active player busts during Turn Three', () => {
    const state = createBaseState(2);
    // P1 stayed
    state.players[0].hasStayed = true;
    state.players[0].isActive = false;

    // P2 active. Has '5'.
    state.players[1].hand = [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true }];
    state.currentPlayerId = 'p2';

    // P2 plays Turn Three on themselves (simulated by having it in reservedActions)
    state.players[1].reservedActions = [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }];
    
    // Deck: 8, 5 (bust), 9 (won't be drawn)
    // Stack order (pop from end): 9, 5, 8
    state.deck = [
      { id: 'n9', suit: 'number', rank: '9', isFaceUp: false },
      { id: 'n5', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'n8', suit: 'number', rank: '8', isFaceUp: false },
    ];

    const nextState = logic.performAction(state, { 
      type: 'PLAY_ACTION', 
      payload: { actorId: 'p2', cardId: 'a1', targetId: 'p2' } 
    });

    expect(nextState.players[1].hasBusted).toBe(true);
    expect(nextState.players[1].isActive).toBe(false);
    expect(nextState.gamePhase).toBe('ended');
  });

  it('ends round when last active player is Frozen', () => {
    const state = createBaseState(2);
    // P1 stayed
    state.players[0].hasStayed = true;
    state.players[0].isActive = false;

    // P2 active.
    state.currentPlayerId = 'p2';

    // P2 plays Freeze on themselves (or maybe P1 played it earlier? No, P1 is inactive).
    // Let's say P2 draws Freeze and targets themselves (Case 13: must assign to self if only one left).
    // But here we simulate PLAY_ACTION directly.
    state.players[1].reservedActions = [{ id: 'a1', suit: 'action', rank: 'Freeze', isFaceUp: true }];

    const nextState = logic.performAction(state, { 
      type: 'PLAY_ACTION', 
      payload: { actorId: 'p2', cardId: 'a1', targetId: 'p2' } 
    });

    expect(nextState.players[1].isFrozen).toBe(true);
    expect(nextState.players[1].hasStayed).toBe(true);
    expect(nextState.players[1].isActive).toBe(false);
    expect(nextState.gamePhase).toBe('ended');
  });

  it('ends round when last active player is Frozen via Turn Three chain', () => {
    const state = createBaseState(2);
    // P1 stayed
    state.players[0].hasStayed = true;
    state.players[0].isActive = false;

    // P2 active.
    state.currentPlayerId = 'p2';
    state.players[1].reservedActions = [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }];

    // Deck: Freeze, 8, 9.
    // Stack: 9, 8, Freeze.
    // P2 draws Freeze (queued), 8, 9.
    // Then Freeze resolves on P2 (since P2 is only active player).
    state.deck = [
      { id: 'n9', suit: 'number', rank: '9', isFaceUp: false },
      { id: 'n8', suit: 'number', rank: '8', isFaceUp: false },
      { id: 'a2', suit: 'action', rank: 'Freeze', isFaceUp: false },
    ];

    // 1. Play Turn Three
    let nextState = logic.performAction(state, { 
      type: 'PLAY_ACTION', 
      payload: { actorId: 'p2', cardId: 'a1', targetId: 'p2' } 
    });

    // P2 should have drawn Freeze, 8, 9.
    // Freeze should be in pendingImmediateActionIds.
    expect(nextState.players[1].pendingImmediateActionIds).toContain('a2');
    expect(nextState.gamePhase).toBe('playing'); // Not ended yet, pending action

    // 2. Resolve Freeze (P2 targets P2)
    nextState = logic.performAction(nextState, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p2', cardId: 'a2', targetId: 'p2' }
    });

    expect(nextState.players[1].isFrozen).toBe(true);
    expect(nextState.players[1].isActive).toBe(false);
    expect(nextState.gamePhase).toBe('ended');
  });
});
