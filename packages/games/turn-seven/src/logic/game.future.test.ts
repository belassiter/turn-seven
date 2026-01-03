import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('TurnSevenLogic - Future Features & Robustness', () => {
  const logic = new TurnSevenLogic();
  const playerIds = ['p1', 'p2', 'p3'];

  beforeEach(() => {
    // Mock createDeck to return a fixed deck for determinism in these tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockImplementation(() =>
      Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        suit: 'number',
        rank: (i % 10) + 1,
        isFaceUp: false,
      }))
    );
  });

  it('serializes and deserializes state correctly without data loss', () => {
    const initialState = logic.createInitialState(playerIds);

    // Perform some actions to get a complex state
    let state = logic.performAction(initialState, { type: 'HIT' });
    state = logic.performAction(state, { type: 'STAY' });

    // Serialize
    const jsonString = JSON.stringify(state);

    // Deserialize
    const restoredState = JSON.parse(jsonString) as GameState;

    // Verify deep equality
    expect(restoredState).toEqual(state);

    // Verify logic still works on restored state
    const nextState = logic.performAction(restoredState, { type: 'HIT' });
    expect(nextState).not.toBe(restoredState);
    expect(nextState.players).toBeDefined();
  });

  it('prevents players from acting out of turn (PLAY_ACTION)', () => {
    // Setup: P1 is current player. P2 has a reserved action (artificially added).
    const state = logic.createInitialState(playerIds);
    state.currentPlayerId = 'p1';

    // Give P2 a reserved action
    const actionCard = { id: 'ac1', suit: 'action', rank: 'Lock', isFaceUp: true };
    state.players[1].reservedActions = [actionCard];
    // P2 is NOT current player.

    // Attempt to play P2's action
    const nextState = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: {
        actorId: 'p2',
        cardId: 'ac1',
        targetId: 'p3',
      },
    });

    // Expectation: State should not change (or at least action should not be consumed)
    // If the logic allows it, P2's reservedActions will be empty.
    // If the logic prevents it, P2 still has the card.

    // NOTE: If this fails, it means our logic allows out-of-turn actions, which is a security risk for remote play.
    const p2 = nextState.players[1];
    expect(p2.reservedActions).toBeDefined();
    expect(p2.reservedActions!).toHaveLength(1);
    expect(p2.reservedActions![0].id).toBe('ac1');
  });

  it('is deterministic given a fixed deck', () => {
    // Run two separate game instances with the same initial conditions (mocked deck)
    const state1 = logic.createInitialState(playerIds);
    let s1 = logic.performAction(state1, { type: 'HIT' });
    s1 = logic.performAction(s1, { type: 'STAY' });
    s1 = logic.performAction(s1, { type: 'HIT' });

    const state2 = logic.createInitialState(playerIds);
    let s2 = logic.performAction(state2, { type: 'HIT' });
    s2 = logic.performAction(s2, { type: 'STAY' });
    s2 = logic.performAction(s2, { type: 'HIT' });

    // Normalize timestamps for comparison
    const normalize = (s: GameState) => {
      s.ledger.forEach((l) => (l.timestamp = 0));
      if (s.lastTurnEvents) {
        s.lastTurnEvents.forEach((e) => (e.timestamp = 0));
      }
      return s;
    };

    expect(normalize(s1)).toEqual(normalize(s2));
  });
});
