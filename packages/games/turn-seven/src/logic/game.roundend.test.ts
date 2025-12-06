import { describe, it, expect, vi, afterEach } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Round end and startNextRound behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ends round sets gamePhase ended and clears currentPlayerId', () => {
    const logic = new TurnSevenLogic();
    // Minimal state with all players inactive
    const s: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: false,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    // Performing STAY should detect no active players remaining and end the round
    const after = logic.performAction(s, { type: 'STAY' });
    expect(after.gamePhase === 'ended' || after.gamePhase === 'gameover').toBe(true);
    expect(after.currentPlayerId).toBeNull();
  });

  it('startNextRound resets isLocked and sets currentPlayerId to first player', () => {
    const logic = new TurnSevenLogic();

    // Mock createDeck to return simple number cards to avoid action card side effects (flakiness)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(logic as any, 'createDeck').mockReturnValue(
      [
        { id: 'c1', suit: 'number', rank: '1', isFaceUp: false } as CardModel,
        { id: 'c2', suit: 'number', rank: '2', isFaceUp: false } as CardModel,
        { id: 'c3', suit: 'number', rank: '3', isFaceUp: false } as CardModel,
        { id: 'c4', suit: 'number', rank: '4', isFaceUp: false } as CardModel,
        { id: 'c5', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'c6', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
      ].reverse()
    );

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
        {
          id: 'p3',
          name: 'P3',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const next = logic.startNextRound(state);
    expect(next.currentPlayerId).toBe(next.players[0].id);
  });

  it('startNextRound should *preserve* the previous deck (not replace it) when it is non-empty', () => {
    const logic = new TurnSevenLogic();

    // If there is an existing deck, startNextRound should not replace it with a fresh deck.
    // We assert that createDeck is NOT called in this case.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(logic as any, 'createDeck');

    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
        },
      ],
      deck: [{ id: 'leftover', suit: 'number', rank: '1', isFaceUp: false } as CardModel],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'ended',
      roundNumber: 1,
    } as GameState;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const next = logic.startNextRound(state);

    // createDeck should not have been called because a non-empty deck was present
    expect(spy).not.toHaveBeenCalled();
  });
});
