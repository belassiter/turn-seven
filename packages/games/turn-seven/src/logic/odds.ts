import type { CardModel } from '@turn-seven/engine';

// Compute the probability (0..1) that drawing one card from `deck` will cause the
// player to bust given their `hand` of cards.
// Simplification: this ignores effects of action cards (we treat them as non-busting)
// and ignores any other more complex state such as pending actions, second-draw rules etc.
// This is a quick estimate for UI only.
export function computeBustProbability(
  hand: CardModel[] | undefined,
  deck: CardModel[] | undefined,
  activePlayersCount?: number // optional: when === 1 we compute TurnThree chains
): number {
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

  if (!activePlayersCount || activePlayersCount > 1) {
    // Default/simplified behavior: simple fraction of damaging number cards over full deck.
    if (totalConsidered === 0) return 0;
    return bustCount / totalConsidered;
  }

  // Special case: only one active player remains — account for TurnThree chains.
  // We'll enumerate sequences deterministically (depth bounded by number of TurnThree cards in deck).

  // Helper: recursively process 'queue' number of sequential draws from the deck.
  // Returns probability (0..1) that at least one bust occurs during these draws.
  const turnThreeCount = deck.filter(d => d.suit === 'action' && String(d.rank) === 'TurnThree').length;

  function probBustSequential(currentHandSet: Set<string>, currentDeck: CardModel[], hasSC: boolean, queue: number, remainingTurnThrees: number): number {
    if (queue <= 0) return 0;
    if (currentDeck.length === 0) return 0;

    let prob = 0;

    for (let i = 0; i < currentDeck.length; i++) {
      const c = currentDeck[i];
      const p = 1 / currentDeck.length;
      const nextDeck = currentDeck.slice(0, i).concat(currentDeck.slice(i + 1));

      if (!c.suit || c.suit === 'number') {
        const r = String(c.rank);
        if (currentHandSet.has(r) && !hasSC) {
          // immediate bust
          prob += p * 1;
          continue;
        }

        // otherwise, update hand (if this rank not present) and second chance (consumed on duplicate)
        const nextHasSC = hasSC && currentHandSet.has(r) ? false : hasSC;
        const nextHand = new Set(currentHandSet);
        if (!nextHand.has(r)) nextHand.add(r);

        prob += p * probBustSequential(nextHand, nextDeck, nextHasSC, queue - 1, remainingTurnThrees);
      } else if (c.suit === 'action') {
        const rank = String(c.rank);
        if (rank === 'TurnThree' && remainingTurnThrees > 0) {
          // This consumes one TurnThree and adds 3 draws to the queue (we consumed 1 already)
          prob += p * probBustSequential(currentHandSet, nextDeck, hasSC, queue - 1 + 3, remainingTurnThrees - 1);
        } else if (rank === 'SecondChance') {
          // Acquire second chance immediately for subsequent draws
          prob += p * probBustSequential(currentHandSet, nextDeck, true, queue - 1, remainingTurnThrees);
        } else {
          // other action cards or exhausted TurnThree pool — non-busting, just continue
          prob += p * probBustSequential(currentHandSet, nextDeck, hasSC, queue - 1, remainingTurnThrees);
        }
      } else {
        // modifier cards — do not bust
        prob += p * probBustSequential(currentHandSet, nextDeck, hasSC, queue - 1, remainingTurnThrees);
      }
    }

    return prob;
  }

  const initialHandSet = numberRanksInHand;
  // start with a single draw (queue=1)
  const overall = probBustSequential(initialHandSet, deck.slice(), false, 1, turnThreeCount);
  return overall;
}
