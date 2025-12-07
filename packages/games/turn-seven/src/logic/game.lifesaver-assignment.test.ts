import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Seven Life Saver Assignment Logic', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['Player 1', 'Player 2']);
    // Clear hands
    state.players.forEach((p) => {
      p.hand = [];
      p.pendingImmediateActionIds = [];
      p.reservedActions = [];
      p.hasLifeSaver = false;
      p.hasBusted = false;
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

  it('prevents a player from assigning a second Life Saver to themselves', () => {
    const player1 = state.players[0];
    state.currentPlayerId = player1.id;

    // Player 1 already has a Life Saver
    player1.hasLifeSaver = true;

    // Player 1 draws another Life Saver
    const ls2 = createCard('LifeSaver', 'action', 'ls2');
    state.deck = [ls2];

    // Perform HIT to draw the Life Saver
    state = logic.performAction(state, { type: 'HIT' });

    const updatedPlayer1 = state.players[0];

    // Verify the card is pending
    expect(updatedPlayer1.pendingImmediateActionIds).toContain('ls2');
    expect(updatedPlayer1.reservedActions?.map((c) => c.id)).toContain('ls2');

    // Attempt to assign to self
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: {
        actorId: player1.id,
        cardId: 'ls2',
        targetId: player1.id, // Self-target
      },
    });

    // Expectation: Action should be rejected.
    // The card should still be pending.
    const finalPlayer1 = state.players[0];
    expect(finalPlayer1.pendingImmediateActionIds).toContain('ls2');

    // If the action succeeded, the card would be gone from pending/reserved.
    // If it failed, it should still be there.
  });
});
