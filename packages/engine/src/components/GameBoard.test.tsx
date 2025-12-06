import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameBoard, PlayerModel } from './GameBoard';
import { CardModel } from './Card';

describe('GameBoard component', () => {
  const players: PlayerModel[] = [
    { id: 'p1', name: 'Player 1', hand: [{ id: 'c1', suit: 'hearts', rank: 'A', isFaceUp: true }] },
    { id: 'p2', name: 'Player 2', hand: [{ id: 'c2', suit: 'spades', rank: 'K', isFaceUp: true }] },
  ];
  const deck: CardModel[] = [
    { id: 'd1', suit: 'diamonds', rank: '2' },
    { id: 'd2', suit: 'clubs', rank: '3' },
  ];
  const discardPile: CardModel[] = [{ id: 'dp1', suit: 'hearts', rank: '5' }];

  it('renders all players', () => {
    render(<GameBoard players={players} deck={deck} discardPile={discardPile} />);
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
  });

  it('renders deck count', () => {
    render(<GameBoard players={players} deck={deck} discardPile={discardPile} />);
    expect(screen.getByText('Deck: 2')).toBeInTheDocument();
  });

  it('renders discard pile top card', () => {
    render(<GameBoard players={players} deck={deck} discardPile={discardPile} />);
    expect(screen.getByText('Discard: 1')).toBeInTheDocument();
    // Check if the top card of discard pile is rendered (rank 5)
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('highlights the current player', () => {
    const { container } = render(
      <GameBoard players={players} currentPlayerId="p1" deck={deck} discardPile={discardPile} />
    );
    // We need to find the player area for p1 and check if it has the class or if the PlayerHand inside it has the class.
    // The GameBoard implementation passes isCurrentPlayer to PlayerHand.
    // So we can check if there is a .current-player element.
    expect(container.querySelector('.current-player')).toBeInTheDocument();
  });
});
