import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Seven Edge Cases', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['A', 'B', 'C', 'D']);
    // Clear hands for easier setup
    state.players.forEach((p) => {
      p.hand = [];
      p.pendingImmediateActionIds = [];
      p.reservedActions = [];
    });
    state.deck = []; // Clear deck
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

  it('Case 19: Turn order resumes from original actor after complex chain', () => {
    // Setup: A -> B -> C -> D
    // A plays Turn Three on C.
    // C draws a Lock.
    // C plays Lock on D.
    // Next turn should be B (A's neighbor).

    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];
    const playerD = state.players[3];

    state.currentPlayerId = playerA.id;

    // Give A a Turn Three
    const turnThree = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree];
    playerA.hand = [turnThree];

    // Stack deck for C's draw: [Lock, 5, 6] (popped in reverse order)
    // Deck is a stack, so push 6, then 5, then Lock
    state.deck.push(createCard('6', 'number', 'n-6'));
    state.deck.push(createCard('5', 'number', 'n-5'));
    const lock = createCard('Lock', 'action', 'f-1');
    state.deck.push(lock);

    // A plays Turn Three on C
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerC.id },
    });

    // C should now be the current player (to resolve Lock)
    expect(state.currentPlayerId).toBe(playerC.id);
    expect(state.players[2].pendingImmediateActionIds).toContain(lock.id);

    // Verify turnOrderBaseId is set to A
    expect(state.turnOrderBaseId).toBe(playerA.id);

    // C plays Lock on D
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerC.id, cardId: lock.id, targetId: playerD.id },
    });

    // D should be locked
    expect(state.players[3].hasStayed).toBe(true);

    // Turn should advance to B (A's neighbor), NOT D's neighbor (which would be A) or C's neighbor (D)
    expect(state.currentPlayerId).toBe(playerB.id);

    // turnOrderBaseId should be cleared
    expect(state.turnOrderBaseId).toBeNull();
  });

  it('Case 14: Discard set-aside actions on Bust during Turn Three', () => {
    const playerA = state.players[0];
    const playerB = state.players[1];

    state.currentPlayerId = playerA.id;

    // Give A a Turn Three
    const turnThree = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree];
    playerA.hand = [turnThree];

    // Give B a 5
    playerB.hand = [createCard('5', 'number', 'n-5-orig')];

    // Stack deck: [6, 5 (duplicate), Lock]
    // Pop order: Lock, 5 (duplicate), 6
    // 1. Pop -> Lock (Set aside)
    // 2. Pop -> 5 (Bust!)
    state.deck.push(createCard('6', 'number', 'n-6'));
    state.deck.push(createCard('5', 'number', 'n-5-dup'));
    const lock = createCard('Lock', 'action', 'f-1');
    state.deck.push(lock);

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerB.id },
    });

    // B should have busted
    // (previously debugged the scenario; now assert expected state)
    expect(state.players[1].hasBusted).toBe(true);
    expect(state.players[1].hasBusted).toBe(true);

    // Lock should be in discard pile
    const discardedLock = state.discardPile.find((c: CardModel) => c.id === lock.id);
    expect(discardedLock).toBeDefined();

    // Turn Three should be in discard pile
    const discardedT3 = state.discardPile.find((c: CardModel) => c.id === turnThree.id);
    expect(discardedT3).toBeDefined();

    // B should NOT have pending actions
    expect(state.players[1].pendingImmediateActionIds).toHaveLength(0);
  });

  it('Case 24: Life Saver drawn during Turn Three saves from bust', () => {
    const playerA = state.players[0];
    const playerB = state.players[1];

    state.currentPlayerId = playerA.id;

    // Give A a Turn Three
    const turnThree = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree];
    playerA.hand = [turnThree];

    // Give B a 5
    playerB.hand = [createCard('5', 'number', 'n-5-orig')];

    // Stack deck: [5 (duplicate), Life Saver, 6]
    // Pop order: 6, Life Saver, 5
    // We want: 1. Life Saver (kept), 2. 5 (saved), 3. 6
    // So stack: 6, 5, Life Saver
    state.deck.push(createCard('6', 'number', 'n-6'));
    state.deck.push(createCard('5', 'number', 'n-5-dup'));
    const sc = createCard('LifeSaver', 'action', 'sc-1');
    state.deck.push(sc);

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerB.id },
    });

    // B should NOT have busted
    expect(state.players[1].hasBusted).toBe(false);

    // B should have 5, 6 in hand (duplicate 5 discarded, Life Saver discarded)
    const ranks = state.players[1].hand.map((c: CardModel) => c.rank);
    expect(ranks).toContain('5');
    expect(ranks).toContain('6');
    expect(ranks).not.toContain('LifeSaver');

    // Life Saver should be gone (used)
    expect(state.players[1].hasLifeSaver).toBe(false);
  });

  it('Case 14: Chained Turn Three (Success)', () => {
    // A plays Turn Three on B.
    // B draws another Turn Three (and doesn't bust).
    // B assigns new Turn Three to C.
    // C resolves it.
    // Turn resumes from A's neighbor (B).

    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];

    state.currentPlayerId = playerA.id;

    // Give A a Turn Three
    const turnThree1 = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree1];
    playerA.hand = [turnThree1];

    // Stack deck for C's draw (when resolving t3-2): [7, 8, 9]
    // These must be at the BOTTOM of the stack (pushed first)
    state.deck.push(createCard('9', 'number', 'n-9'));
    state.deck.push(createCard('8', 'number', 'n-8'));
    state.deck.push(createCard('7', 'number', 'n-7'));

    // Stack deck for B's draw: [TurnThree, 5, 6]
    // Pop order: 6, 5, TurnThree
    // These must be at the TOP of the stack (pushed last)
    state.deck.push(createCard('6', 'number', 'n-6'));
    state.deck.push(createCard('5', 'number', 'n-5'));
    const turnThree2 = createCard('TurnThree', 'action', 't3-2');
    state.deck.push(turnThree2);

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree1.id, targetId: playerB.id },
    });

    // B should have pending action (t3-2)
    expect(state.currentPlayerId).toBe(playerB.id);
    expect(state.players[1].pendingImmediateActionIds).toContain(turnThree2.id);
    expect(state.turnOrderBaseId).toBe(playerA.id);

    // B plays Turn Three on C
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerB.id, cardId: turnThree2.id, targetId: playerC.id },
    });

    // C resolves immediately (no pending actions generated from C's draw)
    // So turn should advance to A's neighbor -> B
    expect(state.currentPlayerId).toBe(playerB.id);
    expect(state.turnOrderBaseId).toBeNull();

    // C should have 7, 8, 9
    const cRanks = state.players[2].hand.map((c: CardModel) => c.rank);
    expect(cRanks).toContain('7');
    expect(cRanks).toContain('8');
    expect(cRanks).toContain('9');
  });

  it('Case 16: Multiple Actions (Lock + Turn Three)', () => {
    // A plays Turn Three on B.
    // B draws Lock AND Turn Three.
    // B must resolve them in order (Lock then Turn Three).

    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];
    const playerD = state.players[3];

    state.currentPlayerId = playerA.id;

    // Give A a Turn Three
    const turnThree1 = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree1];
    playerA.hand = [turnThree1];

    // Stack deck for B: [TurnThree, Lock, 6]
    // Pop order: 6, Lock, TurnThree
    // Wait, "revealed actions are set aside".
    // Order of resolution: "Assign in order flipped".
    // If popped: 6, Lock, TurnThree.
    // Lock is flipped 2nd. TurnThree is flipped 3rd.
    // So Lock resolved first, then TurnThree.

    // Stack:
    // Top -> TurnThree (3rd)
    //        Lock (2nd)
    //        6 (1st)
    // Stack for C (target of T3-2): [7, 8, 9]
    // Pushed FIRST (bottom of stack)
    state.deck.push(createCard('9', 'number', 'n-9'));
    state.deck.push(createCard('8', 'number', 'n-8'));
    state.deck.push(createCard('7', 'number', 'n-7'));

    // Stack deck for B: [TurnThree, Lock, 6]
    // Pop order: 6, Lock, TurnThree
    // Pushed LAST (top of stack)
    const turnThree2 = createCard('TurnThree', 'action', 't3-2');
    const lock = createCard('Lock', 'action', 'f-1');

    // We need to push in REVERSE pop order.
    // We want pop: 6, Lock, TurnThree.
    // So push: TurnThree, Lock, 6.
    state.deck.push(turnThree2);
    state.deck.push(lock);
    state.deck.push(createCard('6', 'number', 'n-6'));

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree1.id, targetId: playerB.id },
    });

    // B should have pending actions: Lock, then TurnThree
    expect(state.currentPlayerId).toBe(playerB.id);
    expect(state.players[1].pendingImmediateActionIds).toEqual([lock.id, turnThree2.id]);

    // B resolves Lock on C
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerB.id, cardId: lock.id, targetId: playerC.id },
    });

    // C is locked
    expect(state.players[2].hasStayed).toBe(true);

    // B still has pending TurnThree
    expect(state.currentPlayerId).toBe(playerB.id);
    expect(state.players[1].pendingImmediateActionIds).toEqual([turnThree2.id]);

    // B resolves TurnThree on D
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerB.id, cardId: turnThree2.id, targetId: playerD.id },
    });

    // D resolves immediately.
    // Turn resumes from A's neighbor -> B.
    expect(state.currentPlayerId).toBe(playerB.id);
    expect(state.turnOrderBaseId).toBeNull();
  });

  it('Case 23: Life Saver Overflow', () => {
    // A plays Turn Three on B (who has a Life Saver).
    // B draws another Life Saver.
    // B must give it to C.

    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];

    state.currentPlayerId = playerA.id;

    // Give B a Life Saver
    playerB.hasLifeSaver = true;

    // Give A a Turn Three
    const turnThree = createCard('TurnThree', 'action', 't3-1');
    playerA.reservedActions = [turnThree];
    playerA.hand = [turnThree];

    // Stack deck for B: [Life Saver, 5, 6]
    // Pop order: 6, 5, Life Saver
    const sc2 = createCard('LifeSaver', 'action', 'sc-2');
    state.deck.push(createCard('6', 'number', 'n-6'));
    state.deck.push(createCard('5', 'number', 'n-5'));
    state.deck.push(sc2);

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerB.id },
    });

    // B should still have Life Saver (original)
    expect(state.players[1].hasLifeSaver).toBe(true);

    // B should have pending action to give Life Saver to someone
    // Because B already has one, the new one is queued for targeting.
    expect(state.players[1].pendingImmediateActionIds).toContain(sc2.id);

    // B targets C with the new Life Saver
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerB.id, cardId: sc2.id, targetId: playerC.id },
    });

    // C should have received the new Life Saver
    expect(state.players[2].hasLifeSaver).toBe(true);
    // Debug output for failing case (helps identify why the card didn't land in hand)
    // debug logs removed after verification
    expect(state.players[2].hand.some((c: CardModel) => c.id === sc2.id)).toBe(true);

    // Turn resumes from A's neighbor -> B
    expect(state.currentPlayerId).toBe(playerB.id);
  });
});
