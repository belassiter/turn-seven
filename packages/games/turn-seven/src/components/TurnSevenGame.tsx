import React, { useState, useEffect, useMemo } from 'react';
import { GameBoard, GameState, ClientGameStateManager } from '@turn-seven/engine';
import { TurnSevenLogic, MIN_PLAYERS } from '../logic/game';
import { GameSetup } from './GameSetup';
import { useActionTargeting } from '../hooks/useActionTargeting';

export const TurnSevenGame: React.FC = () => {
  const gameLogic = useMemo(() => new TurnSevenLogic(), []);
  const [clientManager, setClientManager] = useState<ClientGameStateManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  const { 
    targetingState, 
    startTargeting, 
    cancelTargeting, 
    confirmTarget 
  } = useActionTargeting(clientManager, gameLogic);

  useEffect(() => {
    if (!clientManager) return;
    const unsubscribe = clientManager.subscribe(s => setGameState(s));
    setGameState(clientManager.getState());
    return () => unsubscribe();
  }, [clientManager]);

  const handleHit = () => {
    if (!clientManager) return;
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, { type: 'HIT' });
    clientManager.setState(newState);
  };

  const handleStay = () => {
    if (!clientManager) return;
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, { type: 'STAY' });
    clientManager.setState(newState);
  };

  const handleStart = (names: string[]) => {
    const initialState = gameLogic.createInitialStateFromNames(names);
    const mgr = new ClientGameStateManager(initialState);
    setClientManager(mgr);
  };

  if (!gameState) {
    return (
      <div className="turn-seven-game">
        <h1>Turn Seven</h1>
        <GameSetup onStart={handleStart} />
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
  const hasPendingActions = currentPlayer?.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0;

  const handlePlayPendingAction = (cardId: string, targetId: string) => {
    if (!clientManager || !currentPlayer) return;
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, {
      type: 'PLAY_ACTION',
      payload: {
        actorId: currentPlayer.id,
        cardId: cardId,
        targetId,
      },
    });
    clientManager.setState(newState);
  };

  const renderPendingActionUI = () => {
    if (!hasPendingActions || !currentPlayer) return null;
    const pendingId = currentPlayer.pendingImmediateActionIds![0];
    const pendingCard = currentPlayer.reservedActions?.find(c => c.id === pendingId);
    
    if (!pendingCard) return null;

    const cardName = String(pendingCard.rank).replace(/([a-z])([A-Z])/g, '$1 $2');

    return (
      <div className="pending-action-ui">
        <h3>Action Required</h3>
        <p>Choose an active player to receive the <strong>{cardName}</strong></p>
        <div className="player-selection">
          {gameState.players.map(p => {
             if (!p.isActive) return null;
             return (
               <button key={p.id} onClick={() => handlePlayPendingAction(pendingId, p.id)}>
                 {p.name}{p.id === currentPlayer.id ? ' (self)' : ''}
               </button>
             );
          })}
        </div>
      </div>
    );
  };

  const renderReservedActions = () => {
    if (hasPendingActions) return null; // Hide normal reserved actions if pending action exists
    if (!currentPlayer || !currentPlayer.reservedActions || currentPlayer.reservedActions.length === 0) return null;
    return (
      <div className="reserved-actions">
        <h3>Reserved Actions</h3>
        {currentPlayer.reservedActions.map(a => (
          <div key={a.id} className="reserved-action">
            <span>{String(a.rank).replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
            <button onClick={() => startTargeting(a.id, currentPlayer.id)}>Play</button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="turn-seven-game">
      <h1>Turn Seven</h1>
      <GameBoard
        players={gameState.players}
        currentPlayerId={gameState.currentPlayerId ?? undefined}
        deck={gameState.deck}
        discardPile={gameState.discardPile}
      />
      {gameState.gamePhase === 'ended' && (
        <div className="round-results">
          <h2>Round Results</h2>
          <ul>
            {gameState.players.map(p => (
              <li key={p.id}>{p.name}: Round {p.roundScore ?? 0} pts — Total {p.totalScore ?? 0} pts {p.hasBusted ? '(Busted)' : ''}</li>
            ))}
          </ul>
          <button onClick={() => {
            const next = gameLogic.startNextRound(gameState);
            if (clientManager) clientManager.setState(next);
          }}>Next Round</button>
        </div>
      )}
      {gameState.gamePhase === 'gameover' && (
        <div className="game-over">
          <h2>Game Over</h2>
          <p>
            Winner: { (gameState as any).winnerId ? gameState.players.find(p => p.id === (gameState as any).winnerId)?.name : '—' }
          </p>
          <p>Final Scores:</p>
          <ul>
            {gameState.players.map(p => (
              <li key={p.id}>{p.name}: {p.totalScore ?? 0} pts</li>
            ))}
          </ul>
          <button onClick={() => {
            const reset = gameLogic.resetGame(gameState);
            if (clientManager) clientManager.setState(reset);
          }}>Restart Game</button>
        </div>
      )}
      <div className="actions">
        {gameState.gamePhase === 'playing' && (
          <>
            <h2>{currentPlayer?.name}'s Turn</h2>
            {!hasPendingActions && (
              <>
                <button onClick={handleHit} disabled={!!currentPlayer?.hasStayed || !currentPlayer?.isActive || !!currentPlayer?.hasBusted}>Hit</button>
                <button onClick={handleStay} disabled={!!currentPlayer?.hasStayed || !!currentPlayer?.hasBusted}>Stay</button>
              </>
            )}
            {hasPendingActions ? renderPendingActionUI() : renderReservedActions()}
            {targetingState && (
              <div className="action-targeting">
                <h4>Select target for action</h4>
                {gameState.players.map(p => (
                  <button key={p.id} onClick={() => confirmTarget(p.id)} disabled={!p.isActive && p.id !== targetingState.actorId}>
                    {p.name}{p.id === targetingState.actorId ? ' (self)' : ''}
                  </button>
                ))}
                <button onClick={cancelTargeting}>Cancel</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
