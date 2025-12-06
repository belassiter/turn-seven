import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Three vs Locked Player', () => {
  const logic = new TurnSevenLogic();

  it('should not allow targeting a locked player with Turn Three', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: true,
          isActive: false,
          isLocked: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n3', suit: 'number', rank: '7', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    // Attempt to play Turn Three on P2 (who is locked/inactive)
    const after = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });

    // P2 should NOT have received any cards
    const p2 = after.players.find((p) => p.id === 'p2')!;
    expect(p2.hand).toHaveLength(0);

    // P1 should still have the Turn Three card (action failed/ignored)
    const p1 = after.players.find((p) => p.id === 'p1')!;
    expect(p1.reservedActions).toHaveLength(1);
    expect(p1.reservedActions![0].id).toBe('a1');
  });
});
