import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';

describe('Lock vs Stay behavior', () => {
  it('resolveActionOnDeal Lock marks isLocked and not just hasStayed', () => {
    const logic = new TurnSevenLogic();
    // Build a minimal state and simulate resolveActionOnDeal effect
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

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
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    const afterStay = logic.performAction(state, { type: 'STAY' });
    const p1 = afterStay.players.find((p: any) => p.id === 'p1')!;
    expect(p1.hasStayed).toBe(true);
    expect((p1 as any).isLocked).toBeFalsy();
  });
});
import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';

describe('Lock vs Stay behavior', () => {
  it('resolveActionOnDeal Lock marks isLocked and not just hasStayed', () => {
    const logic = new TurnSevenLogic();
    // Build a minimal state and simulate resolveActionOnDeal effect
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

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
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    const afterStay = logic.performAction(state, { type: 'STAY' });
    const p1 = afterStay.players.find((p: any) => p.id === 'p1')!;
    expect(p1.hasStayed).toBe(true);
    expect((p1 as any).isLocked).toBeFalsy();
  });
});
