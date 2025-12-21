import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('TurnSevenLogic - Turn Three Permutations', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);
    // Clear hands and pending states for easier testing
    state.players.forEach((p) => {
      p.hand = [];
      p.pendingImmediateActionIds = [];
      p.reservedActions = [];
      p.hasLifeSaver = false;
      p.hasBusted = false;
      p.isLocked = false;
      p.hasStayed = false;
    });
    state.deck = [];
    state.discardPile = [];
    // Force current player to be the first player (Alice) to avoid flakiness from random initial deal
    state.currentPlayerId = state.players[0].id;
  });

  const createCard = (
    rank: string,
    suit: 'number' | 'action' | 'modifier' = 'number'
  ): CardModel => ({
    id: `test-${rank}-${Math.random()}`,
    rank,
    suit,
    isFaceUp: false,
  });

  it('handles chained Turn 3s (Turn 3 -> draws Turn 3 -> draws Turn 3)', () => {
    // Setup: Alice plays Turn 3 on Bob.
    // Deck (top to bottom): TurnThree, TurnThree, 5, 6, 7...
    // Bob draws TurnThree (set aside), TurnThree (set aside), 5.
    // Bob resolves first TurnThree -> draws X, Y, Z.
    // Bob resolves second TurnThree -> draws A, B, C.

    const t3_1 = createCard('TurnThree', 'action');
    const t3_2 = createCard('TurnThree', 'action');
    const t3_3 = createCard('TurnThree', 'action');
    const num5 = createCard('5');
    const num6 = createCard('6');
    const num7 = createCard('7');

    // Alice has T3_1
    state.players[0].reservedActions = [t3_1];
    state.players[0].hand = [t3_1];

    // Deck: 5, T3_3, T3_2 (drawn in reverse order)
    state.deck = [num5, t3_3, t3_2];

    // Alice plays T3_1 on Bob
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3_1.id, targetId: state.players[1].id },
    });

    // Bob should have drawn T3_2 -> Interrupt
    const bob = state.players[1];
    expect(bob.hand).toHaveLength(1); // T3_2 (drawn)
    expect(bob.pendingImmediateActionIds).toHaveLength(2); // T3_2, T3_1#resume:2
    expect(state.currentPlayerId).toBe(bob.id);

    // Bob resolves T3_2 on Charlie
    // Deck needs more cards
    state.deck = [num6, num7, createCard('8')];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: {
        actorId: bob.id,
        cardId: bob.pendingImmediateActionIds![0],
        targetId: state.players[2].id,
      },
    });

    // Charlie draws 3 cards.
    // Bob still has one pending action (T3_1#resume:2).
    const bobAfter = state.players[1];
    expect(state.currentPlayerId).toBe(bobAfter.id);
    expect(bobAfter.pendingImmediateActionIds).toHaveLength(1);
    expect(bobAfter.pendingImmediateActionIds![0]).toMatch(/#resume:2$/);
  });

  it('handles Turn 3 drawing Lock', () => {
    const t3 = createCard('TurnThree', 'action');
    const lock = createCard('Lock', 'action');
    const num5 = createCard('5');
    const num6 = createCard('6');

    state.players[0].reservedActions = [t3];
    state.players[0].hand = [t3];

    // Deck: 6, 5, Lock
    state.deck = [num6, num5, lock];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3.id, targetId: state.players[1].id },
    });

    const bob = state.players[1];
    // Bob draws Lock -> Interrupt
    expect(bob.pendingImmediateActionIds).toHaveLength(2); // Lock, T3#resume:2
    expect(bob.pendingImmediateActionIds![0]).toBe(lock.id);
    expect(state.currentPlayerId).toBe(bob.id);

    // Bob resolves Lock on Charlie
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: lock.id, targetId: state.players[2].id },
    });

    // Bob resumes
    const resumeId = state.players[1].pendingImmediateActionIds![0];
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: resumeId, targetId: bob.id },
    });

    // Bob draws 5, 6.
    expect(state.players[1].hand.map((c) => c.rank)).toContain('5');
    expect(state.players[1].hand.map((c) => c.rank)).toContain('6');
  });

  it('handles Turn 3 drawing Life Saver (target has none)', () => {
    const t3 = createCard('TurnThree', 'action');
    const ls = createCard('LifeSaver', 'action');
    const num5 = createCard('5');
    const num6 = createCard('6');

    state.players[0].reservedActions = [t3];
    state.players[0].hand = [t3];
    state.players[0].pendingImmediateActionIds = []; // Ensure no other pending actions

    state.deck = [num6, num5, ls];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3.id, targetId: state.players[1].id },
    });

    const bob = state.players[1];
    // Bob draws LS. Has none, so keeps it.
    // Draws 5, 6.
    // No pending actions because LS was auto-kept.
    expect(bob.hasLifeSaver).toBe(true);
    expect(bob.pendingImmediateActionIds).toHaveLength(0);
    // Turn should advance to next player (Bob or Charlie depending on turn order logic)
    // Since Alice played action, turn usually ends.
    // But Bob had no pending actions generated.
    expect(state.currentPlayerId).not.toBe(state.players[0].id);
  });

  it('handles Turn 3 drawing Life Saver (target has one)', () => {
    const t3 = createCard('TurnThree', 'action');
    const ls = createCard('LifeSaver', 'action');
    const num5 = createCard('5');
    const num6 = createCard('6');

    state.players[0].reservedActions = [t3];
    state.players[0].hand = [t3];
    state.players[1].hasLifeSaver = true;

    state.deck = [num6, num5, ls];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3.id, targetId: state.players[1].id },
    });

    const bob = state.players[1];
    // Bob draws LS. Has one, so must give it away.
    // LS becomes pending action.
    expect(bob.pendingImmediateActionIds).toHaveLength(2); // LS, T3#resume:2
    expect(bob.pendingImmediateActionIds![0]).toBe(ls.id);
    expect(state.currentPlayerId).toBe(bob.id);

    // Bob gives LS to Charlie
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: ls.id, targetId: state.players[2].id },
    });

    // Bob resumes
    const resumeId = state.players[1].pendingImmediateActionIds![0];
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: resumeId, targetId: bob.id },
    });

    // Bob draws 5, 6.
    expect(state.players[1].hand.map((c) => c.rank)).toContain('5');
    expect(state.players[1].hand.map((c) => c.rank)).toContain('6');
  });

  it('handles busting during Turn 3 resolution', () => {
    const t3 = createCard('TurnThree', 'action');
    const num5 = createCard('5');
    const num5dup = createCard('5');

    state.players[0].reservedActions = [t3];
    state.players[0].hand = [t3];
    state.players[1].hand = [num5]; // Bob has a 5

    state.deck = [createCard('6'), num5dup]; // Bob will draw 5 (dup) then 6

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3.id, targetId: state.players[1].id },
    });

    const bob = state.players[1];
    expect(bob.hasBusted).toBe(true);
    // Should discard T3 and drawn cards (actions/T3). Number cards stay in hand (face down).
    expect(state.discardPile).toContainEqual(expect.objectContaining({ rank: 'TurnThree' }));
    // 5 is in hand, not discard
    expect(bob.hand).toContainEqual(expect.objectContaining({ rank: '5' }));
  });

  it('handles busting with pending actions (Turn 3 -> draws Lock -> Busts)', () => {
    const t3 = createCard('TurnThree', 'action');
    const lock = createCard('Lock', 'action');
    const num5 = createCard('5');
    const num5dup = createCard('5');

    state.players[0].reservedActions = [t3];
    state.players[0].hand = [t3];
    state.players[1].hand = [num5];

    // Deck: 5 (dup), Lock
    state.deck = [num5dup, lock]; // Draws Lock, then 5 (dup)

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: state.players[0].id, cardId: t3.id, targetId: state.players[1].id },
    });

    // Bob draws Lock -> Interrupt
    const bob = state.players[1];
    expect(bob.pendingImmediateActionIds).toHaveLength(2); // Lock, T3#resume:2
    expect(bob.pendingImmediateActionIds![0]).toBe(lock.id);

    // Bob resolves Lock (e.g. on Charlie)
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: lock.id, targetId: state.players[2].id },
    });

    // Bob resumes
    const resumeId = state.players[1].pendingImmediateActionIds![0];
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: bob.id, cardId: resumeId, targetId: bob.id },
    });

    // Bob draws 5(dup) -> Bust
    expect(state.players[1].hasBusted).toBe(true);
    expect(state.players[1].pendingImmediateActionIds).toHaveLength(0);

    // TurnThree (resume) should be discarded
    expect(state.discardPile).toContainEqual(expect.objectContaining({ rank: 'TurnThree' }));
  });
});
