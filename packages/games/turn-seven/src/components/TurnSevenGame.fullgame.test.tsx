import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TurnSevenGame } from './TurnSevenGame';
import React from 'react';
import { PlayerSetup } from './GameSetup';

// Mock GameSetup to auto-start with 3 bots
vi.mock('./GameSetup', () => ({
  GameSetup: ({ onStart }: { onStart: (players: PlayerSetup[]) => void }) => (
    <button
      data-testid="start-game-btn"
      onClick={() =>
        onStart([
          { name: 'Bot 1', isBot: true, botDifficulty: 'medium' },
          { name: 'Bot 2', isBot: true, botDifficulty: 'medium' },
          { name: 'Bot 3', isBot: true, botDifficulty: 'medium' },
        ])
      }
    >
      Start Game
    </button>
  ),
}));

describe('TurnSevenGame Full Bot Game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should run a 3-bot game to completion', { timeout: 120000 }, async () => {
    render(<TurnSevenGame />);

    // Select Local Game
    const localBtn = screen.getByText('Local Game');
    act(() => {
      localBtn.click();
    });

    // Start Game
    const startBtn = screen.getByTestId('start-game-btn');
    act(() => {
      startBtn.click();
    });

    // Advance timers to handle game start latency (300ms) + initial deal
    let round1Found = false;
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      if (screen.queryAllByText('Round 1').length > 0) {
        round1Found = true;
        break;
      }
    }
    expect(round1Found).toBe(true);

    // Run the game loop until Game Over
    let isGameOver = false;
    let loops = 0;
    const maxLoops = 2000; // Allow enough loops for a full game

    while (!isGameOver && loops < maxLoops) {
      // Advance time for bot thinking (1000ms) + animations
      await act(async () => {
        // Advance 5 seconds in 100ms steps
        for (let i = 0; i < 50; i++) {
          vi.advanceTimersByTime(100);
        }
      });

      // Check for "Start Next Round" button (end of round)
      const nextRoundBtn = screen.queryByText('Start Next Round');
      if (nextRoundBtn) {
        await act(async () => {
          nextRoundBtn.click();
        });
      }

      // Check for Game Over
      if (screen.queryByText('Game Over!')) {
        isGameOver = true;
      }

      loops++;
    }

    console.log(`Game finished in ${loops} loops`);

    expect(isGameOver).toBe(true);
    expect(screen.getByText(/Winner:/)).toBeInTheDocument();
  });
});
