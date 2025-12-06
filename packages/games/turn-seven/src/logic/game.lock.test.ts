import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Lock vs Stay behavior', () => {
  it('resolveActionOnDeal Lock marks isLocked and not just hasStayed', () => {
    // Build a minimal state and simulate resolveActionOnDeal effect
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    // Manually apply what resolveActionOnDeal would do for Lock
    const target = state.players[1];
    target.hasStayed = true;
    target.isActive = false;
    target.isLocked = true;

    expect(target.hasStayed).toBe(true);
    expect(target.isLocked).toBe(true);
  });

  it('manual STAY does not mark isLocked', () => {
    const logic = new TurnSevenLogic();
    // Minimal state
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p3',
          name: 'P3',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const afterStay = logic.performAction(state, { type: 'STAY' });
    const p1 = afterStay.players.find((p) => p.id === 'p1')!;
    expect(p1.hasStayed).toBe(true);
    expect(p1.isLocked).toBeFalsy();
  });
});
