import { GameState, PlayerModel, CardModel, computeHandScore } from '@turn-seven/engine';
import { computeHitExpectation, getFullDeckTemplate } from './odds';

export type BotMove = { type: 'HIT' } | { type: 'STAY' };
export type BotTarget = string; // The ID of the player to target

/**
 * Decides if a bot should hit or stay.
 * @returns A `BotMove` object, either `{ type: 'HIT' }` or `{ type: 'STAY' }`.
 */
export const decideMove = (bot: PlayerModel, gameState: GameState): BotMove => {
  const difficulty = bot.botDifficulty || 'medium';

  if (difficulty === 'easy') {
    return Math.random() < 0.5 ? { type: 'HIT' } : { type: 'STAY' };
  }

  // Medium Bot: 50% chance to act like Easy (Random), 50% chance to use advanced logic
  if (difficulty === 'medium' && Math.random() < 0.5) {
    return Math.random() < 0.5 ? { type: 'HIT' } : { type: 'STAY' };
  }

  // --- Advanced Logic for Medium/Hard/OMG/Omniscient ---

  let effectiveDeck: CardModel[] = [];
  const fullDeck = getFullDeckTemplate();

  if (difficulty === 'omniscient') {
    // Omniscient: Knows the next card
    const nextCard = gameState.deck.length > 0 ? gameState.deck[gameState.deck.length - 1] : null;

    if (nextCard) {
      // 5) Always hit on +x and x2 cards
      if (
        ['+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+10', 'x2'].includes(nextCard.rank)
      ) {
        // Note: The deck template uses +2, +4, +6, +8, +10. But let's be safe with the check.
        // Actually, let's check suit 'modifier' or specific ranks.
        // The user said "+x and x2".
        return { type: 'HIT' };
      }
      // Also check suit 'modifier' just in case
      if (nextCard.suit === 'modifier') {
        return { type: 'HIT' };
      }

      // 2) Lock Card
      if (nextCard.rank === 'Lock') {
        const activeCount = gameState.players.filter((p) => p.isActive).length;
        if (activeCount === 1) {
          return { type: 'STAY' };
        }
        // Otherwise locking logic is same as OMG (fall through to OMG logic below)
        // We need to set effectiveDeck to the full deck (as OMG would see it)
        effectiveDeck = gameState.deck.length > 0 ? gameState.deck : gameState.discardPile || [];
      }
      // 3) Turn 3 Card
      else if (nextCard.rank === 'TurnThree') {
        const activeCount = gameState.players.filter((p) => p.isActive).length;
        if (activeCount === 1) {
          // Stay if that will result in a Bust or Lock
          // We need to peek at the card AFTER the Turn 3
          const cardAfter =
            gameState.deck.length > 1 ? gameState.deck[gameState.deck.length - 2] : null;
          if (cardAfter) {
            const sim = simulateCardEffect(bot, cardAfter);
            if (sim.isBust || sim.isLock) {
              return { type: 'STAY' };
            }
            return { type: 'HIT' };
          } else {
            // If no card after, we can't know. Default to HIT? Or STAY?
            // If deck is empty, reshuffle happens.
            return { type: 'HIT' };
          }
        } else {
          // 4) Multiple active players -> Always Hit (targeting logic handles the rest)
          return { type: 'HIT' };
        }
      }
      // 1) Number Cards (and others)
      else {
        // Hit if it will not bust.
        // We set effectiveDeck to just this card, so expectation calculation will be exact.
        effectiveDeck = [nextCard];
      }
    } else {
      // Deck empty, fall back to OMG logic
      effectiveDeck = gameState.discardPile || [];
    }
  }

  if (difficulty === 'omg' || (difficulty === 'omniscient' && effectiveDeck.length > 1)) {
    // Purple: All cards seen since shuffle (Perfect Memory)
    // Note: Omniscient falls through here for Lock (active > 1)
    effectiveDeck = gameState.deck.length > 0 ? gameState.deck : gameState.discardPile || [];
  } else if (difficulty !== 'omniscient') {
    // Green (Medium) or Blue (Hard)
    const knownCards: CardModel[] = [];
    knownCards.push(...bot.hand); // Always knows its own hand

    if (difficulty === 'hard') {
      // Knows all visible cards
      gameState.players.forEach((p) => {
        if (p.id !== bot.id) {
          knownCards.push(...p.hand);
        }
      });
      if (gameState.discardPile.length > 0) {
        knownCards.push(gameState.discardPile[gameState.discardPile.length - 1]);
      }
    }

    // Subtract knownCards from a full deck to create the effective deck
    const deckCounts = new Map<string, number>();
    fullDeck.forEach((c) => {
      const key = `${c.suit}:${c.rank}`;
      deckCounts.set(key, (deckCounts.get(key) || 0) + 1);
    });

    knownCards.forEach((c) => {
      const key = `${c.suit}:${c.rank}`;
      const count = deckCounts.get(key);
      if (count && count > 0) {
        deckCounts.set(key, count - 1);
      }
    });

    fullDeck.forEach((c) => {
      const key = `${c.suit}:${c.rank}`;
      const count = deckCounts.get(key);
      if (count && count > 0) {
        effectiveDeck.push(c);
        deckCounts.set(key, count - 1);
      }
    });
  }

  const activeCount = gameState.players.filter((p) => p.isActive).length;
  const expectation = computeHitExpectation(bot.hand, effectiveDeck, activeCount);
  const currentScore = computeHandScore(bot.hand);

  return expectation.expectedScore > currentScore ? { type: 'HIT' } : { type: 'STAY' };
};

