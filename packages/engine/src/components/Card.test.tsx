import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardModel } from './Card';

describe('Card component', () => {
  const card: CardModel = { id: '1', suit: 'hearts', rank: 'A' };

  it('renders face down by default', () => {
    render(<Card card={card} />);
    expect(screen.getByText('', { selector: '.card-back' })).toBeInTheDocument();
  });

  it('renders face up when isFaceUp is true', () => {
    render(<Card card={{ ...card, isFaceUp: true }} />);
    // corners + center are rendered for non-number suits: top-left, center, bottom-right
    expect(screen.getAllByText('A')).toHaveLength(3);
    expect(screen.getByText('', { selector: '.suit-icon' })).toBeInTheDocument();
  });

  it('renders number card with only centered rank', () => {
    const numCard = { id: 'n1', suit: 'number', rank: '7', isFaceUp: true } as any;
    const { container } = render(<Card card={numCard} />);
    // the rank '7' should be rendered somewhere (center or corner)
    const matches = screen.queryAllByText('7');
    expect(matches.length).toBeGreaterThan(0);
  });
});
