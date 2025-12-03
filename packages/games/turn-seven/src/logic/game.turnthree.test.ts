import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

describe('Turn Three Edge Cases', () => {
  const logic = new TurnSevenLogic();

  it('Turn Three draws a Freeze card: added to reserved, not resolved immediately', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is Freeze, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as any,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as any,
        { id: 'a2', suit: 'action', rank: 'Freeze', isFaceUp: false } as any,
      ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find((p: any) => p.id === 'p2')!;

    // P2 should have 4 cards: TurnThree (played on them), Freeze, 5, 6
    expect(p2.hand).toHaveLength(4);
    
    // Freeze should be in reservedActions
    expect(p2.reservedActions).toHaveLength(1);
    expect(p2.reservedActions![0].rank).toBe('Freeze');

    // P2 should NOT be stayed (Freeze was not resolved)
    expect(p2.hasStayed).toBe(false);
    expect(p2.isActive).toBe(true);
  });

  it('Turn Three draws another Turn Three card: added to reserved, not resolved immediately', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is TurnThree, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as any,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as any,
        { id: 'a2', suit: 'action', rank: 'TurnThree', isFaceUp: false } as any,
      ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find((p: any) => p.id === 'p2')!;

    // P2 should have 4 cards: TurnThree (played on them), TurnThree (drawn), 5, 6
    expect(p2.hand).toHaveLength(4);
    
    // Drawn TurnThree should be in reservedActions
    expect(p2.reservedActions).toHaveLength(1);
    expect(p2.reservedActions![0].rank).toBe('TurnThree');

    // P2 should NOT have drawn 3 more cards recursively (deck should still have items if we put more, but here we just check hand size)
    // If it resolved recursively, P2 would have drawn more or tried to.
    // But here we just check that it was stored.
  });

  it('Turn Three draws Second Chance: equipped immediately', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, hasSecondChance: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is SecondChance, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as any,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as any,
        { id: 'a2', suit: 'action', rank: 'SecondChance', isFaceUp: false } as any,
      ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find((p: any) => p.id === 'p2')!;

    // P2 should have Second Chance
    expect(p2.hasSecondChance).toBe(true);
    // Hand should contain the Second Chance card
    expect(p2.hand.some((c: any) => c.rank === 'SecondChance')).toBe(true);
  });

  it('Turn Three draws Second Chance then Duplicate: saves from bust', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [{ id: 'n0', suit: 'number', rank: '5', isFaceUp: true } as any], hasStayed: false, isActive: true, hasBusted: false, hasSecondChance: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is SecondChance, then Duplicate 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as any,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as any,
        { id: 'a2', suit: 'action', rank: 'SecondChance', isFaceUp: false } as any,
      ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find((p: any) => p.id === 'p2')!;

    // P2 should NOT have busted
    expect(p2.hasBusted).toBe(false);
    // Second Chance should be consumed
    expect(p2.hasSecondChance).toBe(false);
    // Hand should NOT contain Second Chance card (consumed)
    expect(p2.hand.some((c: any) => c.rank === 'SecondChance')).toBe(false);
    // Hand should NOT contain the duplicate 5 (discarded)
    // Hand should contain: Original 5, TurnThree (played on them), 6
    // The duplicate 5 was drawn and discarded.
    expect(p2.hand.filter((c: any) => c.rank === '5')).toHaveLength(1); // Only the original
    expect(p2.hand.some((c: any) => c.rank === '6')).toBe(true);
  });
});
