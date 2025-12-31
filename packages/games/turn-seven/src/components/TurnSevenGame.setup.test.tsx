import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';

// Mock child components to isolate TurnSevenGame logic
vi.mock('./GameSetup', () => ({
  GameSetup: ({ onStart }: { onStart: (...args: unknown[]) => void }) => (
    <div data-testid="game-setup">
      <button onClick={() => onStart([])}>Start Local Game</button>
    </div>
  ),
}));

vi.mock('./RemoteSetup', () => ({
  RemoteSetup: ({
    onCreateGame,
    onJoinGame,
  }: {
    onCreateGame: (...args: unknown[]) => void;
    onJoinGame: (...args: unknown[]) => void;
  }) => (
    <div data-testid="remote-setup">
      <button onClick={() => onCreateGame('Host')}>Create Remote Game</button>
      <button onClick={() => onJoinGame('CODE', 'Player')}>Join Remote Game</button>
    </div>
  ),
}));

vi.mock('./GameFooter', () => ({
  GameFooter: () => <div data-testid="game-footer">Footer</div>,
}));

describe('TurnSevenGame - Setup Screen', () => {
  it('renders the setup screen with tabs', () => {
    render(<TurnSevenGame />);

    expect(screen.getByText('Local Game')).toBeInTheDocument();
    expect(screen.getByText('Online Game')).toBeInTheDocument();
    expect(screen.getByTestId('game-setup')).toBeInTheDocument(); // Default is local
  });

  it('switches to RemoteSetup when Online Game tab is clicked', () => {
    render(<TurnSevenGame />);

    const onlineTab = screen.getByText('Online Game');
    fireEvent.click(onlineTab);

    expect(screen.getByTestId('remote-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('game-setup')).not.toBeInTheDocument();
  });

  it('switches back to GameSetup when Local Game tab is clicked', () => {
    render(<TurnSevenGame />);

    // Switch to remote first
    fireEvent.click(screen.getByText('Online Game'));
    expect(screen.getByTestId('remote-setup')).toBeInTheDocument();

    // Switch back to local
    fireEvent.click(screen.getByText('Local Game'));
    expect(screen.getByTestId('game-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('remote-setup')).not.toBeInTheDocument();
  });

  it('renders the logo on the setup screen', () => {
    render(<TurnSevenGame />);
    const logo = screen.getByAltText('Turn Seven');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logo.png');
  });
});
