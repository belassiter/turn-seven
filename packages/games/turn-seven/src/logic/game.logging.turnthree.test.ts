import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Three Logging', () => {
  const logic = new TurnSevenLogic();

  it('logs Turn Three initiation', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n1', suit: 'number', rank: '1', isFaceUp: false } as CardModel,
        { id: 'n2', suit: 'number', rank: '2', isFaceUp: false } as CardModel,
        { id: 'n3', suit: 'number', rank: '3', isFaceUp: false } as CardModel,
      ],
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const next = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    expect(next.previousTurnLog).toBe('P1 played Turn Three on P2.');
  });

  it('logs Turn Three resulting in a bust', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [{ id: 'n5', suit: 'number', rank: '5', isFaceUp: true } as CardModel],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n1', suit: 'number', rank: '1', isFaceUp: false } as CardModel,
        { id: 'n5_dup', suit: 'number', rank: '5', isFaceUp: false } as CardModel, // Will cause bust
        { id: 'n3', suit: 'number', rank: '3', isFaceUp: false } as CardModel,
      ].reverse(), // Pop from end
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const next = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    // Currently expected behavior (based on code analysis):
    expect(next.previousTurnLog).toBe('P1 played Turn Three on P2. P2 Busted!');
    // Desired behavior: "P1 played Turn Three on P2. P2 Busted!"
  });

  it('logs chained action execution', () => {
    // P1 plays Turn Three on P2. P2 reveals Lock. P2 plays Lock on P1.
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n1', suit: 'number', rank: '1', isFaceUp: false } as CardModel,
        { id: 'a2', suit: 'action', rank: 'Lock', isFaceUp: false } as CardModel,
        { id: 'n3', suit: 'number', rank: '3', isFaceUp: false } as CardModel,
      ].reverse(),
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    // 1. P1 plays Turn Three
    let next = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    expect(next.previousTurnLog).toBe('P1 played Turn Three on P2.');

    // P2 should have pending Lock
    const lockId = next.players[1].pendingImmediateActionIds![0];

    // 2. P2 plays Lock on P1
    next = logic.performAction(next, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p2', cardId: lockId, targetId: 'p1' },
    });
    expect(next.previousTurnLog).toBe('P2 played Lock on P1.');
  });

  it('logs Turn Three resulting in Turn 7', () => {
    const state: GameState = {
      players: [
        {
          id: 'p1',
          name: 'P1',
          hand: [],
          isActive: true,
          reservedActions: [
            { id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true } as CardModel,
          ],
          pendingImmediateActionIds: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
        {
          id: 'p2',
          name: 'P2',
          hand: [
            { id: 'n1', suit: 'number', rank: '1', isFaceUp: true } as CardModel,
            { id: 'n2', suit: 'number', rank: '2', isFaceUp: true } as CardModel,
            { id: 'n3', suit: 'number', rank: '3', isFaceUp: true } as CardModel,
            { id: 'n4', suit: 'number', rank: '4', isFaceUp: true } as CardModel,
          ],
          isActive: true,
          pendingImmediateActionIds: [],
          reservedActions: [],
          hasStayed: false,
          hasBusted: false,
          hasLifeSaver: false,
          roundScore: 0,
          totalScore: 0,
        },
      ],
      currentPlayerId: 'p1',
      deck: [
        { id: 'n5', suit: 'number', rank: '5', isFaceUp: false } as CardModel,
        { id: 'n6', suit: 'number', rank: '6', isFaceUp: false } as CardModel,
        { id: 'n7', suit: 'number', rank: '7', isFaceUp: false } as CardModel,
      ].reverse(),
      discardPile: [],
      gamePhase: 'playing',
      roundNumber: 1,
    } as GameState;

    const next = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' },
    });
    expect(next.previousTurnLog).toBe('P1 played Turn Three on P2. P2 Turn 7!');
  });
});
