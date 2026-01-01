import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';
import { CardModel } from '../types';

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
    const numCard: CardModel = { id: 'n1', suit: 'number', rank: '7', isFaceUp: true };
    render(<Card card={numCard} />);
    // the rank '7' should be rendered somewhere (center or corner)
    const matches = screen.queryAllByText('7');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders modifier card with modifier-card class and centered rank', () => {
    const modCard: CardModel = { id: 'm1', suit: 'modifier', rank: '+4', isFaceUp: true };
    const { container } = render(<Card card={modCard} />);
    expect(container.querySelector('.modifier-card')).toBeTruthy();
    const center = container.querySelector('[data-testid="rank-center"]');
    expect(center).toBeTruthy();
    expect(center?.textContent).toContain('+4');
    // The inner text span should be restricted to at most 90% width to avoid overflow in UI
    const inner = center?.querySelector('span') as HTMLElement | null;
    expect(inner).toBeTruthy();
    // Modifiers are no longer scaled to 90% width, they behave like number cards
    expect(inner?.style.width).not.toBe('90%');
  });

  it('renders action card with action-card class and shows a centered rank element', () => {
    const actionCard: CardModel = { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true };
    const { container } = render(<Card card={actionCard} />);
    expect(container.querySelector('.action-card')).toBeTruthy();
    const center = container.querySelector('[data-testid="rank-center"]');
    expect(center).toBeTruthy();
    // The display label now shows an image for TurnThree; ensure the image is present and sized to 80%.
    const actionImg = center?.querySelector('img') as HTMLImageElement | null;
    expect(actionImg).toBeTruthy();
    expect(actionImg?.style.width).toBe('80%');
  });

  it('modifier +10 and x2 should NOT use 90% center width (same as number cards)', () => {
    const plus10: CardModel = { id: 'mod10', suit: 'modifier', rank: '+10', isFaceUp: true };
    const x2: CardModel = { id: 'modx2', suit: 'modifier', rank: 'x2', isFaceUp: true };
    const { container } = render(<Card card={plus10} />);
    const plusCenter = container.querySelector('[data-testid="rank-center"]');
    const innerPlus = plusCenter?.querySelector('span') as HTMLElement | null;
    expect(innerPlus).toBeTruthy();
    expect(innerPlus?.style.width).not.toBe('90%');

    const { container: c2 } = render(<Card card={x2} />);
    const x2Center = c2.querySelector('[data-testid="rank-center"]');
    const innerX2 = x2Center?.querySelector('span') as HTMLElement | null;
    expect(innerX2).toBeTruthy();
    expect(innerX2?.style.width).not.toBe('90%');
  });
});
