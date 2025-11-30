import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { FlipSevenGame } from './FlipSevenGame';

describe('FlipSevenGame component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the game board and actions', () => {
    const { getByText } = render(<FlipSevenGame />);
    expect(getByText('Turn Seven')).toBeInTheDocument();
    expect(getByText('Hit')).toBeInTheDocument();
    expect(getByText('Stay')).toBeInTheDocument();
    expect(getByText('Player 1')).toBeInTheDocument();
  });

  it('handles Hit action', () => {
    const { getByText, container } = render(<FlipSevenGame />);
    // Initial hand size is 1.
    const hand = container.querySelector('.player-hand');
    expect(hand?.querySelectorAll('.card')).toHaveLength(1);
    
    fireEvent.click(getByText('Hit'));
    
    expect(hand?.querySelectorAll('.card')).toHaveLength(2);
  });

  it('handles Stay action', () => {
    // In single player, Stay keeps it on Player 1.
    // But we can verify the button is clickable and doesn't crash.
    const { getByText } = render(<FlipSevenGame />);
    const hitButton = getByText('Hit') as HTMLButtonElement;
    const stayButton = getByText('Stay') as HTMLButtonElement;

    // Initially Hit should be enabled
    expect(hitButton.disabled).toBe(false);

    fireEvent.click(stayButton);

    // After staying in single-player mode, the player is marked as stayed and Hit should be disabled
    expect(hitButton.disabled).toBe(true);
    expect(getByText("Player 1's Turn")).toBeInTheDocument();

    // Simulate end of round and check Next Round flow
    // Force the component to show ended state by invoking Stay until round ends
    // For single-player, staying should cause the round to end and show results
    fireEvent.click(stayButton);
    expect(getByText('Round Results')).toBeInTheDocument();

    const nextBtn = getByText('Next Round');
    fireEvent.click(nextBtn);

    // After next round, the game should be in playing state and player's hand should reset to 1 card
    const hand = document.querySelector('.player-hand');
    expect(hand?.querySelectorAll('.card').length).toBe(1);
  });
});
