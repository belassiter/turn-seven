import { describe, it, expect, vi, afterEach } from 'vitest';
import { TurnSevenLogic } from './game';
import { CardModel } from '@turn-seven/engine';

describe('Game Logic Bugs', () => {
  const logic = new TurnSevenLogic();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Issue 1: Deal order should rotate in Round 2', () => {
    // Setup game with 3 players
    // We don't need to mock deck for this, just need to track roundStarterId
    const state = logic.createInitialStateFromNames(['P1', 'P2', 'P3']);

    // Verify Round 1 starter
    expect(state.roundStarterId).toBe('p1');
    expect(state.roundNumber).toBe(1);

    // Force end round 1
    state.players.forEach((p) => {
      p.hand = []; // clear hands
      p.totalScore = 10; // give some score
    });
    state.gamePhase = 'ended';

    // Start Round 2
    const round2State = logic.startNextRound(state);

    // Verify Round 2 starter
    expect(round2State.roundNumber).toBe(2);
    expect(round2State.roundStarterId).toBe('p2');

    // Verify the first card dealt in Round 2 went to P2
    // We can check the ledger to see the order of "Deal" actions
    const dealActions = round2State.ledger.filter(
      (e) => e.action === 'Deal' && e.roundNumber === 2
    );
    expect(dealActions.length).toBeGreaterThan(0);
    expect(dealActions[0].playerName).toBe('P2');

    // Let's simulate Round 3 as well just to be sure
    round2State.players.forEach((p) => {
      p.hand = [];
      p.totalScore = 20;
    });
    round2State.gamePhase = 'ended';

    const round3State = logic.startNextRound(round2State);
    expect(round3State.roundNumber).toBe(3);
    expect(round3State.roundStarterId).toBe('p3');

    const dealActions3 = round3State.ledger.filter(
      (e) => e.action === 'Deal' && e.roundNumber === 3
    );
    expect(dealActions3[0].playerName).toBe('P3');

    // Round 4 (should wrap to P1)
    round3State.players.forEach((p) => {
      p.hand = [];
      p.totalScore = 30;
    });
    round3State.gamePhase = 'ended';

    const round4State = logic.startNextRound(round3State);
    expect(round4State.roundNumber).toBe(4);
    expect(round4State.roundStarterId).toBe('p1');

    const dealActions4 = round4State.ledger.filter(
      (e) => e.action === 'Deal' && e.roundNumber === 4
    );
    expect(dealActions4[0].playerName).toBe('P1');
  });

  it('Issue 2: Turn 3 during initial deal should interrupt dealing', () => {
    // Mock createDeck to return a deck with TurnThree at the top (end of array)
    const t3: CardModel = { id: 't3', suit: 'action', rank: 'TurnThree', isFaceUp: false };
    const n1: CardModel = { id: 'n1', suit: 'number', rank: '5', isFaceUp: false };
    const n2: CardModel = { id: 'n2', suit: 'number', rank: '6', isFaceUp: false };

    // Stack: Bottom [n2, n1, t3] Top
    // P1 gets t3. P2 gets n1? No, dealing should stop.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([n2, n1, t3]);

    const state = logic.createInitialStateFromNames(['P1', 'P2', 'P3']);

    // Expectation:
    // 1. P1 gets TurnThree.
    // 2. P1 has pending action.
    // 3. Dealing STOPS. P2 and P3 should NOT have cards yet.

    const p1 = state.players[0];
    const p2 = state.players[1];
    const p3 = state.players[2];

    expect(p1.hand.length).toBe(1);
    expect(p1.hand[0].rank).toBe('TurnThree');
    expect(p1.pendingImmediateActionIds).toHaveLength(1);

    // If dealing stopped, P2 and P3 should have empty hands
    expect(p2.hand.length).toBe(0);
    expect(p3.hand.length).toBe(0);

    // Current player should be P1 (to resolve action)
    expect(state.currentPlayerId).toBe('p1');
  });
});
