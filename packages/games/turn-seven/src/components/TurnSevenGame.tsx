import React, { useState, useEffect, useMemo } from 'react';
import { GameState, ClientGameStateManager, Card } from '@turn-seven/engine';
import { TurnSevenLogic } from '../logic/game';
import { GameSetup } from './GameSetup';
import { useActionTargeting } from '../hooks/useActionTargeting';
import { computeHitExpectation } from '../logic/odds';
import { computeHandScore } from '@turn-seven/engine';

// Layout Components
import { GameHeader } from './GameHeader';
import { GameFooter } from './GameFooter';
import { PlayerSidebar } from './PlayerSidebar';
import { ActivePlayerHand } from './ActivePlayerHand';

export const TurnSevenGame: React.FC = () => {
  const gameLogic = useMemo(() => new TurnSevenLogic(), []);
  const [clientManager, setClientManager] = useState<ClientGameStateManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Memoize potentially expensive odds/expectation calculation
  const hitStats = useMemo(() => {
    if (!showOdds || !gameState) return null;
    const current = gameState.players.find((p) => p.id === gameState.currentPlayerId);
    const activeCountLocal = gameState.players.filter((p) => p.isActive).length;
    return computeHitExpectation(current?.hand, gameState.deck, activeCountLocal);
  }, [showOdds, gameState]);

  const { targetingState, startTargeting, cancelTargeting, confirmTarget } = useActionTargeting(
    clientManager,
    gameLogic
  );

  useEffect(() => {
    if (!clientManager) return;
    const unsubscribe = clientManager.subscribe((s) => setGameState(s));
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

  // --- Render Helpers ---

  if (!gameState) {
    // Render without the header on setup — keep the footer visible at the bottom of the page.
    return (
      <div className="turn-seven-layout">
        <div
          style={{
            gridArea: 'main',
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            paddingTop: 48,
          }}
        >
          <div
            className="turn-seven-game-setup"
            style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img src="/logo.png" alt="Turn Seven Logo" style={{ height: 144 }} />
            </div>
            <GameSetup onStart={handleStart} />
          </div>
        </div>

        <GameFooter />
      </div>
    );
  }

  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId);
  const hasPendingActions =
    currentPlayer?.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0;

  // Action Handlers
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

  // If we are in targeting mode (either from reserved action or pending action),
  // clicking a player in the sidebar should trigger this.
  const handleSidebarTargetClick = (targetPlayerId: string) => {
    if (targetingState) {
      confirmTarget(targetPlayerId);
    } else if (hasPendingActions && currentPlayer) {
      // If we have a pending action, we are implicitly targeting for it.
      // However, the current UI for pending actions uses specific buttons.
      // We can adapt this to work with the sidebar if we track "pending action selection" state.
      // For now, let's keep the pending action UI explicit in the main area,
      // but we could wire this up later for better UX.
      const pendingId = currentPlayer.pendingImmediateActionIds![0];
      handlePlayPendingAction(pendingId, targetPlayerId);
    }
  };

  const renderPendingActionUI = () => {
    if (!hasPendingActions || !currentPlayer) return null;
    const pendingId = currentPlayer.pendingImmediateActionIds![0];
    const pendingCard = currentPlayer.reservedActions?.find((c) => c.id === pendingId);

    if (!pendingCard) return null;
    const cardName = String(pendingCard.rank).replace(/([a-z])([A-Z])/g, '$1 $2');

    return (
      <div className="pending-action-ui">
        <h3>⚠️ Action Required</h3>
        <p>
          Choose a player to receive the <strong>{cardName}</strong>
        </p>
        {/* Targeting should be done via the sidebar only — don't render per-player buttons here */}
        {/* Targets are chosen from the sidebar; a Cancel button here served no purpose so it's removed */}
      </div>
    );
  };

  const renderReservedActions = () => {
    if (hasPendingActions) return null;
    if (
      !currentPlayer ||
      !currentPlayer.reservedActions ||
      currentPlayer.reservedActions.length === 0
    )
      return null;
    return (
      <div className="reserved-actions" style={{ marginTop: 10 }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#6b7280' }}>
          Reserved Actions
        </h4>
        <div style={{ display: 'flex', gap: 10 }}>
          {currentPlayer.reservedActions.map((a) => (
            <button
              key={a.id}
              className="btn btn-secondary"
              onClick={() => startTargeting(a.id, currentPlayer.id)}
            >
              Play {String(a.rank)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOdds = () => {
    if (!showOdds) return null;
    const stats = hitStats ?? { expectedScore: 0, bustProbability: 0, turn7Probability: 0 };
    const expected = Math.round(stats.expectedScore);
    const current = Math.round(computeHandScore(currentPlayer?.hand ?? []));
    const diff = Math.round(expected - current);
    const diffText = diff >= 0 ? `(+${diff})` : `(${diff})`;
    const bustPct = Math.round((stats.bustProbability ?? 0) * 100);
    const t7 = stats.turn7Probability ?? 0;
    const t7Pct = Math.round(t7 * 100);

    return (
      <div className="odds-display">
        <strong>Stats:</strong> Exp. Score: {expected} {diffText} | Bust: {bustPct}%{' '}
        {t7 > 0 ? `| Turn 7: ${t7Pct}%` : ''}
      </div>
    );
  };

  return (
    <div className="turn-seven-layout">
      <GameHeader
        roundNumber={gameState.roundNumber}
        deckCount={gameState.deck.length}
        discardCount={gameState.discardPile.length}
        showOdds={showOdds}
        onToggleOdds={() => setShowOdds((s) => !s)}
        onOpenRules={() => setShowRules(true)}
      />

      <PlayerSidebar
        players={gameState.players}
        currentPlayerId={gameState.currentPlayerId ?? undefined}
        isTargetingMode={!!targetingState || hasPendingActions}
        targetingActorId={currentPlayer?.id}
        onTargetPlayer={handleSidebarTargetClick}
      />

      <div className="game-main-area">
        {/* Top Status Bar */}
        <div className="game-status-bar">
          <div className="status-bar-left">
            <span className="round-badge-large">Round {gameState.roundNumber}</span>
          </div>

          <div className="deck-discard-group">
            <div className="pile">
              <div className="card-back">
                <span className="back-label" style={{ fontSize: '1.5rem' }}>
                  T7
                </span>
              </div>
              <span>Deck ({gameState.deck.length})</span>
            </div>
            <div className="pile">
              {gameState.discardPile.length > 0 ? (
                <Card
                  card={{
                    ...gameState.discardPile[gameState.discardPile.length - 1],
                    isFaceUp: true,
                  }}
                />
              ) : (
                <div className="card-placeholder"></div>
              )}
              <span>Discard ({gameState.discardPile.length})</span>
            </div>
          </div>

          <div className="last-action-log">
            {gameState.previousTurnLog ? <p>{gameState.previousTurnLog}</p> : null}
          </div>
        </div>

        {/* Active Player Zone */}
        {gameState.gamePhase === 'playing' && currentPlayer && (
          <div className="active-player-zone">
            <div className="zone-header">
              <h2>{currentPlayer.name}&apos;s Turn</h2>
              <div className="current-score">
                Hand Score: {computeHandScore(currentPlayer.hand)}
                {currentPlayer.isLocked && <span style={{ marginLeft: 10 }}>🔒 Locked</span>}
              </div>
            </div>

            {/* Hand */}
            <ActivePlayerHand hand={currentPlayer.hand} />

            {/* Controls */}
            <div
              className="controls-area"
              style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}
            >
              {hasPendingActions ? (
                renderPendingActionUI()
              ) : (
                <>
                  <div className="action-bar">
                    <button
                      className="btn btn-primary"
                      onClick={handleHit}
                      disabled={
                        !!currentPlayer.hasStayed ||
                        !currentPlayer.isActive ||
                        !!currentPlayer.hasBusted
                      }
                    >
                      Hit
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleStay}
                      disabled={!!currentPlayer.hasStayed || !!currentPlayer.hasBusted}
                    >
                      Stay
                    </button>

                    {renderOdds()}
                  </div>

                  {renderReservedActions()}

                  {targetingState && (
                    <div
                      className="action-targeting"
                      style={{ marginTop: 10, padding: 10, background: '#fffbeb', borderRadius: 6 }}
                    >
                      <strong>Select a target from the sidebar...</strong>
                      <button
                        className="btn btn-secondary"
                        style={{ marginLeft: 10 }}
                        onClick={cancelTargeting}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <GameFooter />
      {showRules && (
        <div className="overlay-container">
          <div className="overlay-content">
            <h2>Quick Rules</h2>
            <p>
              Turn Seven is a fast-paced card game. Players try to collect up to 7 unique number
              cards to score points. Action cards (Lock, Turn Three, Life Saver) alter player turns
              and may require targeting other players. Modifier cards like +X and x2 affect scoring.
              At the end of each round, players&apos; cards are collected into the discard; the deck
              is preserved across rounds and reshuffled from discard when needed.
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowRules(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays for Round End / Game Over */}
      {gameState.gamePhase === 'ended' && (
        <div className="overlay-container">
          <div className="overlay-content">
            <h2>Round Results</h2>
            <ul>
              {gameState.players.map((p) => {
                const numberRanks = p.hand
                  .filter((h) => !h.suit || h.suit === 'number')
                  .map((h) => h.rank);
                const uniqueCount = new Set(numberRanks).size;
                const isTurnSeven = uniqueCount >= 7;
                return (
                  <li key={p.id}>
                    <strong>{p.name}</strong>: {p.roundScore ?? 0} pts
                    {p.hasBusted ? ' (Busted)' : ''}
                    {isTurnSeven ? ' (Turn 7!)' : ''}
                  </li>
                );
              })}
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => {
                const next = gameLogic.startNextRound(gameState);
                if (clientManager) clientManager.setState(next);
              }}
            >
              Start Next Round
            </button>
          </div>
        </div>
      )}

      {gameState.gamePhase === 'gameover' && (
        <div className="overlay-container">
          <div className="overlay-content">
            <h2>Game Over!</h2>
            <p>
              Winner:{' '}
              <strong>
                {gameState.winnerId
                  ? gameState.players.find((p) => p.id === gameState.winnerId)?.name
                  : '—'}
              </strong>
            </p>
            <h3>Final Scores</h3>
            <ul>
              {gameState.players.map((p) => (
                <li key={p.id}>
                  {p.name}: {p.totalScore ?? 0} pts
                </li>
              ))}
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => {
                const reset = gameLogic.resetGame(gameState);
                if (clientManager) clientManager.setState(reset);
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
