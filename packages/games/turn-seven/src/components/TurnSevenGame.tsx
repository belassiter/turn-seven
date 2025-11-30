import React, { useState, useEffect, useMemo } from 'react';
import { GameBoard, GameState, ClientGameStateManager } from '@turn-seven/engine';
import { TurnSevenLogic, MIN_PLAYERS } from '../logic/game';
import { GameSetup } from './GameSetup';

export const TurnSevenGame: React.FC = () => {
  // Memoize the game logic and state manager so they are not recreated on every render.
  const gameLogic = useMemo(() => new TurnSevenLogic(), []);
  const [clientManager, setClientManager] = useState<ClientGameStateManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!clientManager) return;
    const unsubscribe = clientManager.subscribe(s => setGameState(s));
    // initialize local state
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
    // show setup screen
    return (
      <div className="turn-seven-game">
        <h1>Turn Seven</h1>
        <GameSetup onStart={handleStart} />
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

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
        <h2>{currentPlayer?.name}'s Turn</h2>
        <button onClick={handleHit} disabled={!!currentPlayer?.hasStayed || !currentPlayer?.isActive || !!currentPlayer?.hasBusted}>Hit</button>
        <button onClick={handleStay} disabled={!!currentPlayer?.hasStayed || !!currentPlayer?.hasBusted}>Stay</button>
      </div>
    </div>
  );
};
