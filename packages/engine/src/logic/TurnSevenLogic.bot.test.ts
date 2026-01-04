import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './TurnSevenLogic';
import { GameState } from '../state/gameState';

describe('TurnSevenLogic - Bot Conversion', () => {
  const logic = new TurnSevenLogic();

  const createTestState = (): GameState => {
    return {
      players: [
        {
          id: 'p1',
          name: 'Player 1',
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
          name: 'Player 2',
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
  };

  it('should convert a human player to a bot', () => {
    const state = createTestState();
    const newState = logic.performAction(state, {
      type: 'CONVERT_TO_BOT',
      payload: { playerId: 'p1' },
    });

    const player = newState.players.find((p) => p.id === 'p1');
    expect(player?.isBot).toBe(true);
    expect(player?.botDifficulty).toBe('medium');
    expect(player?.name).toBe('Player 1 (Bot)');
  });

  it('should add a ledger entry when converting to bot', () => {
    const state = createTestState();
    const newState = logic.performAction(state, {
      type: 'CONVERT_TO_BOT',
      payload: { playerId: 'p1' },
    });

    const entry = newState.ledger?.find(
      (e) => e.action === 'System' && e.result === 'Converted to Bot'
    );
    expect(entry).toBeDefined();
    expect(entry?.playerName).toBe('Player 1 (Bot)');
  });

  it('should not double-append (Bot) to name if already present', () => {
    const state = createTestState();
    state.players[0].name = 'Player 1 (Bot)';

    const newState = logic.performAction(state, {
      type: 'CONVERT_TO_BOT',
      payload: { playerId: 'p1' },
    });

    const player = newState.players.find((p) => p.id === 'p1');
    expect(player?.name).toBe('Player 1 (Bot)');
  });

  it('should do nothing if player not found', () => {
    const state = createTestState();
    const newState = logic.performAction(state, {
      type: 'CONVERT_TO_BOT',
      payload: { playerId: 'non-existent' },
    });

    expect(newState).toEqual(state);
  });
});
