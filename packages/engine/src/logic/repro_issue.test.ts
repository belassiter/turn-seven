
import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './TurnSevenLogic';
import { GameState, PlayerModel, CardModel } from '../state/gameState';

const createCard = (rank: string, suit: 'number' | 'action' | 'modifier', id: string): CardModel => ({
  id,
  rank,
  suit,
  isFaceUp: false,
});

describe('Reproduction of Case 23', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = {
      players: [
        { id: 'p1', name: 'A', hand: [], isBot: false, isActive: true, score: 0 },
        { id: 'p2', name: 'B', hand: [], isBot: false, isActive: true, score: 0 },
        { id: 'p3', name: 'C', hand: [], isBot: false, isActive: true, score: 0 },
      ],
      deck: [],
      discardPile: [],
      currentPlayerId: 'p1',
      gamePhase: 'playing',
      turnOrderBaseId: null,
      roundNumber: 1,
      ledger: [],
    };
  });

  it('Case 23: Life Saver Overflow Debug', () => {
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

    console.log('--- Initial State ---');
    console.log('B has LifeSaver:', playerB.hasLifeSaver);
    console.log('C has LifeSaver:', playerC.hasLifeSaver);

    // A plays Turn Three on B
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerA.id, cardId: turnThree.id, targetId: playerB.id },
    });

    console.log('--- After Turn Three on B ---');
    console.log('Current Player:', state.currentPlayerId);
    console.log('B Pending Actions:', state.players[1].pendingImmediateActionIds);
    console.log('B Hand:', state.players[1].hand.map(c => c.id));

    // B should still have Life Saver (original)
    expect(state.players[1].hasLifeSaver).toBe(true);

    // B should have pending action to give Life Saver to someone
    expect(state.players[1].pendingImmediateActionIds).toContain(sc2.id);

    // B targets C with the new Life Saver
    console.log('--- B plays LifeSaver on C ---');
    state = logic.performAction(state, {
      type: 'PLAY_ACTION',
      payload: { actorId: playerB.id, cardId: sc2.id, targetId: playerC.id },
    });

    console.log('--- After LifeSaver on C ---');
    console.log('C has LifeSaver:', state.players[2].hasLifeSaver);
    console.log('C Hand:', state.players[2].hand.map(c => c.id));

    // C should have received the new Life Saver
    expect(state.players[2].hasLifeSaver).toBe(true);
    expect(state.players[2].hand.some((c: CardModel) => c.id === sc2.id)).toBe(true);
  });
});