/**
 * Decides which player a bot should target with an action card.
 * @returns The ID of the player to target.
 */
export const decideTarget = (
  bot: PlayerModel,
  gameState: GameState,
  targetingInfo: { validTargets: string[]; sourceCard: CardModel }
): BotTarget => {
  const difficulty = bot.botDifficulty || 'medium';
  const { validTargets, sourceCard } = targetingInfo;

  if (validTargets.length === 0) {
    // This should not happen based on game rules, but as a fallback, target self.
    return bot.id;
  }
  if (validTargets.length === 1) {
    return validTargets[0];
  }

  if (difficulty === 'easy') {
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  }

  // Medium Bot: 50% chance to act like Easy (Random Target)
  if (difficulty === 'medium' && Math.random() < 0.5) {
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  }

  // Omniscient Turn 3 Logic
  if (difficulty === 'omniscient' && sourceCard.rank === 'TurnThree') {
    // The card to be given is the next card in the deck
    const nextCard = gameState.deck.length > 0 ? gameState.deck[gameState.deck.length - 1] : null;

    if (nextCard) {
      // a) Check if applying to self results in Turn 7
      const selfSim = simulateCardEffect(bot, nextCard);
      if (selfSim.isTurn7) return bot.id;

      // Sort players by total score descending
      const sortedPlayers = [...gameState.players].sort(
        (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
      );

      // b) Check if 2nd place player will bust
      // c) Check next player...
      // We iterate from index 1 (2nd place) to end
      for (let i = 1; i < sortedPlayers.length; i++) {
        const target = sortedPlayers[i];
        // Skip self in this loop (we check self in step d)
        if (target.id !== bot.id && validTargets.includes(target.id)) {
          const sim = simulateCardEffect(target, nextCard);
          if (sim.isBust) return target.id;
        }
      }

      // d) Check if applying to self is safe (no bust, no lock)
      if (!selfSim.isBust && !selfSim.isLock) {
        return bot.id;
      }

      // e) Otherwise, apply to the last place player
      // Find the last place player who is a valid target
      for (let i = sortedPlayers.length - 1; i >= 0; i--) {
        const target = sortedPlayers[i];
        if (validTargets.includes(target.id)) return target.id;
      }
    }
  }

  // --- Advanced Logic for Medium/Hard/OMG ---

  const actionType = sourceCard.rank; // Lock, TurnThree, LifeSaver

  if (actionType === 'LifeSaver') {
    // Help underdog (lowest total score)
    const targets = gameState.players.filter((p) => validTargets.includes(p.id));
    targets.sort((a, b) => {
      const scoreA = getTargetScore(a, difficulty);
      const scoreB = getTargetScore(b, difficulty);
      return scoreA - scoreB;
    });
    return targets[0].id;
  } else {
    // Lock or TurnThree: Disadvantage leader (highest total score)
    const targets = gameState.players.filter((p) => validTargets.includes(p.id));
    targets.sort((a, b) => {
      const scoreA = getTargetScore(a, difficulty);
      const scoreB = getTargetScore(b, difficulty);
      return scoreB - scoreA;
    });
    return targets[0].id;
  }
};

/**
 * Helper to get the score of a potential target player.
 * Hard/OMG bots are smarter and consider the current round's score.
 */
const getTargetScore = (player: PlayerModel, difficulty: string): number => {
  const base = player.totalScore || 0;
  if (difficulty === 'medium') return base;
  // Hard/OMG: include current round score (if not busted)
  const current = player.hasBusted ? 0 : computeHandScore(player.hand);
  return base + current;
};

const simulateCardEffect = (
  player: PlayerModel,
  card: CardModel
): { score: number; isBust: boolean; isTurn7: boolean; isLock: boolean } => {
  const newHand = [...player.hand, card];
  const score = computeHandScore(newHand);
  return {
    score,
    isBust: score > 7,
    isTurn7: score === 7,
    isLock: card.rank === 'Lock',
  };
};
