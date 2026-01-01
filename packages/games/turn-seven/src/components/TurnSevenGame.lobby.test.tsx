import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TurnSevenGame } from './TurnSevenGame';

const mockStart = vi.fn();
const mockSubscribeToLobby = vi.fn();
const mockJoinGame = vi.fn().mockResolvedValue('p1');
const mockAddBot = vi.fn();
const mockUpdateBotDifficulty = vi.fn();

// Mock the engine module
vi.mock('@turn-seven/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@turn-seven/engine')>();
  return {
    ...actual,
    RemoteGameService: vi.fn().mockImplementation(function () {
      return {
        start: mockStart,
        subscribeToLobby: mockSubscribeToLobby,
        joinGame: mockJoinGame,
        addBot: mockAddBot,
        updateBotDifficulty: mockUpdateBotDifficulty,
        subscribe: vi.fn(() => vi.fn()),
        getState: vi.fn(),
      };
    }),
  };
});

describe('TurnSevenGame Lobby Difficulty', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    const mockLocation = {
      search: '?game=test-game',
      origin: 'http://localhost',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      href: 'http://localhost?game=test-game',
      toString: () => 'http://localhost?game=test-game',
    };

    vi.stubGlobal('location', mockLocation);
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });
    }
  });

  it('passes the correct bot difficulty to start() when starting a remote game', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lobbyCallback: (state: any) => void;

    // Mock subscribeToLobby to simulate lobby state update
    mockSubscribeToLobby.mockImplementation((callback) => {
      lobbyCallback = callback;
      // Simulate initial lobby state
      callback({
        gameId: 'test-game',
        players: [{ id: 'p1', name: 'Player 1', isHost: true }],
        bots: {},
        config: {
          botDifficulty: 'easy',
        },
      });
      return vi.fn(); // unsubscribe
    });

    render(<TurnSevenGame />);

    // 1. Enter name and join
    const nameInput = await screen.findByPlaceholderText(/Enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Player 1' } });

    const joinButton = screen.getByText(/Join Game/i);
    fireEvent.click(joinButton);

    // Wait for lobby to appear
    const startButton = await screen.findByText(/Start Game/i);

    // 2. Add a bot
    const addBotButton = screen.getByText('+ Add Bot');
    fireEvent.click(addBotButton);

    expect(mockAddBot).toHaveBeenCalled();

    // Simulate lobby update with a bot
    const botId = 'bot-1';
    const botPlayer = {
      id: botId,
      name: 'Bot 1',
      isHost: false,
      isBot: true,
      botDifficulty: 'easy',
    };

    // Add a second bot to satisfy minimum player count (3)
    const botId2 = 'bot-2';
    const botPlayer2 = {
      id: botId2,
      name: 'Bot 2',
      isHost: false,
      isBot: true,
      botDifficulty: 'easy',
    };

    if (lobbyCallback!) {
      const newState = {
        gameId: 'test-game',
        players: [{ id: 'p1', name: 'Player 1', isHost: true }, botPlayer, botPlayer2],
        bots: {
          [botId]: { id: botId, name: 'Bot 1', difficulty: 'easy' },
          [botId2]: { id: botId2, name: 'Bot 2', difficulty: 'easy' },
        },
        config: { botDifficulty: 'easy' },
      };
      lobbyCallback(newState);
    }

    // 3. Change bot difficulty for Bot 1
    // There will be multiple comboboxes now. We need to find the one for Bot 1.
    // The Lobby component renders a list. We can find the list item for Bot 1.
    const bot1Element = await screen.findByText('Bot 1');
    const bot1Item = bot1Element.closest('li');
    const difficultySelect = within(bot1Item!).getByRole('combobox');
    fireEvent.change(difficultySelect, { target: { value: 'hard' } });

    expect(mockUpdateBotDifficulty).toHaveBeenCalledWith(expect.anything(), 'bot-1', 'hard');

    // Update state to reflect difficulty change
    if (lobbyCallback!) {
      const newState = {
        gameId: 'test-game',
        players: [
          { id: 'p1', name: 'Player 1', isHost: true },
          { ...botPlayer, botDifficulty: 'hard' },
          botPlayer2,
        ],
        bots: {
          [botId]: { id: botId, name: 'Bot 1', difficulty: 'hard' },
          [botId2]: { id: botId2, name: 'Bot 2', difficulty: 'easy' },
        },
        config: { botDifficulty: 'easy' },
      };
      lobbyCallback(newState);
    }

    // Wait for the UI to update
    await waitFor(() => {
      expect(difficultySelect).toHaveValue('hard');
    });

    // 4. Click Start Game
    fireEvent.click(startButton);

    // 5. Verify start() was called with correct config
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });

    // Check the arguments passed to start()
    const startCallArgs = mockStart.mock.calls[0];
    const playerConfigs = startCallArgs[0]; // The first argument is the player configs array

    console.log('Start configs:', JSON.stringify(playerConfigs));

    // Find the bot config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const botConfig = playerConfigs.find((p: any) => p.id === 'bot-1');

    expect(botConfig).toBeDefined();
    expect(botConfig.botDifficulty).toBe('hard');
  });
});
