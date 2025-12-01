import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Turn advancement', () => {
  const logic = new TurnSevenLogic();

  it('advances to next active player after HIT (wraps)', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p3',
      deck: [{ id: 'd1', suit: 'modifier', rank: '+2', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing',
    } as any;

    const after = logic.performAction(state, { type: 'HIT' });
    // starting at p3, next active should wrap to p1
    expect(after.currentPlayerId).toBe('p1');
  });

  it('busts player on duplicate and removes them from rotation', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true } as any], hasStayed: false, isActive: true, hasBusted: false },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'c2', suit: 'number', rank: '5', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing',
    } as any;

    const after = logic.performAction(state, { type: 'HIT' });
    const p1 = after.players.find(p => p.id === 'p1')!;
    expect(p1.hasBusted).toBe(true);
    expect(p1.isActive).toBe(false);
    // next active should be p2
    expect(after.currentPlayerId).toBe('p2');
  });

  it('ends round when no active players remain (Next Round condition)', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: true, isActive: false, hasBusted: false, roundScore: 0, totalScore: 0 } as any,
        { id: 'p2', name: 'P2', hand: [], hasStayed: true, isActive: false, hasBusted: false, roundScore: 0, totalScore: 0 } as any,
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing',
    } as any;

    const after = logic.performAction(state, { type: 'STAY' });
    expect(after.gamePhase).toBe('ended');
  });
});
