import { describe, it, expect, vi } from 'vitest';
import { ClientGameStateManager, GameState } from './gameState';

describe('ClientGameStateManager', () => {
  const initialState: GameState = {
    players: [],
    currentPlayerId: null,
    deck: [],
    discardPile: [],
    gamePhase: 'initial',
    roundNumber: 1,
  };

  it('initializes with the provided state', () => {
    const manager = new ClientGameStateManager(initialState);
    expect(manager.getState()).toEqual(initialState);
  });

  it('updates state with setState', () => {
    const manager = new ClientGameStateManager(initialState);
    manager.setState({ gamePhase: 'playing' });
    expect(manager.getState().gamePhase).toBe('playing');
    expect(manager.getState().players).toEqual([]); // Should preserve other fields
  });

  it('notifies subscribers when state changes', () => {
    const manager = new ClientGameStateManager(initialState);
    const callback = vi.fn();
    manager.subscribe(callback);

    manager.setState({ gamePhase: 'playing' });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ gamePhase: 'playing' }));
  });

  it('allows unsubscribing', () => {
    const manager = new ClientGameStateManager(initialState);
    const callback = vi.fn();
    const unsubscribe = manager.subscribe(callback);

    unsubscribe();
    manager.setState({ gamePhase: 'playing' });
    expect(callback).not.toHaveBeenCalled();
  });
});
