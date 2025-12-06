import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Discard & shuffle behavior', () => {
  it('startNextRound moves all player cards to discard pile and clears hands', () => {
    const logic = new TurnSevenLogic();
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [{ id: 'a', rank: '1' } as CardModel],
          reservedActions: [{ id: 'r1', rank: 'Lock' } as CardModel],
          hasLifeSaver: true,
          totalScore: 10,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [{ id: 'b', rank: '2' } as CardModel],
          reservedActions: [],
          hasLifeSaver: false,
          totalScore: 20,
        },
      ],
      deck: [{ id: 'd1', suit: 'number', rank: '3', isFaceUp: false } as CardModel],
      discardPile: [{ id: 'old', rank: '0', suit: 'number' } as CardModel],
      currentPlayerId: 'p1',
      roundNumber: 1,
      ledger: [],
      gamePhase: 'ended',
    } as GameState;

    const next = logic.startNextRound(state);

    // All player cards and reserved actions should be in discard pile
    const discardIds = next.discardPile.map((c: CardModel) => c.id);
    expect(discardIds).toContain('a');
    expect(discardIds).toContain('r1');
    expect(discardIds).toContain('b');
    expect(discardIds).toContain('old');

    // Players should not retain their old cards in-hand; those should have gone to discard
    const p1HandIds = next.players[0].hand.map((c: CardModel) => c.id);
    const p2HandIds = next.players[1].hand.map((c: CardModel) => c.id);
    expect(p1HandIds).not.toContain('a');
    expect(p1HandIds).not.toContain('r1');
    expect(p2HandIds).not.toContain('b');
    // Players should also have no reserved actions or Life Saver carried over
    expect(next.players[0].reservedActions).toHaveLength(0);
    expect(next.players[0].hasLifeSaver).toBe(false);
  });

  it('draw reshuffles discard into deck when deck is empty mid-round', () => {
    const logic = new TurnSevenLogic();
    // stub shuffle to keep deterministic order (return same order so pop will take last element)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalShuffle = (logic as any).shuffle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = (arr: any[]) => [...arr];

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
      ],
      deck: [],
      discardPile: [
        { id: 'x', suit: 'number', rank: '9', isFaceUp: true } as CardModel,
        { id: 'y', suit: 'number', rank: '10', isFaceUp: true } as CardModel,
      ],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const afterHit = logic.performAction(state, { type: 'HIT' });

    // The draw should have shuffled discard into deck, then popped last card into player's hand
    expect(afterHit.players[0].hand.length).toBe(1);
    expect(afterHit.players[0].hand[0].id).toBe('y');

    // Discard pile should be empty after reshuffle
    expect(afterHit.discardPile).toHaveLength(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = originalShuffle;
  });
});
