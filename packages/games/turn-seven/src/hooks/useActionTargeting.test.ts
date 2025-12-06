import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useActionTargeting } from './useActionTargeting';
import { IGameService } from '../services/gameService';

describe('useActionTargeting', () => {
  it('manages targeting state', () => {
    const mockService = {
      sendAction: vi.fn(),
    } as unknown as IGameService;

    const { result } = renderHook(() => useActionTargeting(mockService));

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

  it('confirms target and performs action', async () => {
    const mockService = {
      sendAction: vi.fn().mockResolvedValue(undefined),
    } as unknown as IGameService;

    const { result } = renderHook(() => useActionTargeting(mockService));

    act(() => {
      result.current.startTargeting('card-1', 'p1');
    });

    await act(async () => {
      await result.current.confirmTarget('p2');
    });

    expect(mockService.sendAction).toHaveBeenCalledWith({
      type: 'PLAY_ACTION',
      payload: {
        actorId: 'p1',
        cardId: 'card-1',
        targetId: 'p2',
      },
    });

    expect(result.current.targetingState).toBeNull();
  });
});
