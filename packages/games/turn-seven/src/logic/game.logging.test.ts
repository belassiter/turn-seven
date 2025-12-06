import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Game Logging', () => {
  const logic = new TurnSevenLogic();

  it('logs when a player draws and keeps a Life Saver', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          hasLifeSaver: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'sc', suit: 'action', rank: 'LifeSaver', isFaceUp: false } as CardModel],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.performAction(state, { type: 'HIT' });
    expect(next.previousTurnLog).toBe('P1 hit: drew Life Saver.');
  });

  it('logs when a player hits and busts', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true } as CardModel],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'c2', suit: 'number', rank: '5', isFaceUp: false } as CardModel],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.performAction(state, { type: 'HIT' });
    expect(next.previousTurnLog).toBe('P1 hit: drew 5. Busted!');
  });

  it('logs when a player stays', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.performAction(state, { type: 'STAY' });
    expect(next.previousTurnLog).toBe('P1 stayed.');
  });

  it('logs when a player plays an action (Lock)', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'Lock', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    expect(next.previousTurnLog).toBe('P1 played Lock on P2.');
  });
});
