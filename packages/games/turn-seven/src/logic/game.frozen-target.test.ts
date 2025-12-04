import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Turn Three vs Frozen Player', () => {
  const logic = new TurnSevenLogic();

  it('should not allow targeting a frozen player with Turn Three', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: true, isActive: false, isFrozen: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as any,
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as any,
        { id: 'n3', suit: 'number', rank: '7', isFaceUp: false } as any,
      ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    // Attempt to play Turn Three on P2 (who is frozen/inactive)
    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    
    // P2 should NOT have received any cards
    const p2 = after.players.find((p: any) => p.id === 'p2')!;
    expect(p2.hand).toHaveLength(0);

    // P1 should still have the Turn Three card (action failed/ignored)
    const p1 = after.players.find((p: any) => p.id === 'p1')!;
    expect(p1.reservedActions).toHaveLength(1);
    expect(p1.reservedActions![0].id).toBe('a1');
  });
});
