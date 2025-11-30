import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';

describe('TurnSevenGame component', () => {
  afterEach(() => {
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
});
