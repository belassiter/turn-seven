import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('TurnSevenLogic', () => {
  const logic = new TurnSevenLogic();
  const playerIds = ['p1', 'p2'];

  beforeEach(() => {
    // Mock createDeck to return a fixed deck to avoid flakiness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      [
        { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
        { id: 'c2', suit: 'number', rank: '2', isFaceUp: false },
        { id: 'c3', suit: 'number', rank: '3', isFaceUp: false },
        { id: 'c4', suit: 'number', rank: '4', isFaceUp: false },
        { id: 'c5', suit: 'number', rank: '5', isFaceUp: false },
        { id: 'c6', suit: 'number', rank: '6', isFaceUp: false },
        { id: 'c7', suit: 'number', rank: '7', isFaceUp: false },
        { id: 'c8', suit: 'number', rank: '8', isFaceUp: false },
        { id: 'c9', suit: 'number', rank: '9', isFaceUp: false },
        { id: 'c10', suit: 'number', rank: '10', isFaceUp: false },
        // Add enough cards for tests that check deck length (need 94 total if we want to match original expectation,
        // but the test expects 92 remaining after deal. So we need 94 cards total.)
        // Actually, let's just update the expectation in the test to match our mock deck size.
      ].reverse()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates initial state correctly', () => {
    const state = logic.createInitialState(playerIds);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(1);
    expect(state.players[1].hand).toHaveLength(1);
    expect(state.currentPlayerId).toBe('p1');
    expect(state.gamePhase).toBe('playing');
    // Mock deck has 10 cards. 2 dealt -> 8 remaining.
    expect(state.deck).toHaveLength(8);
  });

  it('handles HIT action', () => {
    const initialState = logic.createInitialState(playerIds);
    const stateAfterHit = logic.performAction(initialState, { type: 'HIT' });

    const currentPlayer = stateAfterHit.players.find((p) => p.id === initialState.currentPlayerId);
    // After a hit the player either received a new card (hand length 2) or busted (duplicate moved to discard)
    expect(currentPlayer && (currentPlayer.hand.length === 2 || currentPlayer.hasBusted)).toBe(
      true
    );
    expect(stateAfterHit.deck).toHaveLength(initialState.deck.length - 1);
  });

  it('busts when drawing a duplicate number', () => {
    // Create a deterministic state: player already has a '5', deck top is also '5'
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true }],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'c2', suit: 'number', rank: '5', isFaceUp: false }],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const after = logic.performAction(state, { type: 'HIT' });
    const player = after.players[0];

    expect(player.hasBusted).toBe(true);
    expect(player.isActive).toBe(false);
    // duplicate card moved to discard
    // duplicate card appears in player's hand per new rule
    expect(player.hand.filter((h) => h.rank === '5').length).toBeGreaterThanOrEqual(2);
  });

  it('computes scores and ends round when all players inactive', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: [
            { id: 'c1', suit: 'number', rank: '2', isFaceUp: true },
            { id: 'c3', suit: 'number', rank: '3', isFaceUp: true },
          ],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
        {
          id: 'p2',
          name: 'Player 2',
          hand: [{ id: 'c2', suit: 'number', rank: '7', isFaceUp: true }],
          hasStayed: false,
          isActive: false,
          hasBusted: true,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const after = logic.performAction(state, { type: 'STAY' });
    expect(after.gamePhase).toBe('ended');
    const p1 = after.players.find((p) => p.id === 'p1')!;
    const p2 = after.players.find((p) => p.id === 'p2')!;
    expect(p1.roundScore).toBe(5); // 2 + 3
    expect(p1.totalScore).toBe(5);
    expect(p2.roundScore).toBe(0); // busted
    expect(p2.totalScore).toBe(0);
  });

  it('handles STAY action', () => {
    const initialState = logic.createInitialState(playerIds);
    // Force current player to be p1
    initialState.currentPlayerId = 'p1';

    const stateAfterStay = logic.performAction(initialState, { type: 'STAY' });

    expect(stateAfterStay.currentPlayerId).toBe('p2');
  });

  it('cycles back to first player on STAY', () => {
    const initialState = logic.createInitialState(playerIds);
    initialState.currentPlayerId = 'p2';

    const stateAfterStay = logic.performAction(initialState, { type: 'STAY' });

    expect(stateAfterStay.currentPlayerId).toBe('p1');
  });
});
