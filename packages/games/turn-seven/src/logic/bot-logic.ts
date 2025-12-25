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

  // --- Advanced Logic for Medium/Hard/OMG ---

  let effectiveDeck: CardModel[] = [];
  const fullDeck = getFullDeckTemplate();

  if (difficulty === 'omg') {
    // Purple: All cards seen since shuffle (Perfect Memory)
    effectiveDeck = gameState.deck.length > 0 ? gameState.deck : gameState.discardPile || [];
  } else {
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
