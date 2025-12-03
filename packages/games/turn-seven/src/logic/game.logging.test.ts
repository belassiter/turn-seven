import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Game Logging', () => {
  const logic = new TurnSevenLogic();

  it('logs when a player draws and keeps a Second Chance', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], isActive: true, hasSecondChance: false },
        { id: 'p2', name: 'P2', hand: [], isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'sc', suit: 'action', rank: 'SecondChance', isFaceUp: false }],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const next = logic.performAction(state, { type: 'HIT' });
    expect(next.previousTurnLog).toBe('P1 hit: drew Second Chance.');
  });

  it('logs when a player hits and busts', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true }], isActive: true },
        { id: 'p2', name: 'P2', hand: [], isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'c2', suit: 'number', rank: '5', isFaceUp: false }],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const next = logic.performAction(state, { type: 'HIT' });
    expect(next.previousTurnLog).toBe('P1 hit: drew 5. Busted!');
  });

  it('logs when a player stays', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], isActive: true },
        { id: 'p2', name: 'P2', hand: [], isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const next = logic.performAction(state, { type: 'STAY' });
    expect(next.previousTurnLog).toBe('P1 stayed.');
  });

  it('logs when a player plays an action (Freeze)', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], isActive: true, reservedActions: [{ id: 'a1', suit: 'action', rank: 'Freeze', isFaceUp: true }] },
        { id: 'p2', name: 'P2', hand: [], isActive: true },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const next = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    expect(next.previousTurnLog).toBe('P1 played Freeze on P2.');
  });
});
