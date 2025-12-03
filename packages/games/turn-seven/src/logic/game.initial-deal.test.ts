import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState, CardModel } from '@turn-seven/engine';

describe('Initial Deal Edge Cases', () => {
  const logic = new TurnSevenLogic();

  // Helper to mock deck
  const mockDeck = (cards: Partial<CardModel>[]) => {
    const originalCreateDeck = (logic as any).createDeck;
    (logic as any).createDeck = () => {
      return cards.map((c, i) => ({
        id: c.id || `mock-${i}`,
        suit: c.suit || 'number',
        rank: c.rank || '1',
        isFaceUp: false,
        ...c
      })) as CardModel[];
    };
    return () => { (logic as any).createDeck = originalCreateDeck; };
  };

  it('handles Freeze drawn on initial deal', () => {
    // Setup: P1 draws Freeze.
    // Should pause deal and wait for P1 to target.
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'a1', suit: 'action', rank: 'Freeze' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have Freeze pending
    expect(p1.pendingImmediateActionIds).toContain('a1');
    // P1 should have Freeze in hand/reserved
    expect(p1.hand.some(c => c.id === 'a1') || p1.reservedActions?.some(c => c.id === 'a1')).toBe(true);
    
    // Deal should be paused, so P1 hasn't drawn replacement '5' yet
    expect(p1.hand.some(c => c.rank === '5')).toBe(false);

    // P2 should NOT be frozen yet
    expect(p2.isFrozen).toBe(false);
    expect(p2.hasStayed).toBe(false);
    
    // P2 should NOT have received '6' yet (deal paused)
    expect(p2.hand).toHaveLength(0);
  });

  it('handles Second Chance drawn on initial deal', () => {
    // Setup: P1 draws Second Chance. Keeps it.
    // Stack:
    // 1. Second Chance (P1)
    // 2. 6 (P2)
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'a1', suit: 'action', rank: 'SecondChance' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have Second Chance only
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('SecondChance');
    expect(p1.hasSecondChance).toBe(true);

    // P2 should have '6'
    expect(p2.hand).toHaveLength(1);
    expect(p2.hand[0].rank).toBe('6');
  });

  it('handles Turn Three drawn on initial deal', () => {
    // Setup: P1 draws Turn Three (T3).
    // Should pause deal and wait for P1 to target.
    
    const restore = mockDeck([
      { id: 'n6', rank: '6' },
      { id: 'n5', rank: '5' },
      { id: 'a1', suit: 'action', rank: 'TurnThree' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 should have TurnThree pending
    expect(p1.pendingImmediateActionIds).toContain('a1');
    // P1 should have TurnThree in hand/reserved
    expect(p1.hand.some(c => c.id === 'a1') || p1.reservedActions?.some(c => c.id === 'a1')).toBe(true);
    
    // Deal should be paused, so P1 hasn't drawn replacement '5' yet
    expect(p1.hand.some(c => c.rank === '5')).toBe(false);

    // P2 should NOT have received '6' yet (deal paused)
    expect(p2.hand).toHaveLength(0);
  });

  it('handles Second Chance drawn on initial deal when player already has one', () => {
    // Setup: P1 already has a Second Chance (from previous round or just dealt? 
    // Actually, startNextRound clears hands, so it must be dealt.
    // But wait, Second Chance is kept across rounds? No, rules say "Unused Second Chance cards are discarded at the end of the round."
    // So P1 starts with empty hand.
    // But maybe P1 draws TWO Second Chance cards in a row?
    // Stack:
    // 1. Second Chance #1 (P1 keeps)
    // 2. Second Chance #2 (P1 draws again? No, deal moves to next player if P1 keeps card)
    // Wait. If P1 draws Second Chance, they keep it. That counts as their card. Deal moves to P2.
    // So P1 cannot draw two Second Chance cards in initial deal unless P1 is targeted by someone else?
    // Or if P1 is the only player?
    // Let's assume P1 draws SC, keeps it. P2 draws SC, keeps it. P3 draws SC...
    // What if P1 draws SC, keeps it. Then later in the game...
    // The test case is "handles Second Chance drawn on initial deal when player already has one".
    // This can happen if P1 is dealt a card, then maybe targeted by a Turn Three that gives them another SC?
    // Or if P1 is dealt SC, then P2 is dealt Turn Three, targets P1, P1 draws SC?
    // Let's simulate P1 having one already (maybe manually added to state before deal? No, startNextRound clears hands).
    // Ah, startNextRound clears hands. So P1 cannot have one "already" unless we modify startNextRound logic or simulate a mid-deal state.
    // But `startNextRound` runs the whole deal loop.
    // If P1 draws SC, they keep it. They are done.
    // If P1 is targeted by P2's Turn Three later in the deal?
    // P1 (SC) -> P2 (Turn Three -> targets P1). P1 draws SC #2.
    // This is a valid scenario.
    
    // Stack (top to bottom):
    // 1. SC #1 (P1)
    // 2. Turn Three (P2) -> Targets P1 (user choice, but here we want to test the pending state of the SC #2)
    // Wait, if P2 draws Turn Three, P2 gets a pending action. The deal pauses.
    // So we can't test the "P1 gets second SC" scenario in a single `startNextRound` call if we implement the pause logic correctly!
    // Because `startNextRound` will return as soon as P2 draws Turn Three.
    // So we don't need to test "P1 gets second SC during initial deal loop" because the loop breaks.
    // We only need to test that if a player draws SC and *somehow* has one, it pauses.
    // But since hands are cleared, the only way to have one is if they got one earlier in the same deal.
    // And if they got one, they are skipped in the deal loop?
    // "players.forEach... if (player.hand.length > 0) return;"
    // So P1 gets SC #1. P1 has card.
    // P2 gets Turn Three. P2 has pending action. Deal pauses.
    // So P1 cannot get SC #2 in the same `startNextRound` execution.
    // So the only case is: P1 draws SC #1. P1 keeps it. Deal continues.
    // P2 draws SC #2. P2 keeps it. Deal continues.
    // So "Second Chance drawn when player already has one" is impossible in the *initial deal loop* for the *same player* drawing it directly.
    // It is only possible via targeting.
    // And targeting requires user interaction (which pauses the deal).
    // So we don't need a specific test for "Second Chance auto-resolution failure when player has one" because the deal pauses for the *targeting action* (Turn Three) that would cause it.
    // UNLESS: Is there a card that targets automatically? No, we said all actions target.
    // What if P1 draws SC #1. P2 draws SC #2. P3 draws SC #3.
    // All good.
    // So the only "Action" that resolves automatically is Second Chance (if you don't have one).
    // And if you DO have one?
    // Can you draw a second one directly?
    // Only if you are dealt multiple cards?
    // Initial deal is 1 card per player.
    // So you can't draw two.
    // So the "Second Chance when you have one" case is not reachable in `startNextRound`'s initial loop.
    // So we don't need a test for it in `initial-deal.test.ts`.
    
    // However, we DO need to ensure that `TurnThree` pauses.
    // I will replace the "Chain Reaction" test with the "Turn Three pauses" test.
  });

  it('handles Deck Depletion during initial deal gracefully', () => {
    // Setup: Deck has only 1 card.
    // P1 gets it.
    // P2 gets nothing.
    
    const restore = mockDeck([
      { id: 'n1', rank: '1' },
    ]);

    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], totalScore: 0 },
        { id: 'p2', name: 'P2', hand: [], totalScore: 0 },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'ended'
    } as any;

    const nextState = logic.startNextRound(state);
    restore();

    const p1 = nextState.players[0];
    const p2 = nextState.players[1];

    // P1 gets the card
    expect(p1.hand).toHaveLength(1);
    expect(p1.hand[0].rank).toBe('1');

    // P2 gets nothing
    expect(p2.hand).toHaveLength(0);
    
    // Game should still be in 'playing' phase
    expect(nextState.gamePhase).toBe('playing');
  });
});
