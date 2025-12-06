import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnSevenGame } from './TurnSevenGame';
import React from 'react';

// Mock child components to isolate TurnSevenGame logic
vi.mock('./GameFooter', () => ({
  GameFooter: () => <div data-testid="game-footer" />,
}));

vi.mock('./PlayerSidebar', () => ({
  PlayerSidebar: () => <div data-testid="player-sidebar" />,
}));

vi.mock('./ActivePlayerHand', () => ({
  ActivePlayerHand: () => <div data-testid="active-player-hand" />,
}));

vi.mock('./GameSetup', () => ({
  GameSetup: ({ onStart }: { onStart: (names: string[]) => void }) => (
    <button onClick={() => onStart(['P1', 'P2', 'P3'])} data-testid="start-game-btn">
      Start Game
    </button>
  ),
}));

// Mock CardGalleryModal
vi.mock('./CardGalleryModal', () => ({
  CardGalleryModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="card-gallery-modal">
      <h1>Card Gallery</h1>
      <button onClick={onClose} data-testid="close-gallery-btn">
        Close
      </button>
    </div>
  ),
}));

describe('TurnSevenGame Gallery Integration', () => {
  it('opens and closes the card gallery modal', () => {
    render(<TurnSevenGame />);

    // Start the game to see the header
    fireEvent.click(screen.getByTestId('start-game-btn'));

    // Verify gallery is closed initially
    expect(screen.queryByTestId('card-gallery-modal')).toBeNull();

    // Open gallery via button in status bar
    fireEvent.click(screen.getByTitle('Card Gallery'));
    expect(screen.getByTestId('card-gallery-modal')).toBeDefined();

    // Close gallery via modal button
    fireEvent.click(screen.getByTestId('close-gallery-btn'));
    expect(screen.queryByTestId('card-gallery-modal')).toBeNull();
  });
});
