import { useEffect, useRef } from 'react';
import { GameState, PlayerModel, CardModel, computeHandScore } from '@turn-seven/engine';
import { computeHitExpectation, getFullDeckTemplate } from '../logic/odds';

interface UseBotPlayerProps {
  gameState: GameState | null;
  currentPlayer: PlayerModel | undefined;
  isAnimating: boolean;
  isInputLocked: boolean;
  targetingState: {
    cardId: string;
    actorId: string;
  } | null;
  onStartTargeting: (cardId: string, actorId: string) => void;
  onHit: () => void;
  onStay: () => void;
  onTargetPlayer: (targetId: string) => void;
}

export const useBotPlayer = ({
  gameState,
  currentPlayer,
  isAnimating,
  isInputLocked,
  targetingState,
  onStartTargeting,
  onHit,
  onStay,
  onTargetPlayer,
}: UseBotPlayerProps) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef({
    gameState,
    currentPlayer,
    targetingState,
    onStartTargeting,
    onHit,
    onStay,
    onTargetPlayer,
  });
  const signatureRef = useRef<string>('');

  // Keep latest state ref updated for the timeout callback
  useEffect(() => {
    latestStateRef.current = {
      gameState,
      currentPlayer,
      targetingState,
      onStartTargeting,
      onHit,
      onStay,
      onTargetPlayer,
    };
  }, [gameState, currentPlayer, targetingState, onStartTargeting, onHit, onStay, onTargetPlayer]);

  useEffect(() => {
    // Calculate current logical signature
    const currentSignature =
      gameState && currentPlayer
        ? `${gameState.roundNumber}-${currentPlayer.id}-${currentPlayer.hand.length}-${
            currentPlayer.pendingImmediateActionIds?.length || 0
          }-${targetingState ? 'targeting' : 'normal'}`
        : '';

    // If we are animating or invalid state, clear everything
    if (
      !gameState ||
      !currentPlayer ||
      !currentPlayer.isBot ||
      !currentPlayer.isActive ||
      currentPlayer.hasStayed ||
      currentPlayer.hasBusted ||
      isAnimating ||
      isInputLocked ||
      gameState.gamePhase !== 'playing'
    ) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      signatureRef.current = ''; // Reset signature so next valid state triggers new timer

      if (
        currentPlayer?.isBot &&
        currentPlayer?.isActive &&
        !currentPlayer?.hasStayed &&
        !currentPlayer?.hasBusted &&
        gameState?.gamePhase === 'playing'
      ) {
        // console.log(`[Bot ${currentPlayer.name}] Waiting... isAnimating=${isAnimating}`);
      }
      return;
    }

    // If signature matches, we are stable. Do NOT reset timer.
    if (currentSignature === signatureRef.current && timeoutRef.current) {
      // console.log(`[Bot ${currentPlayer.name}] Stable state, keeping timer...`);
      return;
    }

    // New state or signature changed -> Reset timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    signatureRef.current = currentSignature;

    // console.log(`[Bot ${currentPlayer.name}] Planning turn...`);

    // If targeting, handle targeting
    if (targetingState) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const {
          gameState: latestGameState,
          currentPlayer: latestPlayer,
          targetingState: latestTargeting,
          onTargetPlayer: latestOnTargetPlayer,
        } = latestStateRef.current;

        if (!latestGameState || !latestPlayer || !latestTargeting) return;

        // Derive sourceCard and validTargets
        const sourceCard =
          latestPlayer.hand.find((c) => c.id === latestTargeting.cardId) ||
          latestPlayer.reservedActions?.find((c) => c.id === latestTargeting.cardId);

        if (!sourceCard) return;

        let validTargets = latestGameState.players
          .filter((p) => p.isActive && p.id !== latestPlayer.id)
          .map((p) => p.id);

        // If no other active players, target self (Case 13)
        if (validTargets.length === 0) {
          validTargets = [latestPlayer.id];
        }

        handleBotTargeting(
          latestPlayer,
          latestGameState,
          {
            ...latestTargeting,
            sourceCard,
            validTargets,
          },
          latestOnTargetPlayer
        );
      }, 1000);
      return;
    }

    // Check for pending immediate actions (Turn Three, etc.)
    if (
      currentPlayer.pendingImmediateActionIds &&
      currentPlayer.pendingImmediateActionIds.length > 0
    ) {
      const actionId = currentPlayer.pendingImmediateActionIds[0];
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const { onStartTargeting: latestOnStart } = latestStateRef.current;
        latestOnStart(actionId, currentPlayer.id);
      }, 1000);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const {
        gameState: latestGameState,
        currentPlayer: latestPlayer,
        onHit: latestOnHit,
        onStay: latestOnStay,
      } = latestStateRef.current;
      if (latestPlayer && latestGameState) {
        handleBotTurn(latestPlayer, latestGameState, latestOnHit, latestOnStay);
      }
    }, 1000);

    // Cleanup only on unmount (or if we manually clear above)
    return () => {
      // We DON'T clear timeout here automatically anymore, because we want it to survive re-renders
    };
  }, [gameState, currentPlayer, isAnimating, isInputLocked, targetingState, onStartTargeting]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

