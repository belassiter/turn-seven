import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';

describe('TurnSevenLogic Ledger', () => {
  const logic = new TurnSevenLogic();

  it('initializes with empty ledger', () => {
    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    expect(state.ledger).toBeDefined();
    expect(state.ledger).toEqual([]);
  });

  it('records Hit action', () => {
    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    // Ensure Alice is current player
    state.currentPlayerId = state.players[0].id;

    const nextState = logic.performAction(state, { type: 'HIT' });
    // Note: If Alice draws an action card that ends her turn (like Life Saver), it might record that too?
    // But basic hit should record one entry.
    // If she draws Life Saver, handleHit calls advanceTurn.
    // Let's just check that at least one entry is added.
    expect(nextState.ledger.length).toBeGreaterThan(0);
    const entry = nextState.ledger[0];
    expect(entry.playerName).toBe('Alice');
    expect(entry.action).toBe('Hit');
    expect(entry.result).toContain('Drew');
  });

  it('records Stay action', () => {
    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    state.currentPlayerId = state.players[0].id;

    const nextState = logic.performAction(state, { type: 'STAY' });
    expect(nextState.ledger).toHaveLength(1);
    expect(nextState.ledger[0].playerName).toBe('Alice');
    expect(nextState.ledger[0].action).toBe('Stay');
    expect(nextState.ledger[0].result).toBe('Stayed');
  });
});
