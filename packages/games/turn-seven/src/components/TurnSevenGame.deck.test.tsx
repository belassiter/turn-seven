import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { GameState } from '@turn-seven/engine';

describe('TurnSevenGame Deck Visibility', () => {
  it('renders the deck with the correct label', () => {
    const mockGameState: GameState = {
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          hand: [],
          isActive: true,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
          hasStayed: false,
          isLocked: false,
          pendingImmediateActionIds: [],
          hasLifeSaver: false,
        },
        {
          id: 'p2',
          name: 'Player 2',
          hand: [],
          isActive: true,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
          hasStayed: false,
          isLocked: false,
          pendingImmediateActionIds: [],
          hasLifeSaver: false,
        },
      ],
      deck: [
        { id: 'c1', suit: 'number', rank: '7' },
        { id: 'c2', suit: 'number', rank: '5' },
      ],
      discardPile: [],
      currentPlayerId: 'p1',
      roundStarterId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: '',
      previousRoundScores: {},
      ledger: [],
    };

    render(<TurnSevenGame initialGameState={mockGameState} />);

    // Check for the "Deck (2)" text
    const deckLabels = screen.getAllByText('Deck (2)');
    expect(deckLabels.length).toBeGreaterThan(0);
    expect(deckLabels[0]).toBeInTheDocument();

    // Check for the "T7" label on the card back
    // Note: The CSS might hide this, but it should be in the DOM
    const t7Labels = screen.getAllByText('T7');
    expect(t7Labels.length).toBeGreaterThan(0);
    expect(t7Labels[0]).toBeInTheDocument();

    // Check if the card back element exists
    // We can look for the class 'card-back'
    // Since we can't query by class easily with testing-library without setup, we can use the text to find the parent
    const cardBack = t7Labels[0].closest('.card-back');
    expect(cardBack).toBeInTheDocument();
  });
});
