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

  it('abbreviates camelcase TurnThree to T3', () => {
    const card: CardModel = { id: '2b', rank: 'TurnThree', suit: 'action' };
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

  it('renders modifier mini-cards (+2 and x2) with modifier helper class', () => {
    const plusCard: CardModel = { id: '6', rank: '+2', suit: 'modifier' };
    const x2Card: CardModel = { id: '7', rank: 'x2', suit: 'modifier' };

    const { container: plusContainer } = render(<MiniCard card={plusCard} />);
    expect(plusContainer.querySelector('.mini-card-modifier')).toBeTruthy();
    expect(screen.getByText('+2')).toBeDefined();

    const { container: x2Container } = render(<MiniCard card={x2Card} />);
    expect(x2Container.querySelector('.mini-card-modifier')).toBeTruthy();
    expect(screen.getByText('x2')).toBeDefined();
  });
});
