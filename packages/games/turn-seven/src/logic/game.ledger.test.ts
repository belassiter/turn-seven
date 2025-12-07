import { describe, it, expect, vi } from 'vitest';
import { TurnSevenLogic } from './game';

describe('TurnSevenLogic Ledger', () => {
  const logic = new TurnSevenLogic();

  it('initializes with ledger entries for initial deal', () => {
    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    expect(state.ledger).toBeDefined();
    // Should have entries for dealing cards to Alice, Bob, Charlie
    expect(state.ledger.length).toBeGreaterThan(0);
    expect(state.ledger[0].action).toBe('Deal');
  });

  it('records Hit action', () => {
    // Mock createDeck to ensure no action cards are dealt (which would cause pending actions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(logic as any, 'createDeck').mockReturnValue([
      { id: 'c1', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'c2', suit: 'number', rank: '6', isFaceUp: false },
      { id: 'c3', suit: 'number', rank: '7', isFaceUp: false },
      { id: 'c4', suit: 'number', rank: '8', isFaceUp: false }, // card to draw
    ]);

    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    // Ensure Alice is current player
    state.currentPlayerId = state.players[0].id;

    const nextState = logic.performAction(state, { type: 'HIT' });
    // Note: If Alice draws an action card that ends her turn (like Life Saver), it might record that too?
    // But basic hit should record one entry.
    // If she draws Life Saver, handleHit calls advanceTurn.
    // Let's just check that at least one entry is added.
    expect(nextState.ledger.length).toBeGreaterThan(state.ledger.length);
    const entry = nextState.ledger[nextState.ledger.length - 1];
    expect(entry.playerName).toBe('Alice');
    expect(entry.action).toBe('Hit');
    expect(entry.result).toContain('Drew');
  });

  it('records Stay action', () => {
    // Mock createDeck to ensure no action cards are dealt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(logic as any, 'createDeck').mockReturnValue([
      { id: 'c1', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'c2', suit: 'number', rank: '6', isFaceUp: false },
      { id: 'c3', suit: 'number', rank: '7', isFaceUp: false },
    ]);

    const state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    state.currentPlayerId = state.players[0].id;

    const nextState = logic.performAction(state, { type: 'STAY' });
    expect(nextState.ledger.length).toBeGreaterThan(state.ledger.length);
    const entry = nextState.ledger[nextState.ledger.length - 1];
    expect(entry.playerName).toBe('Alice');
    expect(entry.action).toBe('Stay');
  });
});
