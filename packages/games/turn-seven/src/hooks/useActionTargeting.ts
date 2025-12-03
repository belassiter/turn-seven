import { useState } from 'react';
import { ClientGameStateManager } from '@turn-seven/engine';
import { TurnSevenLogic } from '../logic/game';

export interface TargetingState {
  cardId: string;
  actorId: string;
}

export const useActionTargeting = (
  clientManager: ClientGameStateManager | null,
  gameLogic: TurnSevenLogic
) => {
  const [targetingState, setTargetingState] = useState<TargetingState | null>(null);

  const startTargeting = (cardId: string, actorId: string) => {
    setTargetingState({ cardId, actorId });
  };

  const cancelTargeting = () => {
    setTargetingState(null);
  };

  const confirmTarget = (targetId: string) => {
    if (!clientManager || !targetingState) return;
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, {
      type: 'PLAY_ACTION',
      payload: {
        actorId: targetingState.actorId,
        cardId: targetingState.cardId,
        targetId
      }
    });
    clientManager.setState(newState);
    setTargetingState(null);
  };

  return {
    targetingState,
    startTargeting,
    cancelTargeting,
    confirmTarget
  };
};
