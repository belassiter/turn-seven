import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Pending immediate actions block HIT/STAY', () => {
  it('HIT is a no-op when pendingImmediateActionIds present', () => {
    const logic = new TurnSevenLogic();
    const state = logic.createInitialState(['p1', 'p2', 'p3']);
    const s: GameState = structuredClone(state);
    // give current player a pending action
    const cp = s.players.find(p => p.id === s.currentPlayerId)!;
    cp.pendingImmediateActionIds = ['a1'];

    const after = logic.performAction(s, { type: 'HIT' });
    // state should be unchanged for the player hand length
    const beforeHandLen = s.players.find(p => p.id === s.currentPlayerId)!.hand.length;
    const afterHandLen = after.players.find(p => p.id === s.currentPlayerId)!.hand.length;
    expect(afterHandLen).toBe(beforeHandLen);
  });

  it('STAY is a no-op when pendingImmediateActionIds present', () => {
    const logic = new TurnSevenLogic();
    const state = logic.createInitialState(['p1', 'p2', 'p3']);
    const s: GameState = structuredClone(state);
    const cp = s.players.find(p => p.id === s.currentPlayerId)!;
    cp.pendingImmediateActionIds = ['a1'];

    const after = logic.performAction(s, { type: 'STAY' });
    // hasStayed should remain false
    const stayed = after.players.find(p => p.id === s.currentPlayerId)!.hasStayed;
    expect(stayed).toBe(false);
  });
});
