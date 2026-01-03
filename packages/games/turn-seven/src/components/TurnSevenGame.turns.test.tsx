import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { TurnSevenLogic } from '../logic/game';

// Mock LocalGameService to remove latency for tests
vi.mock('../services/gameService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gameService')>();
  return {
    ...actual,
    LocalGameService: class extends actual.LocalGameService {
      constructor() {
        super();
        // Force latency to 0
        // @ts-expect-error - accessing private/protected property for test
        this.simulatedLatencyMs = 0;
      }
    },
  };
});

describe('TurnSevenGame turn sequence (UI)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('advances current player on Stay until Next Round appears', async () => {
    // Mock createDeck to return a simple deck of numbers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `card-${i}`,
        suit: 'number',
        rank: String((i % 9) + 1),
        isFaceUp: false,
      }))
    );

    const { getByText } = render(<TurnSevenGame />);
    // Start the game via setup
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    // Collect the sequence of current player names shown in the actions header
    const seen: string[] = [];
    // Limit iterations to avoid infinite loops in case of failure
    for (let i = 0; i < 10; i++) {
      const header = document.querySelector('.zone-header h2')?.textContent || '';
      if (header) seen.push(header);

      // If Next Round button appears, break
      const nextBtn = screen.queryByRole('button', { name: /start next round/i });
      if (nextBtn) break;

      // Click Stay to mark current player inactive and advance
      const stay = getByText('Stay');
      // Wait for animation lock to release
      await waitFor(() => expect(stay.closest('button')).not.toBeDisabled());
      fireEvent.click(stay);

      // Wait for player change or next round button
      await waitFor(() => {
        const newHeader = document.querySelector('.zone-header h2')?.textContent || '';
        const newNextBtn = screen.queryByRole('button', { name: /start next round/i });
        if (newNextBtn) return; // Success
        if (newHeader !== header) return; // Success
        // If neither happened, throw to keep waiting
        throw new Error('Waiting for turn advance or round end');
      }, { timeout: 2000 });
    }

    // After all players have stayed, Next Round should appear
    await waitFor(() => {
      const nextBtn = screen.queryByRole('button', { name: /start next round/i });
      expect(nextBtn).toBeTruthy();
    });

    // Ensure we saw at least two different players during the sequence
    const unique = Array.from(new Set(seen));
    expect(unique.length).toBeGreaterThanOrEqual(2);
  });

  it('current player rotates after Stay', async () => {
    // Mock createDeck to return a simple deck of numbers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `card-${i}`,
        suit: 'number',
        rank: String((i % 9) + 1),
        isFaceUp: false,
      }))
    );

    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Local Game'));
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    const actionsHeader = document.querySelector('.zone-header h2')?.textContent || '';
    // Perform a Stay (should advance to next active player)
    const stay = getByText('Stay');
    await waitFor(() => expect(stay.closest('button')).not.toBeDisabled());
    fireEvent.click(stay);

    await waitFor(() => {
      const actionsHeaderAfter = document.querySelector('.zone-header h2')?.textContent || '';
      expect(actionsHeaderAfter).not.toBe(actionsHeader);
    }, { timeout: 2000 });
  });
});
