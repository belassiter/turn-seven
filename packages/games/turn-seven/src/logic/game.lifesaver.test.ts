import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Seven Life Saver Logic', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['A', 'B']);
    // Clear hands
    state.players.forEach((p) => {
      p.hand = [];
      p.pendingImmediateActionIds = [];
      p.reservedActions = [];
      p.hasLifeSaver = false;
      p.hasBusted = false;
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

  it('prevents bust when hitting a duplicate number', () => {
    const player = state.players[0];
    state.currentPlayerId = player.id;

    // Give player a 5 and a Life Saver
    const five = createCard('5', 'number', 'c1');
    const lifeSaver = createCard('LifeSaver', 'action', 'ls1');
    player.hand = [five, lifeSaver];
    player.hasLifeSaver = true;

    // Deck has another 5
    const duplicateFive = createCard('5', 'number', 'c2');
    state.deck = [duplicateFive];

    // Perform HIT
    state = logic.performAction(state, { type: 'HIT' });

    // Should not bust
    expect(state.players[0].hasBusted).toBe(false);
    // Should have lost Life Saver
    expect(state.players[0].hasLifeSaver).toBe(false);
    // Hand should still have the original 5, but not the duplicate, and not the Life Saver
    expect(state.players[0].hand).toHaveLength(1);
    expect(state.players[0].hand[0].rank).toBe('5');
    expect(state.players[0].hand[0].id).toBe('c1');
  });

  it('prevents bust during Turn Three resolution', () => {
    const actor = state.players[0];
    const target = state.players[1];
    state.currentPlayerId = actor.id;

    // Actor plays Turn Three on Target
    const turnThree = createCard('TurnThree', 'action', 't3');
    actor.reservedActions = [turnThree];
    actor.hand = [turnThree];

    // Target has a 5 and Life Saver
    const five = createCard('5', 'number', 'c1');
    const lifeSaver = createCard('LifeSaver', 'action', 'ls1');
    target.hand = [five, lifeSaver];
    target.hasLifeSaver = true;

    // Deck has duplicate 5 (top of stack/pop order: 5, 6, 7)
    // We push 7, 6, 5
    state.deck = [
      createCard('7', 'number', 'c4'),
      createCard('6', 'number', 'c3'),
      createCard('5', 'number', 'c2'),
    ];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: actor.id, cardId: turnThree.id, targetId: target.id },
    });

    const updatedTarget = state.players[1];

    // Target should not bust
    expect(updatedTarget.hasBusted).toBe(false);
    // Should have lost Life Saver
    expect(updatedTarget.hasLifeSaver).toBe(false);
    // Hand should have original 5, 6, 7. Duplicate 5 discarded. Life Saver discarded.
    // And the Turn Three card itself is added to hand (Case 12).
    const ranks = updatedTarget.hand.map((c) => c.rank).sort();
    expect(ranks).toContain('5');
    expect(ranks).toContain('6');
    expect(ranks).toContain('7');
    expect(ranks).toContain('TurnThree');
    expect(ranks).not.toContain('LifeSaver');
  });

  it('Turn Three: Have LS, Draw LS, Draw Duplicate -> Should use Active LS, Pending LS remains', () => {
    const actor = state.players[0];
    const target = state.players[1];
    state.currentPlayerId = actor.id;

    // Actor plays Turn Three on Target
    const turnThree = createCard('TurnThree', 'action', 't3');
    actor.reservedActions = [turnThree];
    actor.hand = [turnThree];

    // Target has a 5 and Life Saver 1
    const five = createCard('5', 'number', 'c1');
    const ls1 = createCard('LifeSaver', 'action', 'ls1');
    target.hand = [five, ls1];
    target.hasLifeSaver = true;

    // Deck: [5 (Dup), LifeSaver 2] (Pop order: LS2, 5)
    // We push 5, LS2
    const ls2 = createCard('LifeSaver', 'action', 'ls2');
    const dupFive = createCard('5', 'number', 'c2');
    state.deck = [dupFive, ls2];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: actor.id, cardId: turnThree.id, targetId: target.id },
    });

    const updatedTarget = state.players[1];

    // Target should not bust
    expect(updatedTarget.hasBusted).toBe(false);

    // LS1 used on duplicate 5.
    // LS2 was drawn first. Since target had LS1, LS2 became pending.
    // Then LS1 used.
    // Target should have LS2 in hand.
    // Target should NOT have LS1.
    // Target should NOT have duplicate 5.

    const ranks = updatedTarget.hand.map((c) => c.rank);
    expect(ranks).toContain('LifeSaver'); // LS2
    expect(ranks).toContain('5'); // Original 5
    expect(ranks.filter((r) => r === '5').length).toBe(1);

    // Crucially: Is LS2 active or pending?
    // New logic: LS2 becomes active immediately!
    expect(updatedTarget.hasLifeSaver).toBe(true);
    expect(updatedTarget.pendingImmediateActionIds).not.toContain(ls2.id);
  });

  it('Turn Three: Have LS, Draw LS, Draw Duplicate, Draw Duplicate -> Should NOT Bust (Second LS activates)', () => {
    const actor = state.players[0];
    const target = state.players[1];
    state.currentPlayerId = actor.id;

    // Actor plays Turn Three on Target
    const turnThree = createCard('TurnThree', 'action', 't3');
    actor.reservedActions = [turnThree];
    actor.hand = [turnThree];

    // Target has a 5 and Life Saver 1
    const five = createCard('5', 'number', 'c1');
    const ls1 = createCard('LifeSaver', 'action', 'ls1');
    target.hand = [five, ls1];
    target.hasLifeSaver = true;

    // Deck: [5 (Dup 1), LifeSaver 2, 5 (Dup 2)] (Pop order: 5(Dup2), LS2, 5(Dup1))
    // Wait, pop order is reverse of push.
    // We want draw order: LS2, 5(Dup1), 5(Dup2).
    // So stack: 5(Dup2), 5(Dup1), LS2.
    const ls2 = createCard('LifeSaver', 'action', 'ls2');
    const dupFive1 = createCard('5', 'number', 'c2');
    const dupFive2 = createCard('5', 'number', 'c3');
    state.deck = [dupFive2, dupFive1, ls2];

    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: actor.id, cardId: turnThree.id, targetId: target.id },
    });

    const updatedTarget = state.players[1];

    // Target should not bust
    expect(updatedTarget.hasBusted).toBe(false);

    // LS1 used on Dup1.
    // LS2 activated and used on Dup2.
    // Target should have NO Life Savers.
    // Target should have original 5.

    const ranks = updatedTarget.hand.map((c) => c.rank);
    expect(ranks).not.toContain('LifeSaver');
    expect(ranks).toContain('5');
    expect(ranks.filter((r) => r === '5').length).toBe(1);
    expect(updatedTarget.hasLifeSaver).toBe(false);
  });
});
