import { useEffect, useRef } from 'react';
import { GameState, PlayerModel } from '@turn-seven/engine';
import { decideMove, decideTarget } from '../logic/bot-logic';

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
      return;
    }

    // If signature matches, we are stable. Do NOT reset timer.
    if (currentSignature === signatureRef.current && timeoutRef.current) {
      return;
    }

    // New state or signature changed -> Reset timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    signatureRef.current = currentSignature;

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

        const sourceCard =
          latestPlayer.hand.find((c) => c.id === latestTargeting.cardId) ||
          latestPlayer.reservedActions?.find((c) => c.id === latestTargeting.cardId);

        if (!sourceCard) return;

        let validTargets = latestGameState.players
          .filter((p) => p.isActive && p.id !== latestPlayer.id)
          .map((p) => p.id);

        if (validTargets.length === 0) {
          validTargets = [latestPlayer.id];
        }

        const targetId = decideTarget(latestPlayer, latestGameState, {
          sourceCard,
          validTargets,
        });

        latestOnTargetPlayer(targetId);
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

    // Default turn action: Hit or Stay
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const {
        gameState: latestGameState,
        currentPlayer: latestPlayer,
        onHit: latestOnHit,
        onStay: latestOnStay,
      } = latestStateRef.current;

      if (latestPlayer && latestGameState) {
        const move = decideMove(latestPlayer, latestGameState);
        if (move.type === 'HIT') {
          latestOnHit();
        } else {
          latestOnStay();
        }
      }
    }, 1000);

    return () => {
      // Cleanup only on unmount
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
