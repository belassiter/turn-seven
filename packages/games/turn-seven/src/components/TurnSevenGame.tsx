import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GameState, Card } from '@turn-seven/engine';
import { LocalGameService } from '../services/gameService';
import { GameSetup } from './GameSetup';
import { useActionTargeting } from '../hooks/useActionTargeting';
import { computeHitExpectation } from '../logic/odds';
import { computeHandScore } from '@turn-seven/engine';

// Layout Components
// import { GameHeader } from './GameHeader'; // Removed
import { GameFooter } from './GameFooter';
import { PlayerSidebar } from './PlayerSidebar';
import { ActivePlayerHand } from './ActivePlayerHand';
import { CardGalleryModal } from './CardGalleryModal';
import { LedgerModal } from './LedgerModal';
import { AnimatePresence, motion } from 'framer-motion';

export const TurnSevenGame: React.FC = () => {
  const gameService = useMemo(() => new LocalGameService(), []);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [showOdds, setShowOdds] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  // Memoize potentially expensive odds/expectation calculation
  const hitStats = useMemo(() => {
    if (!showOdds || !gameState) return null;
    const current = gameState.players.find((p) => p.id === gameState.currentPlayerId);
    const activeCountLocal = gameState.players.filter((p) => p.isActive).length;
    return computeHitExpectation(current?.hand, gameState.deck, activeCountLocal);
  }, [showOdds, gameState]);

  const { targetingState, startTargeting, cancelTargeting, confirmTarget } =
    useActionTargeting(gameService);

  useEffect(() => {
    const unsubscribe = gameService.subscribe((s) => {
      setGameState(s);
    });
    setGameState(gameService.getState());
    return () => unsubscribe();
  }, [gameService]);

  // Animation Lock Logic
  const prevPlayerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState) return;

    // If player changed, trigger animation lock
    if (prevPlayerIdRef.current !== gameState.currentPlayerId) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // 600ms lock for animations
      return () => clearTimeout(timer);
    }
    prevPlayerIdRef.current = gameState.currentPlayerId || null;
  }, [gameState]);

  const currentPlayer = gameState?.players.find((p) => p.id === gameState.currentPlayerId);
  const hasPendingActions =
    currentPlayer?.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0;

  const isInputLocked = isPending || isAnimating;

  const handleHit = useCallback(async () => {
    if (isInputLocked) return;
    setIsPending(true);
    try {
      await gameService.sendAction({ type: 'HIT' });
    } finally {
      setIsPending(false);
    }
  }, [gameService, isInputLocked]);

  const handleStay = useCallback(async () => {
    if (isInputLocked) return;
    setIsPending(true);
    try {
      await gameService.sendAction({ type: 'STAY' });
    } finally {
      setIsPending(false);
    }
  }, [gameService, isInputLocked]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState || gameState.gamePhase !== 'playing') return;
      // Ensure we are the active player (in local multiplayer, we always are if it's our turn)
      if (!currentPlayer || currentPlayer.id !== gameState.currentPlayerId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isInputLocked) return; // Ignore hotkeys when locked

      if (e.key.toLowerCase() === 'h') {
        if (
          !currentPlayer.hasStayed &&
          currentPlayer.isActive &&
          !currentPlayer.hasBusted &&
          !hasPendingActions
        ) {
          handleHit();
        }
      } else if (e.key.toLowerCase() === 's') {
        if (!currentPlayer.hasStayed && !currentPlayer.hasBusted && !hasPendingActions) {
          handleStay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentPlayer, hasPendingActions, handleHit, handleStay, isInputLocked]);

  const handleStart = async (names: string[]) => {
    setIsPending(true);
    try {
      await gameService.start(names);
    } finally {
      setIsPending(false);
    }
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

  // Action Handlers
  const handlePlayPendingAction = async (cardId: string, targetId: string) => {
    if (!currentPlayer) return;
    setIsPending(true);
    try {
      await gameService.sendAction({
        type: 'PLAY_ACTION',
        payload: {
          actorId: currentPlayer.id,
          cardId: cardId,
          targetId,
        },
      });
    } finally {
      setIsPending(false);
    }
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
      {/* Header Removed */}

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
            <img src="/logo.png" alt="Turn Seven Logo" style={{ height: 80, marginBottom: 4 }} />
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
                    // Ensure suit is present for correct styling
                    suit:
                      gameState.discardPile[gameState.discardPile.length - 1].suit ||
                      (gameState.discardPile[gameState.discardPile.length - 1].rank.match(/^\d+$/)
                        ? 'number'
                        : 'action'),
                  }}
                />
              ) : (
                <div className="card-placeholder"></div>
              )}
              <span>Discard ({gameState.discardPile.length})</span>
            </div>
          </div>

          <div className="status-bar-right">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn-icon-toggle"
                onClick={() => setShowLedger(true)}
                title="Game Ledger"
                aria-label="Game Ledger"
              >
                📜
              </button>
              <button
                className="btn-icon-toggle"
                onClick={() => setShowGallery(true)}
                title="Card Gallery"
                aria-label="Card Gallery"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 38,
                    background: '#1a4b8c',
                    borderRadius: 3,
                    border: '1px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img src="/logo.png" alt="" style={{ width: '80%', height: 'auto' }} />
                </div>
              </button>
              <button
                className={`btn-icon-toggle ${showOdds ? 'active' : ''}`}
                onClick={() => setShowOdds((s) => !s)}
                title={showOdds ? 'Hide Odds' : 'Show Odds'}
                aria-label={showOdds ? 'Hide Odds' : 'Show Odds'}
              >
                🎲
              </button>
              <button
                className="btn-icon-toggle"
                onClick={() => setShowRules(true)}
                title="Show Rules"
                aria-label="Show Rules"
              >
                ❓
              </button>
            </div>
            <div className="last-action-log">
              {gameState.previousTurnLog ? <p>{gameState.previousTurnLog}</p> : null}
            </div>
          </div>
        </div>

        {/* Active Player Zone */}
        <AnimatePresence mode="wait">
          {gameState.gamePhase === 'playing' && currentPlayer && (
            <motion.div
              key="active-player-zone"
              className="active-player-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="zone-header">
                <motion.h2
                  key={`${currentPlayer.id}-name`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentPlayer.name}&apos;s Turn
                </motion.h2>
                <div className="current-score">
                  Hand Score: {computeHandScore(currentPlayer.hand)}
                  {currentPlayer.isLocked && <span style={{ marginLeft: 10 }}>🔒 Locked</span>}
                </div>
              </div>

              {/* Hand */}
              <ActivePlayerHand hand={currentPlayer.hand} />

              {/* Controls */}
              <motion.div
                className="controls-area"
                style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}
                key={`${currentPlayer.id}-controls`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
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
                          isInputLocked ||
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
                        disabled={
                          isInputLocked || !!currentPlayer.hasStayed || !!currentPlayer.hasBusted
                        }
                      >
                        Stay
                      </button>

                      {renderOdds()}
                    </div>

                    {renderReservedActions()}

                    {targetingState && (
                      <div
                        className="action-targeting"
                        style={{
                          marginTop: 10,
                          padding: 10,
                          background: '#fffbeb',
                          borderRadius: 6,
                        }}
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GameFooter />
      {showGallery && <CardGalleryModal onClose={() => setShowGallery(false)} />}
      {showLedger && gameState && (
        <LedgerModal
          isOpen={showLedger}
          onClose={() => setShowLedger(false)}
          ledger={gameState.ledger || []}
        />
      )}
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
            <ul style={{ textAlign: 'left' }}>
              {gameState.players.map((p) => {
                // Calculate rank based on total score
                const sorted = [...gameState.players].sort(
                  (a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0)
                );
                const rankIndex = sorted.findIndex((sp) => sp.id === p.id);
                const rank = rankIndex + 1;
                const suffix = ['st', 'nd', 'rd'][((((rank + 90) % 100) - 10) % 10) - 1] || 'th';
                const rankText = `${rank}${suffix}`;

                const numberRanks = p.hand
                  .filter((h) => !h.suit || h.suit === 'number')
                  .map((h) => h.rank);
                const uniqueCount = new Set(numberRanks).size;
                const hasTurnSeven = uniqueCount >= 7;

                return (
                  <li key={p.id}>
                    <span>
                      <strong>{p.name}</strong>{' '}
                      {p.hasBusted ? '(Busted)' : hasTurnSeven ? '(Turn 7!)' : ''}. Scored{' '}
                      {p.roundScore ?? 0}. Total score: {p.totalScore ?? 0}. {rankText} place.
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setIsPending(true);
                try {
                  await gameService.startNextRound();
                } finally {
                  setIsPending(false);
                }
              }}
            >
              Start Next Round
            </button>
          </div>
        </div>
      )}

      {gameState.gamePhase === 'gameover' && (
        <div className="overlay-container">
          <div className="overlay-content" style={{ position: 'relative' }}>
            <button
              className="btn-icon-toggle"
              onClick={() => setShowLedger(true)}
              title="View Ledger"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                fontSize: '1.2rem',
              }}
            >
              📜
            </button>
            <h2>Game Over!</h2>
            <p style={{ fontSize: '1.25rem' }}>
              Winner:{' '}
              <strong>
                {gameState.winnerId
                  ? gameState.players.find((p) => p.id === gameState.winnerId)?.name
                  : '—'}
              </strong>{' '}
              🏆
            </p>
            <h3>Final Scores</h3>
            <ul>
              {[...gameState.players]
                .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
                .map((p, index) => {
                  let medal = '';
                  if (index === 0) medal = '🥇';
                  else if (index === 1) medal = '🥈';
                  else if (index === 2) medal = '🥉';

                  return (
                    <li key={p.id}>
                      <span>
                        {p.name}: {p.totalScore ?? 0} points {medal}
                      </span>
                    </li>
                  );
                })}
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => {
                gameService.reset();
                setGameState(null);
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
