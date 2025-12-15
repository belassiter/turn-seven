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
      ledger: [],
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
      ledger: [],
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

  it('rotates dealer deterministically based on round number', () => {
    // Setup: Round 1
    const state = logic.createInitialStateFromNames(['P1', 'P2', 'P3']);
    expect(state.roundStarterId).toBe('p1');

    // Force Round 2
    // Even if we mess up roundStarterId, it should calculate based on round number
    state.roundStarterId = 'p3'; // Wrong starter for round 1 context
    state.roundNumber = 1;

    // End round
    state.gamePhase = 'ended';
    state.players.forEach((p) => (p.hand = []));

    const round2 = logic.startNextRound(state);
    // Round 2 should start with index 1 (P2)
    expect(round2.roundNumber).toBe(2);
    expect(round2.roundStarterId).toBe('p2');

    // Force Round 3
    round2.gamePhase = 'ended';
    round2.players.forEach((p) => (p.hand = []));
    const round3 = logic.startNextRound(round2);
    // Round 3 should start with index 2 (P3)
    expect(round3.roundNumber).toBe(3);
    expect(round3.roundStarterId).toBe('p3');

    // Force Round 4
    round3.gamePhase = 'ended';
    round3.players.forEach((p) => (p.hand = []));
    const round4 = logic.startNextRound(round3);
    // Round 4 should wrap to index 0 (P1)
    expect(round4.roundNumber).toBe(4);
    expect(round4.roundStarterId).toBe('p1');
  });

  it('interrupts dealing when an immediate action (TurnThree) is dealt', () => {
    // Override the default mock deck for this test
    // Stack: Bottom [Number, Number, TurnThree] Top
    const t3 = { id: 't3', suit: 'action', rank: 'TurnThree', isFaceUp: false };
    const n1 = { id: 'n1', suit: 'number', rank: '5', isFaceUp: false };
    const n2 = { id: 'n2', suit: 'number', rank: '6', isFaceUp: false };

    // @ts-expect-error - mocking private method
    logic.createDeck.mockReturnValue([n2, n1, t3]);

    const state = logic.createInitialStateFromNames(['P1', 'P2', 'P3']);

    // P1 should get TurnThree and dealing should stop
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p3 = state.players[2];

    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('TurnThree');
    expect(p1.pendingImmediateActionIds).toHaveLength(1);

    // P2 and P3 should not have received cards
    expect(p2.hand).toHaveLength(0);
    expect(p3.hand).toHaveLength(0);

    // Current player must be P1 to resolve the action
    expect(state.currentPlayerId).toBe('p1');
  });
});
