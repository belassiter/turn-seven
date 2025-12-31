import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Lobby, LobbyPlayer } from './Lobby';
import { describe, it, expect, vi } from 'vitest';

describe('Lobby component', () => {
  const basePlayers: LobbyPlayer[] = [
    { id: 'p1', name: 'Host', isHost: true },
    { id: 'p2', name: 'Alice', isHost: false },
    { id: 'bot1', name: '🤖 Bot', isHost: false, isBot: true, botDifficulty: 'medium' },
  ];

  it('shows remove button only for host and calls handler when clicked', () => {
    const onRemove = vi.fn();
    render(
      <Lobby
        gameId="GAME123"
        players={basePlayers}
        isHost={true}
        onStartGame={() => {}}
        onCopyInviteLink={() => {}}
        onRemovePlayer={onRemove}
      />
    );

    // Remove buttons should be present for non-host players
    const removeButtons = screen.getAllByTitle(/Remove/);
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click the first remove button and assert handler called
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalled();
  });

  it('hides remove button when not host', () => {
    const onRemove = vi.fn();
    render(
      <Lobby
        gameId="GAME123"
        players={basePlayers}
        isHost={false}
        onStartGame={() => {}}
        onCopyInviteLink={() => {}}
        onRemovePlayer={onRemove}
      />
    );

    // No remove buttons when not host
    const buttons = screen.queryAllByTitle(/Remove/);
    expect(buttons.length).toBe(0);
  });

  it('disables Add Bot button when max players reached', () => {
    const onAddBot = vi.fn();
    // Create 18 players
    const manyPlayers = Array.from({ length: 18 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
      isHost: i === 0,
    }));

    render(
      <Lobby
        gameId="FULL123"
        players={manyPlayers}
        isHost={true}
        onStartGame={() => {}}
        onCopyInviteLink={() => {}}
        onAddBot={onAddBot}
        maxPlayers={18}
      />
    );

    const addBotBtn = screen.getByText('Lobby Full');
    expect(addBotBtn).toBeDisabled();
    fireEvent.click(addBotBtn);
    expect(onAddBot).not.toHaveBeenCalled();
  });

  it('renders bot difficulty dropdown with correct styles', () => {
    const onUpdate = vi.fn();
    render(
      <Lobby
        gameId="BOT123"
        players={basePlayers}
        isHost={true}
        onStartGame={() => {}}
        onCopyInviteLink={() => {}}
        onUpdateBotDifficulty={onUpdate}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('medium');
    // Check if style is applied (basic check)
    expect(select).toHaveStyle({ color: '#eab308' }); // yellow-500 hex

    fireEvent.change(select, { target: { value: 'hard' } });
    expect(onUpdate).toHaveBeenCalledWith('bot1', 'hard');
  });
});
