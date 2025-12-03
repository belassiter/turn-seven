import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { TurnSevenLogic } from '../logic/game';

describe('TurnSevenGame component', () => {
  beforeEach(() => {
    // Mock createDeck to return a fixed deck to avoid flakiness and "TurnThree" surprises
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
      { id: 'c2', suit: 'number', rank: '2', isFaceUp: false },
      { id: 'c3', suit: 'number', rank: '3', isFaceUp: false },
      { id: 'c4', suit: 'number', rank: '4', isFaceUp: false },
      { id: 'c5', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'c6', suit: 'number', rank: '6', isFaceUp: false },
      { id: 'c7', suit: 'number', rank: '7', isFaceUp: false },
      { id: 'c8', suit: 'number', rank: '8', isFaceUp: false },
      { id: 'c9', suit: 'number', rank: '9', isFaceUp: false },
      { id: 'c10', suit: 'number', rank: '10', isFaceUp: false },
    ].reverse()); // reverse because pop() takes from end
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders the game board and actions', () => {
    const { getByText } = render(<TurnSevenGame />);
    // start the game via setup
    fireEvent.click(getByText('Start Game'));
    expect(getByText('Turn Seven')).toBeInTheDocument();
    expect(getByText('Hit')).toBeInTheDocument();
    expect(getByText('Stay')).toBeInTheDocument();
    expect(getByText('Player 1')).toBeInTheDocument();
  });

  it('handles Hit action', () => {
    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    // Initial hand size is 1.
    const hand = container.querySelector('.player-hand');
    expect(hand?.querySelectorAll('.card')).toHaveLength(1);
    
    fireEvent.click(getByText('Hit'));
    
    expect(hand?.querySelectorAll('.card')).toHaveLength(2);
  });

  it('handles Stay action', () => {
    // In single player, Stay keeps it on Player 1.
    // But we can verify the button is clickable and doesn't crash.
    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    const hitButton = getByText('Hit') as HTMLButtonElement;
    const stayButton = getByText('Stay') as HTMLButtonElement;

    // Initially Hit should be enabled
    expect(hitButton.disabled).toBe(false);

    fireEvent.click(stayButton);

    // After staying, in multi-player mode the turn should advance to the next player
    const actionsHeader = document.querySelector('.actions h2')?.textContent || '';
    fireEvent.click(stayButton);
    const actionsHeaderAfter = document.querySelector('.actions h2')?.textContent || '';
    expect(actionsHeaderAfter).not.toBe(actionsHeader);
    // Hit should be enabled for the next player
    expect(hitButton.disabled).toBe(false);
  });

  it('shows correct expected delta and hides Turn 7 when probability is exactly zero', () => {
    // re-mock deck so first card dealt to Player 1 is a 10 and remaining deck averages to 5
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
      { id: 'c3', suit: 'number', rank: '3', isFaceUp: false },
      { id: 'c5', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'c7', suit: 'number', rank: '7', isFaceUp: false },
      { id: 'c9', suit: 'number', rank: '9', isFaceUp: false },
      { id: 'c10', suit: 'number', rank: '10', isFaceUp: false }
    ]);

    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // enable odds display
    const dice = getByText('🎲');
    fireEvent.click(dice);

    // Expect: current hand is 10, remaining deck after dealing to 3 players is [1,3,5] -> avg=3
    // expected should be 13 (10 + 3), delta = +3
    expect(screen.getByText(/Expected score if hit: 13 pts \(\+3\)/)).toBeInTheDocument();
    // Should not show a Turn 7 percentage when turn7Probability is exactly zero
    expect(screen.queryByText(/Turn 7/)).toBeNull();
  });
});
