import React, { useState, useEffect, useMemo } from 'react';
import { GameBoard, GameState, ClientGameStateManager } from '@turn-seven/engine';
import { FlipSevenLogic } from '../logic/game';

export const FlipSevenGame: React.FC = () => {
  // Memoize the game logic and state manager so they are not recreated on every render.
  const gameLogic = useMemo(() => new FlipSevenLogic(), []);
  const clientManager = useMemo(() => {
    // Kicking off a single player game as per the plan.
    const initialState = gameLogic.createInitialState(['player1']);
    return new ClientGameStateManager(initialState);
  }, [gameLogic]);

  const [gameState, setGameState] = useState<GameState>(clientManager.getState());

  useEffect(() => {
    const unsubscribe = clientManager.subscribe(setGameState);
    return () => unsubscribe();
  }, [clientManager]);

  const handleHit = () => {
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, { type: 'HIT' });
    clientManager.setState(newState);
  };

  const handleStay = () => {
    const currentState = clientManager.getState();
    const newState = gameLogic.performAction(currentState, { type: 'STAY' });
    clientManager.setState(newState);
  };
  
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

  return (
    <div className="flip-seven-game">
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
            clientManager.setState(next);
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
            clientManager.setState(reset);
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
