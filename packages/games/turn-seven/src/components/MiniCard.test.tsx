import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MiniCard } from './MiniCard';
import { CardModel } from '@turn-seven/engine';

describe('MiniCard', () => {
  it('renders number cards correctly', () => {
    const card: CardModel = { id: '1', rank: '7', suit: 'number' };
    render(<MiniCard card={card} />);
    expect(screen.getByText('7')).toBeDefined();
  });

  it('abbreviates Turn Three to T3', () => {
    const card: CardModel = { id: '2', rank: 'Turn Three', suit: 'action' };
    render(<MiniCard card={card} />);
    expect(screen.getByText('T3')).toBeDefined();
  });

  it('abbreviates Freeze to F', () => {
    const card: CardModel = { id: '3', rank: 'Freeze', suit: 'action' };
    render(<MiniCard card={card} />);
    expect(screen.getByText('F')).toBeDefined();
  });

  it('abbreviates Second Chance to 2C', () => {
    const card: CardModel = { id: '4', rank: 'Second Chance', suit: 'action' };
    render(<MiniCard card={card} />);
    expect(screen.getByText('2C')).toBeDefined();
  });

  it('abbreviates unknown actions to first letter', () => {
    const card: CardModel = { id: '5', rank: 'Unknown Action', suit: 'action' };
    render(<MiniCard card={card} />);
    expect(screen.getByText('U')).toBeDefined();
  });
});
