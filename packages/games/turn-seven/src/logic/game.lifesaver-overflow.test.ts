import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Seven Edge Cases - Life Saver Overflow', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['A', 'B', 'C']);
    // Clear hands for easier setup
    state.players.forEach((p) => {
      p.hand = [];
      p.pendingImmediateActionIds = [];
      p.reservedActions = [];
      p.hasLifeSaver = false;
      p.isActive = true;
    });
    state.deck = [];
    state.discardPile = [];
  });

  const createCard = (
    rank: string,
    suit: 'number' | 'action' | 'modifier' = 'number',
    id: string
  ): CardModel => ({
    id,
    rank,
    suit,
    isFaceUp: true,
  });

  it('should auto-discard Life Saver if drawn during Turn Three on self and no other targets exist', () => {
    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];

    // Setup: A is active, B and C are busted/inactive
    playerB.isActive = false;
    playerB.hasBusted = true;
    playerC.isActive = false;
    playerC.hasBusted = true;

    // A has a Life Saver already
    playerA.hasLifeSaver = true;
    playerA.hand = [createCard('LifeSaver', 'action', 'ls-1')];

    // A plays Turn Three on self
    const turnThree = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree];
    playerA.hand.push(turnThree);

    // Deck has another Life Saver
    const newLifeSaver = createCard('LifeSaver', 'action', 'ls-2');
    state.deck = [newLifeSaver];

    state.currentPlayerId = playerA.id;

    // Perform Action: Play Turn Three on self
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerA.id },
    });

    // The bug is that it interrupts and waits for user input, but there are no valid targets.
    // We want it to auto-discard and NOT interrupt.

    // If it worked correctly:
    // 1. Life Saver drawn.
    // 2. Checked for targets -> None.
    // 3. Discarded.
    // 4. Turn Three continues (finishes).
    // 5. No pending actions.

    // If it fails (current bug):
    // 1. Life Saver drawn.
    // 2. Interrupts.
    // 3. Pending action exists.

    expect(state.players[0].pendingImmediateActionIds).toHaveLength(0);
    expect(state.discardPile).toContainEqual(expect.objectContaining({ id: newLifeSaver.id }));
  });
});
