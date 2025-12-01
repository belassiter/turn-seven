import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';

describe('TurnSevenGame turn sequence (UI)', () => {
  afterEach(() => {
    cleanup();
  });

  it('advances current player on Stay until Next Round appears', () => {
    const { getByText } = render(<TurnSevenGame />);
    // Start the game via setup
    fireEvent.click(getByText('Start Game'));

    // Collect the sequence of current player names shown in the actions header
    const seen: string[] = [];
    // Limit iterations to avoid infinite loops in case of failure
    for (let i = 0; i < 10; i++) {
      const header = document.querySelector('.actions h2')?.textContent || '';
      if (header) seen.push(header);
      // If Next Round button appears, break
      const nextBtn = screen.queryByRole('button', { name: /next round/i });
      if (nextBtn) break;
      // Click Stay to mark current player inactive and advance
      const stay = getByText('Stay');
      fireEvent.click(stay);
    }

    // After all players have stayed, Next Round should appear
    const nextBtn = screen.queryByRole('button', { name: /next round/i });
    expect(nextBtn).toBeTruthy();
    // Ensure we saw at least two different players during the sequence
    const unique = Array.from(new Set(seen));
    expect(unique.length).toBeGreaterThanOrEqual(2);
  });

  it('current player rotates after Hit', () => {
    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    const actionsHeader = document.querySelector('.actions h2')?.textContent || '';
    // Perform a Hit (should advance to next active player)
    fireEvent.click(getByText('Hit'));
    const actionsHeaderAfter = document.querySelector('.actions h2')?.textContent || '';
    expect(actionsHeaderAfter).not.toBe(actionsHeader);
  });
});
