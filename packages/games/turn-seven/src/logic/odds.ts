import type { CardModel } from '@turn-seven/engine';
import { computeHandScore } from '@turn-seven/engine';

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
  let hasLifeSaver = false;
  for (const c of hand) {
    if (c.suit === 'action' && String(c.rank) === 'LifeSaver') {
      hasLifeSaver = true;
    }
    if (!c.suit || c.suit === 'number') {
      numberRanksInHand.add(String(c.rank));
    }
  }

  // If a player has a Life Saver, they cannot bust on the next duplicate — probability is 0.
  if (hasLifeSaver) return 0;

  // Denominator: consider the full remaining deck size (per requested behavior)
  // numerator only counts cards that would cause a bust (duplicates of existing number ranks).
  let totalConsidered = deck.length;
  let bustCount = 0;

  for (const c of deck) {
    // Only number cards can cause a duplicate (bust). Action cards are treated as non-busting
    // for now — they remain in the deck and are part of the denominator but do not increase bustCount.
    if (!c.suit || c.suit === 'number') {
      // If the rank already exists in hand and player has no Life Saver, drawing it will bust
      if (numberRanksInHand.has(String(c.rank)) && !hasLifeSaver) {
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
  // WARNING: exact enumeration below can explode for large decks and many TurnThree
  // cards. Add a safety guard to avoid freezing the UI by falling back to the
  // simple fraction-based calculation when the deck is large.
  const MAX_ENUM_DEPTH = 14; // if deck is larger, use simple approx to avoid CPU explosion
  const turnThreeCount = deck.filter(d => d.suit === 'action' && String(d.rank) === 'TurnThree').length;

  if (deck.length > MAX_ENUM_DEPTH && turnThreeCount > 0) {
    // Fall back to the simple fraction-based estimate.
    if (totalConsidered === 0) return 0;
    return bustCount / totalConsidered;
  }
  // We'll enumerate sequences deterministically (depth bounded by number of TurnThree cards in deck).

  // Helper: recursively process 'queue' number of sequential draws from the deck.
  // Returns probability (0..1) that at least one bust occurs during these draws.
  // (turnThreeCount already computed above)

  function probBustSequential(currentHandSet: Set<string>, currentDeck: CardModel[], hasLifeSaverFlag: boolean, queue: number, remainingTurnThrees: number): number {
    if (queue <= 0) return 0;
    if (currentDeck.length === 0) return 0;

    let prob = 0;

    for (let i = 0; i < currentDeck.length; i++) {
      const c = currentDeck[i];
      const p = 1 / currentDeck.length;
      const nextDeck = currentDeck.slice(0, i).concat(currentDeck.slice(i + 1));

      if (!c.suit || c.suit === 'number') {
        const r = String(c.rank);
        if (currentHandSet.has(r) && !hasLifeSaverFlag) {
          // immediate bust
          prob += p * 1;
          continue;
        }

        // otherwise, update hand (if this rank not present) and Life Saver (consumed on duplicate)
        const nextHasLifeSaver = hasLifeSaverFlag && currentHandSet.has(r) ? false : hasLifeSaverFlag;
        const nextHand = new Set(currentHandSet);
        if (!nextHand.has(r)) nextHand.add(r);

        prob += p * probBustSequential(nextHand, nextDeck, nextHasLifeSaver, queue - 1, remainingTurnThrees);
      } else if (c.suit === 'action') {
        const rank = String(c.rank);
        if (rank === 'TurnThree' && remainingTurnThrees > 0) {
          // This consumes one TurnThree and adds 3 draws to the queue (we consumed 1 already)
          prob += p * probBustSequential(currentHandSet, nextDeck, hasLifeSaverFlag, queue - 1 + 3, remainingTurnThrees - 1);
        } else if (rank === 'LifeSaver') {
          // Acquire a Life Saver immediately for subsequent draws
          prob += p * probBustSequential(currentHandSet, nextDeck, true, queue - 1, remainingTurnThrees);
        } else {
          // other action cards or exhausted TurnThree pool — non-busting, just continue
          prob += p * probBustSequential(currentHandSet, nextDeck, hasLifeSaverFlag, queue - 1, remainingTurnThrees);
        }
      } else {
        // modifier cards — do not bust
        prob += p * probBustSequential(currentHandSet, nextDeck, hasLifeSaverFlag, queue - 1, remainingTurnThrees);
      }
    }

    return prob;
  }

  const initialHandSet = numberRanksInHand;
  // start with a single draw (queue=1)
  const overall = probBustSequential(initialHandSet, deck.slice(), false, 1, turnThreeCount);
  return overall;
}

// Compute expected final round score after one HIT and the probabilities of bust / Turn 7
export function computeHitExpectation(
  hand: CardModel[] | undefined,
  deck: CardModel[] | undefined,
  activePlayersCount?: number
): { expectedScore: number; bustProbability: number; turn7Probability: number } {
  if (!hand || !deck || deck.length === 0) return { expectedScore: 0, bustProbability: 0, turn7Probability: 0 };

  // computeHandScore is exported and used below

  // shortcut: if player has a Life Saver already, no busts on duplicates => we can compute expected score simply
  const hasLifeSaverInitial = hand.some(c => c.suit === 'action' && String(c.rank) === 'LifeSaver');
  if (hasLifeSaverInitial) {
    // simply average final scores across all deck draws, ignoring busts (none because of Life Saver)
    let expected = 0;
    let turn7Count = 0;
    for (const c of deck) {
      const nextHand = [...hand];
      if (!c.suit || c.suit === 'number') {
        // adding number
        nextHand.push(c);
      } else if (c.suit === 'modifier') {
        nextHand.push(c);
      } else if (c.suit === 'action') {
        // if a Life Saver drawn it's kept; otherwise action cards don't change score
        if (String(c.rank) === 'LifeSaver') nextHand.push(c);
      }

      const score = computeHandScore(nextHand);
      expected += score / deck.length;
      const uniqueCount = new Set(nextHand.filter(h => !h.suit || h.suit === 'number').map(h => h.rank)).size;
      if (uniqueCount >= 7) turn7Count += 1;
    }

    return { expectedScore: expected, bustProbability: 0, turn7Probability: turn7Count / deck.length };
  }

  // For activePlayersCount > 1, do a simple per-card expectation without TurnThree chain resolution
  if (!activePlayersCount || activePlayersCount > 1) {
    let expected = 0;
    let bust = 0;
    let turn7 = 0;
    const handNumberRanks = new Set(hand.filter(c => !c.suit || c.suit === 'number').map(c => String(c.rank)));

    for (const c of deck) {
      const p = 1 / deck.length;
      if (!c.suit || c.suit === 'number') {
        const rank = String(c.rank);
        // duplicate => bust
        if (handNumberRanks.has(rank)) {
          bust += p;
          // final score is 0
        } else {
          // add to hand
          const newHand = [...hand, c];
          const score = computeHandScore(newHand);
          expected += p * score;
          if (new Set(newHand.filter(h => !h.suit || h.suit === 'number').map(h => h.rank)).size >= 7) turn7 += p;
        }
      } else if (c.suit === 'modifier') {
        const newHand = [...hand, c];
        const score = computeHandScore(newHand);
        expected += p * score;
      } else if (c.suit === 'action') {
        // Treat action cards as non-busting. LifeSaver if kept matters, but for simplicity
        // if drawing LifeSaver and player doesn't have one, they keep it and turn ends — no immediate score change
        const newHand = [...hand];
        if (String(c.rank) === 'LifeSaver' && !hand.some(h => h.suit === 'action' && String(h.rank) === 'LifeSaver')) {
          newHand.push(c);
        }
        const score = computeHandScore(newHand);
        expected += p * score;
      }
    }

    return { expectedScore: expected, bustProbability: bust, turn7Probability: turn7 };
  }

  // Special-case: one active player — perform enumeration of TurnThree chains and compute expectation
  const turnThreeCount = deck.filter(d => d.suit === 'action' && String(d.rank) === 'TurnThree').length;

  // Guard: exact enumeration can blow up; if deck is large and there are TurnThree cards
  // just fall back to the simpler per-card expectation to keep UI responsive.
  const MAX_ENUM_DECK = 14;
  if (deck.length > MAX_ENUM_DECK && turnThreeCount > 0) {
    // reuse the simple (non-chain) method from above to approximate
    let expected = 0;
    let bust = 0;
    let turn7 = 0;
    const handNumberRanks = new Set(hand.filter(c => !c.suit || c.suit === 'number').map(c => String(c.rank)));

    for (const c of deck) {
      const p = 1 / deck.length;
      if (!c.suit || c.suit === 'number') {
        const rank = String(c.rank);
        if (handNumberRanks.has(rank)) {
          bust += p;
        } else {
          const newHand = [...hand, c];
          const score = computeHandScore(newHand);
          expected += p * score;
          if (new Set(newHand.filter(h => !h.suit || h.suit === 'number').map(h => h.rank)).size >= 7) turn7 += p;
        }
      } else if (c.suit === 'modifier') {
        const newHand = [...hand, c];
        const score = computeHandScore(newHand);
        expected += p * score;
      } else if (c.suit === 'action') {
        const newHand = [...hand];
        if (String(c.rank) === 'LifeSaver' && !hand.some(h => h.suit === 'action' && String(h.rank) === 'LifeSaver')) {
          newHand.push(c);
        }
        const score = computeHandScore(newHand);
        expected += p * score;
      }
    }

    return { expectedScore: expected, bustProbability: bust, turn7Probability: turn7 };
  }

  function simulate(currentHand: CardModel[], currentDeck: CardModel[], hasLifeSaverFlag: boolean, queue: number, remainingTurnThrees: number): { exp: number; bust: number; turn7: number } {
    if (currentDeck.length === 0 || queue <= 0) {
      const sc = computeHandScore(currentHand);
      const isTurn7 = new Set(currentHand.filter(x => !x.suit || x.suit === 'number').map(x => x.rank)).size >= 7 ? 1 : 0;
      return { exp: sc, bust: 0, turn7: isTurn7 };
    }

    let totalExp = 0;
    let totalBust = 0;
    let totalTurn7 = 0;

    for (let i = 0; i < currentDeck.length; i++) {
      const c = currentDeck[i];
      const p = 1 / currentDeck.length;
      const nextDeck = currentDeck.slice(0, i).concat(currentDeck.slice(i + 1));

      if (!c.suit || c.suit === 'number') {
        const r = String(c.rank);
        if (currentHand.some(h => (!h.suit || h.suit === 'number') && String(h.rank) === r)) {
          // duplicate
          if (!hasLifeSaverFlag) {
            totalBust += p; // immediate bust: score 0
            continue;
            } else {
            // consume Life Saver: duplicate removed and Life Saver consumed
            // (we don't add the duplicate to hand)
              const nextHasLifeSaver = false;
            // consume the Life Saver card from hand if present
              const nextHand = currentHand.filter(h => !(h.suit === 'action' && String(h.rank) === 'LifeSaver'));
            const res = simulate(nextHand, nextDeck, nextHasLifeSaver, queue - 1, remainingTurnThrees);
            totalExp += p * res.exp;
            totalBust += p * res.bust;
            totalTurn7 += p * res.turn7;
          }
        } else {
          // add number to hand
          const nextHand = [...currentHand, c];
          const res = simulate(nextHand, nextDeck, hasLifeSaverFlag, queue - 1, remainingTurnThrees);
          totalExp += p * res.exp;
          totalBust += p * res.bust;
          totalTurn7 += p * res.turn7;
        }
      } else if (c.suit === 'action') {
        const rank = String(c.rank);
        if (rank === 'TurnThree' && remainingTurnThrees > 0) {
          // consume one TurnThree; queue expands by 3 draws (we've consumed 1 already)
          const res = simulate(currentHand, nextDeck, hasLifeSaverFlag, queue - 1 + 3, remainingTurnThrees - 1);
          totalExp += p * res.exp;
          totalBust += p * res.bust;
          totalTurn7 += p * res.turn7;
        } else if (rank === 'LifeSaver') {
          // immediate Life Saver applied
          const nextHand = currentHand.concat(c);
          const res = simulate(nextHand, nextDeck, true, queue - 1, remainingTurnThrees);
          totalExp += p * res.exp;
          totalBust += p * res.bust;
          totalTurn7 += p * res.turn7;
        } else {
          // other action or exhausted TurnThree pool: non-busting, just continue
          const nextHand = currentHand.concat(c);
          const res = simulate(nextHand, nextDeck, hasLifeSaverFlag, queue - 1, remainingTurnThrees);
          totalExp += p * res.exp;
          totalBust += p * res.bust;
          totalTurn7 += p * res.turn7;
        }
      } else {
        // modifier
        const nextHand = [...currentHand, c];
        const res = simulate(nextHand, nextDeck, hasLifeSaverFlag, queue - 1, remainingTurnThrees);
        totalExp += p * res.exp;
        totalBust += p * res.bust;
        totalTurn7 += p * res.turn7;
      }
    }

    return { exp: totalExp, bust: totalBust, turn7: totalTurn7 };
  }

  const res = simulate([...hand], deck.slice(), false, 1, turnThreeCount);
  return { expectedScore: res.exp, bustProbability: res.bust, turn7Probability: res.turn7 };
}
