import { describe, it, expect, beforeEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Turn Seven Solo Play (Last Player Standing)', () => {
  let logic: TurnSevenLogic;
  let state: GameState;

  beforeEach(() => {
    logic = new TurnSevenLogic();
    state = logic.createInitialStateFromNames(['A', 'B', 'C']);
    // Clear hands
    state.players.forEach((p) => (p.hand = []));
    state.deck = [];
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

  it('should allow the last active player to continue playing', () => {
    const playerA = state.players[0];
    const playerB = state.players[1];
    const playerC = state.players[2];

    // B and C stay/bust
    playerB.isActive = false;
    playerB.hasStayed = true;
    playerC.isActive = false;
    playerC.hasStayed = true;

    state.currentPlayerId = playerA.id;
    playerA.isActive = true;

    // Stack deck for A
    state.deck.push(createCard('5', 'number', 'n-5'));

    // A hits
    state = logic.performAction(state, { type: 'HIT' });

    // Should still be A's turn
    expect(state.currentPlayerId).toBe(playerA.id);
    // Game should still be playing
    expect(state.gamePhase).toBe('playing');
  });

  it('should not allow actions if game is ended', () => {
    state.gamePhase = 'ended';
    const playerA = state.players[0];
    state.currentPlayerId = playerA.id;

    // Stack deck
    state.deck.push(createCard('5', 'number', 'n-5'));

    // Try to hit
    const newState = logic.performAction(state, { type: 'HIT' });

    // State should be unchanged (deck size same)
    expect(newState.deck.length).toBe(1);
    expect(newState.players[0].hand.length).toBe(0);
  });
});
