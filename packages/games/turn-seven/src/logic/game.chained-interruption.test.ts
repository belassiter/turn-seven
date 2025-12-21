import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Chained Action Interruption', () => {
  const logic = new TurnSevenLogic();

  it('interrupts Turn Three drawing when an Action card is drawn', () => {
    // Setup: P1 plays Turn Three on P2.
    // Deck (top to bottom): 8, Lock, 9.
    // Expected:
    // 1. P2 draws 8.
    // 2. P2 draws Lock.
    // 3. Game PAUSES. P2 must resolve Lock. 9 is NOT drawn yet.
    // 4. P2 resolves Lock.
    // 5. Game RESUMES. P2 draws 9.

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'turn3', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
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
      // Deck: 9 (bottom), Lock, 8 (top)
      deck: [
        { id: 'n9', suit: 'number', rank: '9', isFaceUp: false } as CardModel,
        { id: 'lock', suit: 'action', rank: 'Lock', isFaceUp: false } as CardModel,
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
      payload: { actorId: 'p1', cardId: 'turn3', targetId: 'p2' },
    });

    let p2 = nextState.players[1];

    // CHECKPOINT 1: Interruption
    // P2 should have drawn 8 and Lock.
    // TurnThree card itself is also in hand (or discarded depending on implementation, usually in hand/reserved until resolved).
    // In this implementation, TurnThree is moved to target's hand.
    // So hand: TurnThree, 8, Lock.
    // 9 should still be in deck.

    // Note: The exact implementation of where TurnThree goes might vary, but we care about the drawn cards.
    const drawnCards = p2.hand.filter((c) => c.id !== 'turn3');

    // Expectation: 8 and Lock are drawn. 9 is NOT.
    expect(drawnCards.map((c) => c.id)).toContain('n8');
    expect(drawnCards.map((c) => c.id)).toContain('lock');
    expect(drawnCards.map((c) => c.id)).not.toContain('n9');

    // Deck should still have 9
    expect(nextState.deck.map((c) => c.id)).toContain('n9');

    // P2 should have pending action (Lock)
    expect(p2.pendingImmediateActionIds).toContain('lock');

    // Current player should be P2 (to resolve Lock)
    expect(nextState.currentPlayerId).toBe('p2');

    // 2. P2 resolves Lock on P3
    nextState = logic.performAction(nextState, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p2', cardId: 'lock', targetId: 'p3' },
    });

    p2 = nextState.players[1];

    // P2 should still have pending action (TurnThree resume)
    expect(p2.pendingImmediateActionIds).toHaveLength(1);
    const resumeActionId = p2.pendingImmediateActionIds![0];
    expect(resumeActionId).toContain('turn3');
    expect(resumeActionId).toContain('#resume:1');

    // 3. P2 resumes Turn Three (plays the resume action)
    // Target is P2 (self) because Turn Three is already applied to P2.
    nextState = logic.performAction(nextState, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p2', cardId: resumeActionId, targetId: 'p2' },
    });

    p2 = nextState.players[1];
    const p3 = nextState.players[2];

    // CHECKPOINT 2: Resumption
    // Now 9 should be drawn.
    const finalDrawnCards = p2.hand.filter((c) => !c.id.includes('turn3') && c.id !== 'lock');

    expect(finalDrawnCards.map((c) => c.id)).toContain('n8');
    expect(finalDrawnCards.map((c) => c.id)).toContain('n9');

    // Deck should be empty
    expect(nextState.deck).toHaveLength(0);

    // P3 should be locked
    expect(p3.isLocked).toBe(true);
  });
});
