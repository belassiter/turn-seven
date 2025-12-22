import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import { GameState, CardModel } from '@turn-seven/engine';

describe('Deck Integrity Analysis', () => {
  const logic = new TurnSevenLogic();

  const getAllCards = (state: GameState): CardModel[] => {
    const cards: CardModel[] = [];
    if (state.deck) cards.push(...state.deck);
    if (state.discardPile) cards.push(...state.discardPile);
    state.players.forEach((p) => {
      cards.push(...p.hand);
      if (p.reservedActions) cards.push(...p.reservedActions);
    });

    // Dedup by ID to handle cards that are in both hand and reservedActions (e.g. pending actions)
    const uniqueMap = new Map<string, CardModel>();
    cards.forEach((c) => uniqueMap.set(c.id, c));
    return Array.from(uniqueMap.values());
  };

  const countRank = (cards: CardModel[], rank: string): number => {
    return cards.filter((c) => String(c.rank) === rank).length;
  };

  it('Simulate 10 rounds and track card counts', () => {
    console.log('Starting Deck Integrity Simulation (10 Rounds)...');
    let state = logic.createInitialStateFromNames(['Alice', 'Bob', 'Charlie']);

    for (let round = 1; round <= 10; round++) {
      // 1. Simulate some play (move cards from deck to hands/discard)
      // Move 10 cards to discard
      if (state.deck.length > 10) {
        const toDiscard = state.deck.splice(0, 10);
        state.discardPile.push(...toDiscard.map((c) => ({ ...c, isFaceUp: true })));
      }

      // Move 5 cards to each player
      state.players.forEach((p) => {
        if (state.deck.length > 5) {
          const drawn = state.deck.splice(0, 5);
          p.hand.push(...drawn.map((c) => ({ ...c, isFaceUp: true })));
        }
      });

      // 2. End Round
      state.gamePhase = 'ended';

      // 3. Start Next Round
      state = logic.startNextRound(state);

      // 4. Analyze
      const allCards = getAllCards(state);
      const uniqueIds = new Set(allCards.map((c) => c.id));
      const x2Count = countRank(allCards, 'x2');
      const fourCount = countRank(allCards, '4');

      console.log(`Round ${round} Summary:`);
      console.log(`  Total Cards: ${allCards.length}`);
      console.log(`  Unique IDs: ${uniqueIds.size}`);
      console.log(`  'x2' Count: ${x2Count} (Expected: 1)`);
      console.log(`  '4' Count:  ${fourCount} (Expected: 4)`);

      if (allCards.length !== 94 || x2Count !== 1 || fourCount !== 4) {
        console.error('  !!! INTEGRITY FAILURE DETECTED !!!');
      }

      expect(allCards.length).toBe(94);
      expect(x2Count).toBe(1);
      expect(fourCount).toBe(4);
    }
  });
});
