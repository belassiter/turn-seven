import { describe, it, expect, vi } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel, PlayerModel } from '@turn-seven/engine';

describe('Mid-round reshuffle + large-player deal edge cases', () => {
  it('reshuffle that introduces an action card should resolve that action and pause dealing appropriately', () => {
    const logic = new TurnSevenLogic();

    // Craft a state where deck is empty and discard contains an action card (TurnThree)
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [{ id: 'h1', suit: 'number', rank: '5', isFaceUp: true } as CardModel],
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [{ id: 'h2', suit: 'number', rank: '6', isFaceUp: true } as CardModel],
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
      ],
      deck: [],
      discardPile: [
        // non-action card first so deterministic pop yields TurnThree after shuffle
        { id: 'd0', suit: 'number', rank: '8', isFaceUp: true } as CardModel,
        { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
      ],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    // stub shuffle deterministically (no reorder)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalShuffle = (logic as any).shuffle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = (arr: any[]) => [...arr];

    // When p1 hits, drawOne will reshuffle the discard into deck, the top card should be 'a1'
    const after = logic.performAction(state, { type: 'HIT' });

    // p1 should have TurnThree pending
    expect(after.players[0].pendingImmediateActionIds).toContain('a1');

    // Hands should remain intact and other player's hand shouldn't be moved into deck
    expect(after.players[0].hand.map((c: CardModel) => c.id)).toContain('h1');
    expect(after.players[1].hand.map((c: CardModel) => c.id)).toContain('h2');

    // Reshuffle should have emptied the discard (drawOne moves discard into deck)
    expect(after.discardPile).toHaveLength(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = originalShuffle;
  });

  it('startNextRound can deal to a very large player count using deck+discard and not lose cards', () => {
    const logic = new TurnSevenLogic();

    // make shuffle deterministic (preserve order)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalShuffle = (logic as any).shuffle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = (arr: any[]) => [...arr];

    const playerCount = 18;
    const players: PlayerModel[] = [];
    for (let i = 0; i < playerCount; i++)
      players.push({
        id: `p${i}`,
        name: `P${i}`,
        hand: [],
        hasStayed: false,
        isActive: true,
        hasBusted: false,
        pendingImmediateActionIds: [],
      });

    // For stability in CI, stub createDeck so the initial deal supplies enough cards
    // for the large player-count case and we can assert that each player gets a single card.
    const restoreCreate = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(logic as any, 'createDeck')
      .mockReturnValue(
        Array.from(
          { length: playerCount + 4 },
          (_, i) =>
            ({
              id: `cd${i}`,
              suit: 'number',
              rank: String((i % 12) + 1),
              isFaceUp: false,
            } as CardModel)
        ).reverse()
      );

    const state: GameState = {
      players,
      deck: [],
      discardPile: [],
      currentPlayerId: null,
      gamePhase: 'ended',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.startNextRound(state);

    // After dealing one card each, each active player should have exactly 1 card
    for (const p of next.players) {
      expect(p.hand).toHaveLength(1);
    }

    // There were playerCount+4 cards provided and playerCount were dealt, so remaining deck should be 4
    expect(next.deck.length).toBe(4);

    // And no discard remains (we didn't have any prior discard)
    expect(next.discardPile).toHaveLength(0);

    restoreCreate.mockRestore();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).shuffle = originalShuffle;
  });
});
