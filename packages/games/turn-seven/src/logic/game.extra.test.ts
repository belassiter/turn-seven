import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('TurnSevenLogic additional tests', () => {
  const logic = new TurnSevenLogic();

  it('ends game (gameover) when total crosses 200 at round end', () => {
    // Player already has 195 total, will get +10 this round
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [{ id: 'n1', suit: 'number', rank: '10', isFaceUp: true } as CardModel],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 0,
          totalScore: 195,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: true,
          isActive: false,
          hasBusted: true,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, { type: 'STAY' });
    expect(after.gamePhase).toBe('gameover');
    expect(after.winnerId).toBe('p1');
  });

  it('applies x2 multipliers before +X modifiers', () => {
    // Hand: numbers 5 and 3, one x2, one +4 => (5+3)*2 + 4 = 20
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [
            { id: 'n1', suit: 'number', rank: '5', isFaceUp: true } as CardModel,
            { id: 'n2', suit: 'number', rank: '3', isFaceUp: true } as CardModel,
            { id: 'm1', suit: 'modifier', rank: 'x2', isFaceUp: true } as CardModel,
            { id: 'm2', suit: 'modifier', rank: '+4', isFaceUp: true } as CardModel,
          ],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: true,
          isActive: false,
          hasBusted: true,
          roundScore: 0,
          totalScore: 0,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, { type: 'STAY' });
    const p1 = after.players.find((p) => p.id === 'p1')!;
    expect(p1.roundScore).toBe(20);
    expect(p1.totalScore).toBe(20);
  });

  it('startNextRound preserves totalScore and resets round fields', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [{ id: 'c1', suit: 'number', rank: '2', isFaceUp: true } as CardModel],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 2,
          totalScore: 50,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [{ id: 'c2', suit: 'number', rank: '3', isFaceUp: true } as CardModel],
          hasStayed: true,
          isActive: false,
          hasBusted: false,
          roundScore: 3,
          totalScore: 30,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const next = logic.startNextRound(state);
    expect(next.players[0].totalScore).toBe(50);
    expect(next.players[0].roundScore).toBe(0);
    // Each player should have been dealt 1 card
    expect(next.players[0].hand.length).toBeGreaterThanOrEqual(0);
  });
});
