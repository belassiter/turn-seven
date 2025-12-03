import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useActionTargeting } from './useActionTargeting';
import { ClientGameStateManager } from '@turn-seven/engine';
import { TurnSevenLogic } from '../logic/game';

describe('useActionTargeting', () => {
  it('manages targeting state', () => {
    const logic = new TurnSevenLogic();
    const manager = new ClientGameStateManager(logic.createInitialState(['p1', 'p2']));
    const { result } = renderHook(() => useActionTargeting(manager, logic));

    expect(result.current.targetingState).toBeNull();

    act(() => {
      result.current.startTargeting('card-1', 'p1');
    });

    expect(result.current.targetingState).toEqual({ cardId: 'card-1', actorId: 'p1' });

    act(() => {
      result.current.cancelTargeting();
    });

    expect(result.current.targetingState).toBeNull();
  });

  it('confirms target and performs action', () => {
    const logic = new TurnSevenLogic();
    const initialState = logic.createInitialState(['p1', 'p2']);
    const manager = new ClientGameStateManager(initialState);
    
    // Spy on performAction
    const performActionSpy = vi.spyOn(logic, 'performAction');
    const setStateSpy = vi.spyOn(manager, 'setState');

    const { result } = renderHook(() => useActionTargeting(manager, logic));

    act(() => {
      result.current.startTargeting('card-1', 'p1');
    });

    act(() => {
      result.current.confirmTarget('p2');
    });

    expect(performActionSpy).toHaveBeenCalledWith(
      expect.anything(), 
      {
        type: 'PLAY_ACTION',
        payload: {
          actorId: 'p1',
          cardId: 'card-1',
          targetId: 'p2'
        }
      }
    );
    expect(setStateSpy).toHaveBeenCalled();
    expect(result.current.targetingState).toBeNull();
  });
});
