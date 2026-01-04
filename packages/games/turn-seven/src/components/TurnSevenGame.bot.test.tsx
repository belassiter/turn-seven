import React from 'react';
import { render, fireEvent, screen, cleanup, within } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { GameState } from '@turn-seven/engine';

// Mock LocalGameService
const mockSendAction = vi.fn();
vi.mock('../services/gameService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gameService')>();
  return {
    ...actual,
    LocalGameService: class extends actual.LocalGameService {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(config: any) {
        super(config);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendAction(action: any) {
        mockSendAction(action);
        return Promise.resolve();
      }
    },
  };
});

describe('TurnSevenGame - Bot Conversion UI', () => {
  const initialGameState: GameState = {
    players: [
      {
        id: 'p1',
        name: 'Host Player',
        hand: [],
        hasStayed: false,
        isLocked: false,
        isActive: true,
        hasBusted: false,
        roundScore: 0,
        totalScore: 0,
        isBot: false,
      },
      {
        id: 'p2',
        name: 'Target Player',
        hand: [],
        hasStayed: false,
        isLocked: false,
        isActive: true,
        hasBusted: false,
        roundScore: 0,
        totalScore: 0,
        isBot: false,
      },
    ],
    deck: [],
    discardPile: [],
    currentPlayerId: 'p1',
    gamePhase: 'playing',
    ledger: [],
    roundNumber: 1,
  };

  beforeEach(() => {
    mockSendAction.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('should open modal when host clicks a player name', () => {
    render(<TurnSevenGame initialGameState={initialGameState} />);

    // Find player name in sidebar
    const targetPlayerName = screen.getByText('Target Player');
    fireEvent.click(targetPlayerName);

    // Check for modal
    expect(screen.getByText('Convert to Bot?')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to convert/)).toBeDefined();
    // "Target Player" is in the sidebar and the modal. We just want to ensure it's in the modal.
    const modalContent = screen.getByText('Convert to Bot?').closest('.modal-content');
    expect(modalContent).toBeDefined();
    expect(within(modalContent as HTMLElement).getByText('Target Player')).toBeDefined();
  });

  it('should close modal when Cancel is clicked', () => {
    render(<TurnSevenGame initialGameState={initialGameState} />);
    
    const targetPlayerName = screen.getAllByText('Target Player')[0];
    fireEvent.click(targetPlayerName);
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Convert to Bot?')).toBeNull();
    expect(mockSendAction).not.toHaveBeenCalled();
  });

  it('should send CONVERT_TO_BOT action when OK is clicked', () => {
    render(<TurnSevenGame initialGameState={initialGameState} />);
    
    const targetPlayerName = screen.getAllByText('Target Player')[0];
    fireEvent.click(targetPlayerName);
    fireEvent.click(screen.getByText('Convert'));

    expect(mockSendAction).toHaveBeenCalledWith({
      type: 'CONVERT_TO_BOT',
      payload: { playerId: 'p2' },
    });
    
    // Modal should close (optimistically or waiting for state update, but here we just check call)
    expect(screen.queryByText('Convert to Bot?')).toBeNull();
  });

  it('should not open modal for already bot players', () => {
    const botState = structuredClone(initialGameState);
    botState.players[1].isBot = true;
    botState.players[1].name = 'Target Player (Bot)';

    render(<TurnSevenGame initialGameState={botState} />);
    
    const botName = screen.getAllByText('Target Player (Bot)')[0];
    fireEvent.click(botName);
    expect(screen.queryByText('Convert to Bot?')).toBeNull();
  });
});
