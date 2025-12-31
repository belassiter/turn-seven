import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RemoteSetup } from './RemoteSetup';

describe('RemoteSetup', () => {
  it('renders both Create and Join sections', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Existing game code')).toBeInTheDocument();
    expect(screen.getByTestId('create-game-btn')).toBeInTheDocument();
    expect(screen.getByTestId('join-game-btn')).toBeInTheDocument();
  });

  it('disables Create Game button when name is empty', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    const createBtn = screen.getByTestId('create-game-btn');
    expect(createBtn).toBeDisabled();
  });

  it('enables Create Game button when name is entered', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    const nameInput = screen.getByTestId('player-name-input');
    const createBtn = screen.getByTestId('create-game-btn');

    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    expect(createBtn).toBeEnabled();
  });

  it('disables Create Game button when existing game code is entered', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    const nameInput = screen.getByTestId('player-name-input');
    const codeInput = screen.getByTestId('game-code-input');
    const createBtn = screen.getByTestId('create-game-btn');

    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    fireEvent.change(codeInput, { target: { value: 'ABC' } });

    expect(createBtn).toBeDisabled();
  });

  it('calls onCreateGame when Create Game button is clicked', () => {
    const onCreateGame = vi.fn();
    render(<RemoteSetup onCreateGame={onCreateGame} onJoinGame={vi.fn()} />);

    const nameInput = screen.getByTestId('player-name-input');
    const createBtn = screen.getByTestId('create-game-btn');

    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    fireEvent.click(createBtn);

    expect(onCreateGame).toHaveBeenCalledWith('Player 1');
  });

  it('disables Join Game button when name or code is empty', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    const joinBtn = screen.getByTestId('join-game-btn');
    expect(joinBtn).toBeDisabled();

    const nameInput = screen.getByTestId('player-name-input');
    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    expect(joinBtn).toBeDisabled(); // Code still empty
  });

  it('enables Join Game button when name and code are entered', () => {
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);

    const nameInput = screen.getByTestId('player-name-input');
    const codeInput = screen.getByTestId('game-code-input');
    const joinBtn = screen.getByTestId('join-game-btn');

    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    fireEvent.change(codeInput, { target: { value: 'ABCDEF' } });

    expect(joinBtn).toBeEnabled();
  });

  it('calls onJoinGame when Join Game button is clicked', () => {
    const onJoinGame = vi.fn();
    render(<RemoteSetup onCreateGame={vi.fn()} onJoinGame={onJoinGame} />);

    const nameInput = screen.getByTestId('player-name-input');
    const codeInput = screen.getByTestId('game-code-input');
    const joinBtn = screen.getByTestId('join-game-btn');

    fireEvent.change(nameInput, { target: { value: 'Player 1' } });
    fireEvent.change(codeInput, { target: { value: 'ABCDEF' } });
    fireEvent.click(joinBtn);

    expect(onJoinGame).toHaveBeenCalledWith('ABCDEF', 'Player 1');
  });
});
