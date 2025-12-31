import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

describe('Large game UI (18 players) — integration', () => {
  it('renders 18 players in the sidebar and does not render per-player buttons in main area', async () => {
    // stub createDeck so no flakey action cards appear during initial deal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      Array.from({ length: 200 }, (_, i) => ({
        id: `c${i}`,
        suit: 'number',
        rank: String((i % 12) + 1),
        isFaceUp: false,
      })).reverse()
    );

    const { container, getByText } = render(<TurnSevenGame />);

    // Select Local Game
    fireEvent.click(getByText('Local Game'));

    // adjust setup: set player count slider to 18
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: '18' } });

    // Start game
    fireEvent.click(getByText('Start Game'));

    // Wait for sidebar to populate
    await waitFor(() => {
      const sidebar = container.querySelector('.player-sidebar');
      const rows = sidebar?.querySelectorAll('.player-row') || [];
      expect(rows.length).toBe(18);
    });

    // Main area should not contain player-row elements — targeting must occur via sidebar
    const main = container.querySelector('.game-main-area');
    const mainPlayerRows = main?.querySelectorAll('.player-row') || [];
    expect(mainPlayerRows.length).toBe(0);

    // Clean up
    vi.restoreAllMocks();
  });
});
