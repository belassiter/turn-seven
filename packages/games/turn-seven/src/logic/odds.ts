import type { CardModel } from '@turn-seven/engine';

// Compute the probability (0..1) that drawing one card from `deck` will cause the
// player to bust given their `hand` of cards.
// Simplification: this ignores effects of action cards (we treat them as non-busting)
// and ignores any other more complex state such as pending actions, second-draw rules etc.
// This is a quick estimate for UI only.
export function computeBustProbability(hand: CardModel[] | undefined, deck: CardModel[] | undefined): number {
  if (!hand || !deck || deck.length === 0) return 0;

  // collect ranks of number cards already in player's hand
  const numberRanksInHand = new Set<string>();
  let hasSecondChance = false;
  for (const c of hand) {
    if (c.suit === 'action' && String(c.rank) === 'SecondChance') {
      hasSecondChance = true;
    }
    if (!c.suit || c.suit === 'number') {
      numberRanksInHand.add(String(c.rank));
    }
  }

  // If a player has a Second Chance, they cannot bust on the next duplicate — probability is 0.
  if (hasSecondChance) return 0;

  // Denominator: consider the full remaining deck size (per requested behavior)
  // numerator only counts cards that would cause a bust (duplicates of existing number ranks).
  let totalConsidered = deck.length;
  let bustCount = 0;

  for (const c of deck) {
    // Only number cards can cause a duplicate (bust). Action cards are treated as non-busting
    // for now — they remain in the deck and are part of the denominator but do not increase bustCount.
    if (!c.suit || c.suit === 'number') {
      // If the rank already exists in hand and player has no second chance, drawing it will bust
      if (numberRanksInHand.has(String(c.rank)) && !hasSecondChance) {
        bustCount += 1;
      }
    }
  }

  if (totalConsidered === 0) return 0;
  return bustCount / totalConsidered;
}