const handleBotTurn = (
  bot: PlayerModel,
  gameState: GameState,
  onHit: () => void,
  onStay: () => void
) => {
  const difficulty = bot.botDifficulty || 'medium';
  let shouldHit = false;

  if (difficulty === 'easy') {
    shouldHit = Math.random() < 0.5;
  } else {
    // Calculate expectation
    // Medium: Green (Hand Only)
    // Hard: Blue (All Visible)
    // OMG: Purple (Perfect Memory)

    let effectiveDeck: CardModel[] = [];
    const fullDeck = getFullDeckTemplate();

    if (difficulty === 'omg') {
      // Purple: All cards seen since shuffle (Perfect Memory)
      // This is exactly what's in the draw pile (gameState.deck)
      // If deck is empty, we assume we know the discard pile is about to be reshuffled
      effectiveDeck = gameState.deck.length > 0 ? gameState.deck : gameState.discardPile || [];
    } else {
      // Green or Blue
      const knownCards: CardModel[] = [];

      // 1. Always remove current player's hand
      knownCards.push(...bot.hand);

      // 2. If Hard (Blue), remove other players' hands and top discard
      if (difficulty === 'hard') {
        gameState.players.forEach((p) => {
          if (p.id !== bot.id) {
            knownCards.push(...p.hand);
          }
        });
        if (gameState.discardPile.length > 0) {
          knownCards.push(gameState.discardPile[gameState.discardPile.length - 1]);
        }
      }

      // Subtract knownCards from fullDeck
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

    // Expectation returns { expectedScore, bustProbability, turn7Probability }
    // We want to know if the expected score AFTER hitting is greater than the CURRENT score.
    const currentScore = computeHandScore(bot.hand);
    shouldHit = expectation.expectedScore > currentScore;
  }

  // Execute
  if (shouldHit) {
    onHit();
  } else {
    onStay();
  }
};

const handleBotTargeting = (
  bot: PlayerModel,
  gameState: GameState,
  targetingState: { validTargets: string[]; sourceCard: CardModel },
  onTargetPlayer: (targetId: string) => void
) => {
  const difficulty = bot.botDifficulty || 'medium';
  const { validTargets, sourceCard } = targetingState;

  if (validTargets.length === 0) return;

  let targetId = validTargets[0];

  if (difficulty === 'easy') {
    targetId = validTargets[Math.floor(Math.random() * validTargets.length)];
  } else {
    // Medium/Hard/OMG
    const actionType = sourceCard.rank; // Lock, TurnThree, LifeSaver

    if (actionType === 'LifeSaver') {
      // Help underdog (lowest total score)
      // Filter valid targets to find the one with lowest totalScore
      const targets = gameState.players.filter((p) => validTargets.includes(p.id));
      targets.sort((a, b) => {
        const scoreA = getTargetScore(a, difficulty);
        const scoreB = getTargetScore(b, difficulty);
        return scoreA - scoreB;
      });
      if (targets.length > 0) targetId = targets[0].id;
    } else {
      // Lock or TurnThree: Disadvantage leader (highest total score)
      const targets = gameState.players.filter((p) => validTargets.includes(p.id));
      targets.sort((a, b) => {
        const scoreA = getTargetScore(a, difficulty);
        const scoreB = getTargetScore(b, difficulty);
        return scoreB - scoreA;
      });
      if (targets.length > 0) targetId = targets[0].id;
    }
  }

  onTargetPlayer(targetId);
};

const getTargetScore = (player: PlayerModel, difficulty: string) => {
  const base = player.totalScore || 0;
  if (difficulty === 'medium') return base;
  // Hard/OMG: include current round score (if not busted)
  const current = player.hasBusted ? 0 : player.roundScore || 0;
  return base + current;
};
