import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic, GameState, CardModel } from '@turn-seven/engine';

describe('Life Saver Choice Logic', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  const createCard = (rank: string, suit: string, id: string): CardModel => ({
    id,
    rank,
    suit,
    isFaceUp: true,
  });

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialState(['playerA', 'playerB', 'playerC']);
    // Clear deck for deterministic testing
    state.deck = [];
  });

  it('should allow player to choose target for Life Saver overflow', () => {
    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];

    state.currentPlayerId = playerA.id;

    // A has a Life Saver
    playerA.hasLifeSaver = true;
    // B has a Life Saver
    playerB.hasLifeSaver = true;
    // C does NOT have a Life Saver
    playerC.hasLifeSaver = false;

    // A draws a second Life Saver (e.g. via Turn Three interruption or just dealing)
    // We simulate the state where A has the card pending.
    const ls2 = createCard('LifeSaver', 'action', 'ls-2');
    playerA.reservedActions = [ls2];
    playerA.pendingImmediateActionIds = [ls2.id];

    // A chooses to give it to B (who already has one)
    // This should result in the card being discarded/wasted, and NOT passed to C.
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: ls2.id, targetId: playerB.id },
    });

    // B should still have a Life Saver (unchanged)
    expect(state.players[1].hasLifeSaver).toBe(true);
    // C should NOT have received it (because we didn't target C, and auto-pass is disabled)
    expect(state.players[2].hasLifeSaver).toBe(false);

    // The card should be in discard pile
    expect(state.discardPile).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ls2.id })])
    );
  });

  it('should successfully give Life Saver to chosen target if they do not have one', () => {
    const playerA = state.players[0];
    const playerC = state.players[2];

    state.currentPlayerId = playerA.id;
    playerA.hasLifeSaver = true;
    playerC.hasLifeSaver = false;

    const ls2 = createCard('LifeSaver', 'action', 'ls-2');
    playerA.reservedActions = [ls2];
    playerA.pendingImmediateActionIds = [ls2.id];

    // A chooses C
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: ls2.id, targetId: playerC.id },
    });

    expect(state.players[2].hasLifeSaver).toBe(true);
  });
});
