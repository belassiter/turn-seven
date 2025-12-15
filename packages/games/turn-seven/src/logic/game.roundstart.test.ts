import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Round Start Logic', () => {
  const logic = new TurnSevenLogic();

  it('startNextRound ensures every player gets a card even if actions are drawn', () => {
    // Setup: P1, P2, P3.
    // Deck stack (top to bottom):
    // 1. TurnThree (drawn by P1, given to P2)
    // 2. 5 (drawn by P1 as replacement)
    // 3. 6 (drawn by P2)
    // 4. 7 (drawn by P3)
    // 5. 8, 9, 10 (drawn by P2 due to TurnThree resolution)

    // Wait, resolution happens immediately.
    // P1 draws TurnThree -> resolves on P2.
    // P2 draws 3 cards (8, 9, 10).
    // P1 loop continues -> draws 5.
    // P2 loop starts -> draws 6.
    // P3 loop starts -> draws 7.

    // So deck stack (pushed in reverse order of popping):
    // Bottom: 7, 6, 5, 10, 9, 8, TurnThree :Top

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          totalScore: 10,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          totalScore: 20,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
        },
        {
          id: 'p3',
          name: 'P3',
          hand: [],
          totalScore: 30,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 3,
      ledger: [],
    } as GameState;

    // Mock createDeck to return our specific stack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalCreateDeck = (logic as any).createDeck;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).createDeck = () => {
      return [
        { id: 'n7', suit: 'number', rank: '7', isFaceUp: false } as CardModel,
        { id: 'n6', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n5', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'n10', suit: 'number', rank: '10', isFaceUp: false } as CardModel,
        { id: 'n9', suit: 'number', rank: '9', isFaceUp: false } as CardModel,
        { id: 'n8', suit: 'number', rank: '8', isFaceUp: false } as CardModel,
        { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: false } as CardModel,
      ] as CardModel[];
    };

    const nextState = logic.startNextRound(state);

    // Restore mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logic as any).createDeck = originalCreateDeck;

    // P1 should have the '5' (replacement for TurnThree)
    // Wait, P1 drew TurnThree. It was queued.
    // P1 must target P2.
    // Then P2 draws 3 cards.
    // Then P1 continues dealing -> draws 5.
    // Then P2 continues dealing -> draws 6.
    // Then P3 continues dealing -> draws 7.

    // We need to simulate the targeting action.
    // startNextRound will pause after P1 draws TurnThree.
    // P1 has pending action.

    // So nextState will have P1 with pending TurnThree.
    expect(nextState.players[0].pendingImmediateActionIds).toContain('a1');

    // Perform the action: P1 targets P2
    const afterAction = logic.performAction(nextState, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });

    const p1Final = afterAction.players[0];
    const p2Final = afterAction.players[1];
    const p3Final = afterAction.players[2];

    // Now P1 should have the '5' (replacement for TurnThree)
    expect(p1Final.hand).toHaveLength(1);
    expect(p1Final.hand[0].rank).toBe('5');

    // P2 should have TurnThree + 3 drawn (8,9,10) = 4 cards (no extra base card as they already received cards)
    expect(p2Final.hand).toHaveLength(4);
    const ranks = p2Final.hand.map((c: CardModel) => c.rank);
    expect(ranks).toContain('TurnThree');
    expect(ranks).toContain('8');
    expect(ranks).toContain('9');
    expect(ranks).toContain('10');

    // P3 should have '6' (since P2 did not receive an extra base card)
    expect(p3Final.hand).toHaveLength(1);
    expect(p3Final.hand[0].rank).toBe('6');
  });
});
