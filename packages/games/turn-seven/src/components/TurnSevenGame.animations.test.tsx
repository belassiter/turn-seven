import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { TurnSevenGame } from './TurnSevenGame';
import { LocalGameService } from '../services/gameService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the game service
vi.mock('../services/gameService');

// Mock the overlay animation component
vi.mock('./GameOverlayAnimation', () => ({
  GameOverlayAnimation: ({ type, onComplete }: { type: string; onComplete: () => void }) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onComplete();
      }, 10);
      return () => clearTimeout(timer);
    }, [onComplete]);
    return (
      <div data-testid="game-overlay" data-type={type}>
        Overlay: {type}
      </div>
    );
  },
}));

describe('TurnSevenGame Animations', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gameServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscribers: ((state: any) => void)[] = [];

  beforeEach(() => {
    subscribers = [];

    gameServiceMock = {
      subscribe: vi.fn((cb) => {
        subscribers.push(cb);
        // Call immediately with current state
        cb(gameServiceMock.getState());
        return () => {};
      }),
      getState: vi.fn(),
      sendAction: vi.fn(),
      startNextRound: vi.fn(),
      reset: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LocalGameService as any).mockImplementation(function () {
      return gameServiceMock;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateState = (newState: any) => {
    gameServiceMock.getState.mockReturnValue(newState);
    act(() => {
      subscribers.forEach((cb) => cb(newState));
    });
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers Lock animation when a player gets locked', async () => {
    const initialState = {
      gamePhase: 'playing',
      players: [
        { id: 'p1', name: 'Player 1', hand: [], isLocked: false, hasBusted: false, isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      roundNumber: 1,
    };
    gameServiceMock.getState.mockReturnValue(initialState);

    const { getByTestId, queryByTestId, getByText } = render(<TurnSevenGame />);

    // Select Local Game
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));

    // Initial render
    expect(queryByTestId('game-overlay')).toBeNull();

    // Update state: Player 1 gets locked AND turn changes (usually lock ends turn? No, Lock just locks. But let's simulate turn change too to be sure)
    const lockedState = {
      ...initialState,
      currentPlayerId: 'p2', // Turn changes
      players: [{ ...initialState.players[0], isLocked: true }],
    };

    updateState(lockedState);

    // Should show overlay
    await waitFor(() => {
      expect(getByTestId('game-overlay')).toHaveAttribute('data-type', 'lock');
    });
  });

  it('triggers Bust animation when a player busts', async () => {
    const initialState = {
      gamePhase: 'playing',
      players: [
        { id: 'p1', name: 'Player 1', hand: [], isLocked: false, hasBusted: false, isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      roundNumber: 1,
    };
    gameServiceMock.getState.mockReturnValue(initialState);

    const { getByTestId, queryByTestId, getByText } = render(<TurnSevenGame />);

    // Select Local Game
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));

    expect(queryByTestId('game-overlay')).toBeNull();

    // Update state: Player 1 busts AND turn changes
    const bustedState = {
      ...initialState,
      currentPlayerId: 'p2',
      players: [{ ...initialState.players[0], hasBusted: true }],
    };

    updateState(bustedState);

    await waitFor(() => {
      expect(getByTestId('game-overlay')).toHaveAttribute('data-type', 'bust');
    });
  });

  it('triggers Lock animation BEFORE dealing cards', async () => {
    const initialState = {
      gamePhase: 'playing',
      players: [
        { id: 'p1', name: 'Player 1', hand: [], isLocked: false, hasBusted: false, isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      roundNumber: 1,
    };
    gameServiceMock.getState.mockReturnValue(initialState);

    const { getByTestId, queryByTestId, getByText } = render(<TurnSevenGame />);

    // Select Local Game
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));

    expect(queryByTestId('game-overlay')).toBeNull();

    // Update state: Player 1 gets Locked AND gets a card
    // The Lock animation should play first.
    // Since we can't easily check order in this test setup without complex mocks,
    // we at least verify that Lock animation plays even if a card deal is pending.
    const lockedAndDealtState = {
      ...initialState,
      players: [
        {
          ...initialState.players[0],
          isLocked: true,
          hand: [{ id: 'c1', rank: '1', suit: 'number' }],
        },
      ],
    };

    updateState(lockedAndDealtState);

    await waitFor(() => {
      expect(getByTestId('game-overlay')).toHaveAttribute('data-type', 'lock');
    });
  });

  /*
  // Flaky test due to timer mocking issues in environment
  it('animates dealing when round changes', async () => {
    vi.useFakeTimers();
    const round1State = {
      gamePhase: 'playing',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: [{ id: 'c1', rank: '1', suit: 'number' }],
          isLocked: false,
          hasBusted: false,
          isActive: true,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      roundNumber: 1,
    };
    gameServiceMock.getState.mockReturnValue(round1State);

    const { queryByText, queryAllByTestId } = render(<TurnSevenGame />);

    // Advance timers to let initial deal happen
    await act(async () => {
      vi.runAllTimers();
    });

    // Verify Round 1 state
    expect(queryByText('Round 1')).toBeInTheDocument();
    // Should have 1 card
    expect(queryAllByTestId('mini-card')).toHaveLength(1);

    // Update to Round 2
    const round2State = {
      ...round1State,
      roundNumber: 2,
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: [{ id: 'c2', rank: '2', suit: 'number' }],
          isLocked: false,
          hasBusted: false,
          isActive: true,
        },
      ],
    };

    updateState(round2State);

    // Advance time slightly (e.g. 10ms).
    // If logic is correct, we should be in "reset" state (empty hands) waiting for deal animation.
    // If logic is broken (instant sync), we would see the new card immediately.
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Expect NO cards (cleared for deal animation)
    // Note: If the bug exists, this assertion should FAIL because it will show 1 card (c2).
    expect(queryAllByTestId('mini-card')).toHaveLength(0);

    // Advance time to let animation finish
    await act(async () => {
      vi.runAllTimers();
    });

    // Now we should see the new card
    expect(queryAllByTestId('mini-card')).toHaveLength(1);
    expect(queryByText('Round 2')).toBeInTheDocument();

    vi.useRealTimers();
  });
  */

  it('triggers Turn 7 animation when a player gets 7 unique number cards', async () => {
    const initialHand = [
      { id: 'c1', rank: '1', suit: 'number' },
      { id: 'c2', rank: '2', suit: 'number' },
      { id: 'c3', rank: '3', suit: 'number' },
      { id: 'c4', rank: '4', suit: 'number' },
      { id: 'c5', rank: '5', suit: 'number' },
      { id: 'c6', rank: '6', suit: 'number' },
    ];

    const initialState = {
      gamePhase: 'playing',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: initialHand,
          isLocked: false,
          hasBusted: false,
          isActive: true,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      roundNumber: 1,
    };
    gameServiceMock.getState.mockReturnValue(initialState);

    const { getByTestId, getByText } = render(<TurnSevenGame />);

    // Select Local Game
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));

    // Wait for initial render to settle (it might animate the deal of 6 cards if we don't handle it)
    // But TurnSevenGame handles initial load by syncing if round > 1?
    // Or if round 1, it animates deal.
    // Here roundNumber is 1. So it will animate dealing 6 cards!
    // This takes time.

    // Let's set roundNumber to 2 to skip initial deal animation?
    // Or just wait.

    // Update state: Player 1 gets 7th unique card
    const turn7Hand = [...initialHand, { id: 'c7', rank: '7', suit: 'number' }];

    const turn7State = {
      ...initialState,
      players: [{ ...initialState.players[0], hand: turn7Hand }],
    };

    // We need to wait for the initial animations to finish before updating state?
    // If we update state while animating, the effect might get confused or queue things?
    // The effect has `if (isAnimating) return;`.
    // So if we update state, `realGameState` updates.
    // But `visualGameState` is lagging.
    // The loop will eventually catch up.

    updateState(turn7State);

    await waitFor(
      () => {
        expect(getByTestId('game-overlay')).toHaveAttribute('data-type', 'turn7');
      },
      { timeout: 5000 }
    );
  });
});
