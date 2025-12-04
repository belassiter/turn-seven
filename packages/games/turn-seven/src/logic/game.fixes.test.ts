import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Game Logic Fixes', () => {
  const logic = new TurnSevenLogic();

  it('Second Chance: if player has none, they keep it and turn ends automatically', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, hasLifeSaver: false },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'sc1', suit: 'action', rank: 'LifeSaver', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    // P1 Hits and draws Second Chance
    const after = logic.performAction(state, { type: 'HIT' });
    
    const p1 = after.players.find(p => p.id === 'p1')!;
    
    // Should have Life Saver
    expect(p1.hasLifeSaver).toBe(true);
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('LifeSaver');
    
    // Should NOT have pending actions
    expect(p1.pendingImmediateActionIds).toBeUndefined(); // or empty
    
    // Turn should advance to P2
    expect(after.currentPlayerId).toBe('p2');
  });

  it('Second Chance: if player has one, it becomes pending', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [{ id: 'sc1', suit: 'action', rank: 'LifeSaver' }], hasStayed: false, isActive: true, hasBusted: false, hasLifeSaver: true },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'sc2', suit: 'action', rank: 'LifeSaver', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'HIT' });
    const p1 = after.players.find(p => p.id === 'p1')!;
    
    // Should have pending action
    expect(p1.pendingImmediateActionIds).toHaveLength(1);
    // Turn stays with P1 until resolved
    expect(after.currentPlayerId).toBe('p1');
  });

  it('Turn Three: if target busts, game continues to next player', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 't3', suit: 'action', rank: 'TurnThree' }] as any },
        { id: 'p2', name: 'P2', hand: [{ id: 'c1', suit: 'number', rank: '5' }], hasStayed: false, isActive: true, hasBusted: false },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck will cause P2 to bust (draws a 5)
      deck: [{ id: 'c2', suit: 'number', rank: '5' } as any, { id: 'x', suit: 'number', rank: '1' } as any, { id: 'y', suit: 'number', rank: '2' } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    // P1 plays Turn Three on P2
    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 't3', targetId: 'p2' } });
    
    const p2 = after.players.find(p => p.id === 'p2')!;
    expect(p2.hasBusted).toBe(true);
    
    // Turn should advance to P2 (who is busted, so skips to P3) or just P2?
    // Wait, P1 played the action. P1's turn ends.
    // Next player is P2. P2 is busted. Next is P3.
    expect(after.currentPlayerId).toBe('p3');
  });

  it('Play Order: Playing an action card ends the turn', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'f1', suit: 'action', rank: 'Lock' }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after3 = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'f1', targetId: 'p2' } });
    
    expect(after3.players[1].hasStayed).toBe(true);
    // P1 turn ends. P2 is inactive. Should be P3.
    expect(after3.currentPlayerId).toBe('p3');
  });
});
