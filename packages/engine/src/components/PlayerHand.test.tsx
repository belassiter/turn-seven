import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerHand } from './PlayerHand';
import { CardModel } from '../types';

describe('PlayerHand component', () => {
  const cards: CardModel[] = [
    { id: '1', suit: 'hearts', rank: 'A', isFaceUp: true },
    { id: '2', suit: 'spades', rank: '10', isFaceUp: true },
  ];

  it('renders all cards in the hand', () => {
    render(<PlayerHand cards={cards} />);
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
  });

  it('applies current-player class when isCurrentPlayer is true', () => {
    const { container } = render(<PlayerHand cards={cards} isCurrentPlayer={true} />);
    expect(container.firstChild).toHaveClass('current-player');
  });

  it('does not apply current-player class when isCurrentPlayer is false', () => {
    const { container } = render(<PlayerHand cards={cards} isCurrentPlayer={false} />);
    expect(container.firstChild).not.toHaveClass('current-player');
  });
});
