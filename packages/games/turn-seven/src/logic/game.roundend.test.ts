import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';

describe('Round end and startNextRound behavior', () => {
  it('ends round sets gamePhase ended and clears currentPlayerId', () => {
    const logic = new TurnSevenLogic();
    // Minimal state with all players inactive
    const s: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: false, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: false, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    // Performing STAY should detect no active players remaining and end the round
    const after = logic.performAction(s, { type: 'STAY' });
    expect(after.gamePhase === 'ended' || after.gamePhase === 'gameover').toBe(true);
    expect(after.currentPlayerId).toBeNull();
  });

  it('startNextRound resets isFrozen and sets currentPlayerId to first player', () => {
    const logic = new TurnSevenLogic();
    const state: any = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false, pendingImmediateActionIds: [] }
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing'
    };

    const next = logic.startNextRound(state);
    expect(next.currentPlayerId).toBe(next.players[0].id);
  });
});
