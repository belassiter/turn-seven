import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card label scaling', () => {
  it('adds compact-label class for long action labels', () => {
    const longLabel = 'Turn Three Now!'; // length > 10
    const card = { id: 'a1', suit: 'action', rank: longLabel, isFaceUp: true } as any;
    const { container } = render(<Card card={card} />);
    const el = container.querySelector('.card');
    expect(el).toBeTruthy();
    // debug info in case of failure
    // eslint-disable-next-line no-console
    console.log('card className:', el?.className, 'label:', longLabel, 'len:', longLabel.length, 'rendered center:', screen.getByTestId('rank-center')?.textContent);
    expect(el && el.classList.contains('compact-label')).toBe(true);
    // The center rank should render the full label (we scale the font-size to fit)
    const centerEl = screen.getByTestId('rank-center');
    const centerText = centerEl?.textContent || '';
    // debug info in case of failure
    // eslint-disable-next-line no-console
    console.log('rendered center:', centerText, 'style=', centerEl?.getAttribute('style'));
    expect(centerText).toBe(longLabel);
    // Expect inline font-size style to be present and reduced from the default base (48px)
    const style = centerEl?.getAttribute('style') || '';
    const match = style.match(/font-size:\s*([0-9.]+)px/);
    expect(match).toBeTruthy();
    if (match) {
      const px = parseFloat(match[1]);
      expect(px).toBeLessThanOrEqual(48);
      expect(px).toBeGreaterThanOrEqual(8);
    }
  });

  it('does not add compact-label for short labels', () => {
    const shortLabel = 'Turn';
    const card = { id: 'a2', suit: 'action', rank: shortLabel, isFaceUp: true } as any;
    const { container } = render(<Card card={card} />);
    expect(container.querySelector('.card.compact-label')).toBeNull();
  });
});
