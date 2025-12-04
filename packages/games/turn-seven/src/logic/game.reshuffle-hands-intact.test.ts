import { describe, it, expect, vi } from 'vitest';
import { TurnSevenLogic } from './game';

describe('Mid-round reshuffle preserves player hands', () => {
  it('does not move cards from players hands into the deck during mid-round reshuffle', () => {
    const logic = new TurnSevenLogic();

    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [{ id: 'h1', suit: 'number', rank: '5', isFaceUp: true }], isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [{ id: 'h2', suit: 'number', rank: '6', isFaceUp: true }], isActive: true, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      // Deck empty to force reshuffle
      deck: [],
      // Discard has cards which should be used to refill
      discardPile: [
        { id: 'd1', suit: 'number', rank: '8', isFaceUp: true },
        { id: 'd2', suit: 'number', rank: '9', isFaceUp: true }
      ],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    // stub shuffle to deterministic order
    const originalShuffle = (logic as any).shuffle;
    (logic as any).shuffle = (arr: any[]) => [...arr];

    const after = logic.performAction(state, { type: 'HIT' });

    // player p1 should have drawn 'd2'
    expect(after.players[0].hand.map((c: any) => c.id)).toContain('d2');

    // The original hands (h1, h2) must still be present in their owners' hands
    expect(after.players[0].hand.map((c: any) => c.id)).toContain('h1');
    expect(after.players[1].hand.map((c: any) => c.id)).toContain('h2');

    // Discard pile should be emptied after reshuffle
    expect(after.discardPile).toHaveLength(0);

    (logic as any).shuffle = originalShuffle;
  });
});
