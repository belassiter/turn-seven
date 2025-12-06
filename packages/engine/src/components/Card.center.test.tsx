import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';
import type { CardModel } from '../index';

describe('Card visual expectations (centered number)', () => {
  it('number cards render only a single centered rank and no corner ranks', () => {
    const numCard: CardModel = { id: 'n1', suit: 'number', rank: '7', isFaceUp: true };
    const { container } = render(<Card card={numCard} />);

    // Expect exactly one centered rank element (use data-testid)
    const center = container.querySelectorAll('[data-testid="rank-center"]');
    expect(center.length).toBe(1);

    // Expect no corner ranks present in the DOM for number cards
    const topLeft = container.querySelector('.rank.top-left');
    const bottomRight = container.querySelector('.rank.bottom-right');
    expect(topLeft).toBeNull();
    expect(bottomRight).toBeNull();
  });
});
