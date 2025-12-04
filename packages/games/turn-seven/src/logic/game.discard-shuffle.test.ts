import { describe, it, expect, vi } from 'vitest';
import { TurnSevenLogic } from './game';

describe('Discard & shuffle behavior', () => {
  it('startNextRound moves all player cards to discard pile and clears hands', () => {
    const logic = new TurnSevenLogic();
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [{ id: 'a', rank: '1' }], reservedActions: [{ id: 'r1', rank: 'Freeze' }], hasSecondChance: true, totalScore: 10 },
        { id: 'p2', name: 'P2', hand: [{ id: 'b', rank: '2' }], reservedActions: [], hasSecondChance: false, totalScore: 20 }
      ],
      deck: [{ id: 'd1', suit: 'number', rank: '3', isFaceUp: false }],
      discardPile: [{ id: 'old', rank: '0', suit: 'number' }],
      currentPlayerId: 'p1',
      roundNumber: 1,
      gamePhase: 'ended'
    };

    const next = logic.startNextRound(state);

    // All player cards and reserved actions should be in discard pile
    const discardIds = next.discardPile.map((c: any) => c.id);
    expect(discardIds).toContain('a');
    expect(discardIds).toContain('r1');
    expect(discardIds).toContain('b');
    expect(discardIds).toContain('old');

    // Players should not retain their old cards in-hand; those should have gone to discard
    const p1HandIds = next.players[0].hand.map((c: any) => c.id);
    const p2HandIds = next.players[1].hand.map((c: any) => c.id);
    expect(p1HandIds).not.toContain('a');
    expect(p1HandIds).not.toContain('r1');
    expect(p2HandIds).not.toContain('b');
    // Players should also have no reserved actions or second chance carried over
    expect(next.players[0].reservedActions).toHaveLength(0);
    expect(next.players[0].hasSecondChance).toBe(false);
  });

  it('draw reshuffles discard into deck when deck is empty mid-round', () => {
    const logic = new TurnSevenLogic();
    // stub shuffle to keep deterministic order (return same order so pop will take last element)
    const originalShuffle = (logic as any).shuffle;
    (logic as any).shuffle = (arr: any[]) => [...arr];

    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], isActive: true, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      deck: [],
      discardPile: [
        { id: 'x', suit: 'number', rank: '9', isFaceUp: true },
        { id: 'y', suit: 'number', rank: '10', isFaceUp: true }
      ],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    const afterHit = logic.performAction(state, { type: 'HIT' });

    // The draw should have shuffled discard into deck, then popped last card into player's hand
    expect(afterHit.players[0].hand.length).toBe(1);
    expect(afterHit.players[0].hand[0].id).toBe('y');

    // Discard pile should be empty after reshuffle
    expect(afterHit.discardPile).toHaveLength(0);

    (logic as any).shuffle = originalShuffle;
  });
});
