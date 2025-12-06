import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Three Edge Cases', () => {
  const logic = new TurnSevenLogic();

  it('Turn Three draws a Lock card: added to reserved, not resolved immediately', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
        },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is Lock, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'Lock', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    const p2 = after.players.find((p) => p.id === 'p2')!;

    // P2 should have 4 cards: TurnThree (played on them), Lock, 5, 6
    expect(p2.hand).toHaveLength(4);

    // Lock should be in reservedActions
    expect(p2.reservedActions).toHaveLength(1);
    expect(p2.reservedActions![0].rank).toBe('Lock');

    // P2 should NOT be stayed (Lock was not resolved)
    expect(p2.hasStayed).toBe(false);
    expect(p2.isActive).toBe(true);
  });

  it('Turn Three draws another Turn Three card: added to reserved, not resolved immediately', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
        },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is TurnThree, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'TurnThree', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    const p2 = after.players.find((p) => p.id === 'p2')!;

    // P2 should have 4 cards: TurnThree (played on them), TurnThree (drawn), 5, 6
    expect(p2.hand).toHaveLength(4);

    // Drawn TurnThree should be in reservedActions
    expect(p2.reservedActions).toHaveLength(1);
    expect(p2.reservedActions![0].rank).toBe('TurnThree');

    // P2 should NOT have drawn 3 more cards recursively (deck should still have items if we put more, but here we just check hand size)
    // If it resolved recursively, P2 would have drawn more or tried to.
    // But here we just check that it was stored.
  });

  it('Turn Three draws Life Saver: equipped immediately', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is LifeSaver, then Number 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'LifeSaver', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    const p2 = after.players.find((p) => p.id === 'p2')!;

    // P2 should have Life Saver
    expect(p2.hasLifeSaver).toBe(true);
    // Hand should contain the Life Saver card
    expect(p2.hand.some((c: CardModel) => c.rank === 'LifeSaver')).toBe(true);
  });

  it('Turn Three draws Life Saver then Duplicate: saves from bust', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [{ id: 'n0', suit: 'number', rank: '5', isFaceUp: true } as CardModel],
          hasStayed: false,
          isActive: true,
          hasBusted: false,
          hasLifeSaver: false,
        },
      ],
      currentPlayerId: 'p1',
      // Deck: Top is LifeSaver, then Duplicate 5, then Number 6
      deck: [
        { id: 'n2', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n1', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'LifeSaver', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
      ledger: [],
    } as GameState;

    const after = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    const p2 = after.players.find((p) => p.id === 'p2')!;

    // P2 should NOT have busted
    expect(p2.hasBusted).toBe(false);
    // Life Saver should be consumed
    expect(p2.hasLifeSaver).toBe(false);
    // Hand should NOT contain Life Saver card (consumed)
    expect(p2.hand.some((c: CardModel) => c.rank === 'LifeSaver')).toBe(false);
    // Hand should NOT contain the duplicate 5 (discarded)
    // Hand should contain: Original 5, TurnThree (played on them), 6
    // The duplicate 5 was drawn and discarded.
    expect(p2.hand.filter((c: CardModel) => c.rank === '5')).toHaveLength(1); // Only the original
    expect(p2.hand.some((c: CardModel) => c.rank === '6')).toBe(true);
  });
});
