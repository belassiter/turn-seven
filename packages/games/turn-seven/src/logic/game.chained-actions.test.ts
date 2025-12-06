import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Chained Action Resolution', () => {
  const logic = new TurnSevenLogic();

  it('queues and resolves chained actions correctly', () => {
    // Setup: P1, P2, P3.
    // P1 plays Turn Three on P2.
    // P2 draws: 8, Lock, 9.
    // P2 must then resolve Lock.
    // After Lock is resolved, turn should pass to P2 (player after P1).

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p3',
          name: 'P3',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      // Deck: 9, Lock, 8 (popped in reverse: 8, Lock, 9)
      deck: [
        { id: 'n9', suit: 'number', rank: '9', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'Lock', isFaceUp: false } as CardModel,
        { id: 'n8', suit: 'number', rank: '8', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    // 1. P1 plays Turn Three on P2
    let nextState = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });

    const p2 = nextState.players[1];

    // P2 should have drawn 3 cards
    expect(p2.hand).toHaveLength(4); // TurnThree + 8 + Lock + 9

    // P2 should have pending action (Lock)
    expect(p2.pendingImmediateActionIds).toContain('a2');

    // Current player should be P2 (to resolve Lock)
    expect(nextState.currentPlayerId).toBe('p2');

    // 2. P2 resolves Lock on P3
    nextState = logic.performAction(nextState, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p2', cardId: 'a2', targetId: 'p3' },
    });

    const p3 = nextState.players[2];

    // P3 should be locked
    expect(p3.isLocked).toBe(true);
    expect(p3.isActive).toBe(false);

    // Turn should now pass to P2 (player after P1)
    // P1 was the original Turn Three dealer.
    // Logic says: "It is the turn of the player who is immediately clockwise after the player who initially got dealt the Flip 3 card."
    // Wait, "player who initially got dealt the Flip 3 card".
    // In this test, P1 *played* the Turn Three. Did they get dealt it?
    // If P1 played it from reservedActions, they must have been dealt it earlier.
    // So P1 is the "dealer" of the action? Or the "originator"?
    // Case 19: "A player is dealt a Flip 3 card; that player assigns the card to someone else... It is the turn of the player who is immediately clockwise after the player who initially got dealt the Flip 3 card."
    // Here P1 had it. So P1 is that player.
    // Clockwise after P1 is P2.
    // So P2 should be current player.

    expect(nextState.currentPlayerId).toBe('p2');
  });
});
