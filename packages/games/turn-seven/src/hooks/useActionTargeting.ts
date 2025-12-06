import { useState } from 'react';
import { IGameService } from '../services/gameService';

export interface TargetingState {
  cardId: string;
  actorId: string;
}

export const useActionTargeting = (gameService: IGameService | null) => {
  const [targetingState, setTargetingState] = useState<TargetingState | null>(null);

  const startTargeting = (cardId: string, actorId: string) => {
    setTargetingState({ cardId, actorId });
  };

  const cancelTargeting = () => {
    setTargetingState(null);
  };

  const confirmTarget = async (targetId: string) => {
    if (!gameService || !targetingState) return;
    await gameService.sendAction({
      type: 'PLAY_ACTION',
      payload: {
        actorId: targetingState.actorId,
        cardId: targetingState.cardId,
        targetId,
      },
    });
    setTargetingState(null);
  };

  return {
    targetingState,
    startTargeting,
    cancelTargeting,
    confirmTarget,
  };
};
