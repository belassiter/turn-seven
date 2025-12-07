import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GameState, Card as CardComponent, CardModel } from '@turn-seven/engine';
import { LocalGameService } from '../services/gameService';
import { GameSetup } from './GameSetup';
import { useActionTargeting } from '../hooks/useActionTargeting';
import { computeHitExpectation } from '../logic/odds';
import { computeHandScore } from '@turn-seven/engine';

// @ts-expect-error - import.meta.env is provided by Vite
const ANIMATION_DELAY = import.meta.env.MODE === 'test' ? 50 : 1000;

// Layout Components
// import { GameHeader } from './GameHeader'; // Removed
import { GameFooter } from './GameFooter';
import { PlayerSidebar } from './PlayerSidebar';
import { ActivePlayerHand } from './ActivePlayerHand';
import { CardGalleryModal } from './CardGalleryModal';
import { LedgerModal } from './LedgerModal';
import { AnimatePresence, motion } from 'framer-motion';
import { GameOverlayAnimation, OverlayAnimationType } from './GameOverlayAnimation';

export const TurnSevenGame: React.FC<{ initialGameState?: GameState }> = ({ initialGameState }) => {
  const gameService = useMemo(() => new LocalGameService(initialGameState), [initialGameState]);

  // Real state from the engine
  const [realGameState, setRealGameState] = useState<GameState | null>(null);

  // Visual state for rendering (lags behind real state for animations)
  const [visualGameState, setVisualGameState] = useState<GameState | null>(null);

  // Card currently being revealed on top of the deck
  const [revealedDeckCard, setRevealedDeckCard] = useState<CardModel | null>(null);

  // Overlay animation state
  const [overlayAnimation, setOverlayAnimation] = useState<{
    type: OverlayAnimationType;
    onComplete: () => void;
  } | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [showOdds, setShowOdds] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  // Queue for animations that should play AFTER a card deal
  const pendingOverlayRef = useRef<OverlayAnimationType | null>(null);

  // Use visualGameState for rendering logic
  const gameState = visualGameState;

  // Memoize potentially expensive odds/expectation calculation
  const hitStats = useMemo(() => {
    if (!showOdds || !gameState) return null;
    const current = gameState.players.find((p) => p.id === gameState.currentPlayerId);
    const activeCountLocal = gameState.players.filter((p) => p.isActive).length;
    // If deck is empty, we will reshuffle discard pile. Use discard pile for odds calculation in that case.
    const effectiveDeck = gameState.deck.length > 0 ? gameState.deck : gameState.discardPile || [];
    return computeHitExpectation(current?.hand, effectiveDeck, activeCountLocal);
  }, [showOdds, gameState]);

  const { targetingState, startTargeting, cancelTargeting, confirmTarget } =
    useActionTargeting(gameService);

  // Subscribe to game service
  useEffect(() => {
    const unsubscribe = gameService.subscribe((s) => {
      setRealGameState(s);
    });
    setRealGameState(gameService.getState());
    return () => unsubscribe();
  }, [gameService]);

  // Animation Sequencing Logic
  useEffect(() => {
    if (!realGameState) return;

    // Initial load
    if (!visualGameState) {
      // If it's the start of the game (Round 1), start with empty hands to animate the deal
      // We check if players have cards in real state but we want to show them being dealt
      if (realGameState.roundNumber === 1 && realGameState.players.some((p) => p.hand.length > 0)) {
        // Calculate total cards in hands to restore deck count for animation
        const totalCardsInHands = realGameState.players.reduce((sum, p) => sum + p.hand.length, 0);
        // Create dummy cards to pad the deck length
        const dummyCards = Array(totalCardsInHands).fill({
          id: 'dummy',
          suit: 'number',
          rank: 0,
          isFaceUp: false,
        });

        const emptyState = {
          ...realGameState,
          players: realGameState.players.map((p) => ({ ...p, hand: [] })),
          deck: [...realGameState.deck, ...dummyCards],
        };
        setVisualGameState(emptyState);
        return;
      }
      setVisualGameState(realGameState);
      return;
    }

    // If states are identical, do nothing
    if (
      JSON.stringify(realGameState) === JSON.stringify(visualGameState) &&
      !pendingOverlayRef.current
    )
      return;

    if (isAnimating) return;

    const performStep = async () => {
      setIsAnimating(true);

      // Check for Round Change
      if (realGameState.roundNumber > visualGameState.roundNumber) {
        // Reset visual hands to empty to trigger deal animation
        const resetState = {
          ...realGameState,
          players: realGameState.players.map((p) => ({ ...p, hand: [] })),
        };
        setVisualGameState(resetState);
        await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
        setIsAnimating(false);
        return;
      }

      // 0. Check for Pre-Deal Status Animations (Lock)
      // These should happen BEFORE dealing cards, as they are usually the result of an action
      for (let i = 0; i < visualGameState.players.length; i++) {
        const vp = visualGameState.players[i];
        const rp = realGameState.players[i];

        // Lock
        if (!vp.isLocked && rp.isLocked) {
          // Switch view to the locked player if not already
          if (visualGameState.currentPlayerId !== vp.id) {
            const switchState = {
              ...visualGameState,
              currentPlayerId: vp.id,
            };
            setVisualGameState(switchState);
            await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
            setIsAnimating(false);
            return;
          }

          await new Promise<void>((resolve) => {
            setOverlayAnimation({ type: 'lock', onComplete: resolve });
          });
          setOverlayAnimation(null);

          // Update visual state to reflect lock so we don't loop
          const nextPlayers = [...visualGameState.players];
          nextPlayers[i] = { ...vp, isLocked: true };
          setVisualGameState({ ...visualGameState, players: nextPlayers });

          setIsAnimating(false);
          return;
        }
      }

      // 1. Check for missing cards (Deal/Hit/Turn 3)
      let playerToUpdateIndex = -1;

      // Try to find the current visual player first to prioritize active player animations
      const currentVisualIdx = visualGameState.players.findIndex(
        (p) => p.id === visualGameState.currentPlayerId
      );
      if (currentVisualIdx !== -1) {
        const vp = visualGameState.players[currentVisualIdx];
        const rp = realGameState.players[currentVisualIdx];
        if (rp && rp.hand.length > vp.hand.length) {
          playerToUpdateIndex = currentVisualIdx;
        }
      }

      // If not current, find any player who needs a card
      if (playerToUpdateIndex === -1) {
        playerToUpdateIndex = visualGameState.players.findIndex((vp, idx) => {
          const rp = realGameState.players[idx];
          return rp && rp.hand.length > vp.hand.length;
        });
      }

      if (playerToUpdateIndex !== -1) {
        const vp = visualGameState.players[playerToUpdateIndex];
        const rp = realGameState.players[playerToUpdateIndex];
        const newCard = rp.hand[vp.hand.length]; // Next card to add

        // If the player receiving the card is NOT the current visual player,
        // switch turn to them first so we can see the deal animation
        if (vp.id !== visualGameState.currentPlayerId) {
          const switchState = {
            ...visualGameState,
            currentPlayerId: vp.id,
          };
          setVisualGameState(switchState);
          await new Promise((r) => setTimeout(r, ANIMATION_DELAY)); // Wait for turn switch
          setIsAnimating(false);
          return;
        }

        // Check for Turn 3 Animation (if receiving 3+ cards at once)
        // We only trigger this once, before the first card of the batch is dealt
        const cardsNeeded = rp.hand.length - vp.hand.length;
        if (cardsNeeded >= 3) {
          // We use a ref or just check if we haven't animated yet?
          // Actually, we can just trigger the animation and return.
          // But we need to know we've done it.
          // Since we return, the next loop will come back here.
          // We need a way to avoid infinite loop of animations.
          // However, the overlayAnimation state is separate.
          // We can check if overlayAnimation is active? No, it clears.
          // We can check if we just did it?
          // Or we can rely on the fact that we deal one card at a time.
          // If we trigger animation, we must NOT deal a card yet.
          // But then we'll be in the same state next time.
          // Solution: We can't store "animated" in visual state easily without polluting it.
          // Alternative: Trigger animation AND deal the first card in one go?
          // Or, just let the animation play, and inside the onComplete, we proceed?
          // But this is a useEffect loop.

          // Better approach:
          // If we detect Turn 3 condition, we play the animation using a Promise that blocks this function.
          // We don't return. We just await the animation.
          // But we only want to do it for the FIRST card of the 3.
          // How do we know it's the first?
          // We can check if the PREVIOUS hand length was exactly 3 less?
          // Or just check if cardsNeeded === 3 (assuming exactly 3 for Turn 3).
          // If cardsNeeded is 2, we've already dealt one.
          if (cardsNeeded === 3) {
            await new Promise<void>((resolve) => {
              setOverlayAnimation({
                type: 'turn3',
                onComplete: () => {
                  resolve();
                },
              });
            });
            setOverlayAnimation(null);
            // Now proceed to deal the card
          }
        }

        // Check if card exists in any other hand in visual state (Action Card Transfer)
        const existingCardOwner = visualGameState.players.find((p) =>
          p.hand.some((c) => c.id === newCard.id)
        );

        if (existingCardOwner) {
          // Move directly (no deck animation)
          // We need to remove from old owner and add to new owner in one step
          const nextPlayers = visualGameState.players.map((p) => {
            if (p.id === existingCardOwner.id) {
              return { ...p, hand: p.hand.filter((c) => c.id !== newCard.id) };
            }
            if (p.id === vp.id) {
              // vp is the target player
              return { ...p, hand: [...p.hand, newCard] };
            }
            return p;
          });

          const nextState = { ...visualGameState, players: nextPlayers };
          setVisualGameState(nextState);
          await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
          setIsAnimating(false);
          return;
        }

        // Animate Flip
        setRevealedDeckCard(newCard);
        await new Promise((r) => setTimeout(r, ANIMATION_DELAY));

        // Animate Fly (Add to hand)
        const nextPlayers = [...visualGameState.players];
        nextPlayers[playerToUpdateIndex] = {
          ...vp,
          hand: [...vp.hand, newCard],
        };

        // Check for Turn 7 Completion (trigger animation next loop)
        const prevUnique = new Set(
          vp.hand.filter((c) => !c.suit || c.suit === 'number').map((c) => c.rank)
        ).size;
        const nextUnique = new Set(
          nextPlayers[playerToUpdateIndex].hand
            .filter((c) => !c.suit || c.suit === 'number')
            .map((c) => c.rank)
        ).size;

        if (prevUnique < 7 && nextUnique >= 7) {
          pendingOverlayRef.current = 'turn7';
        }

        const nextState = {
          ...visualGameState,
          players: nextPlayers,
          // Decrement deck count visually if we drew from it
          deck: visualGameState.deck.length > 0 ? visualGameState.deck.slice(0, -1) : [],
        };

        setRevealedDeckCard(null);
        setVisualGameState(nextState);
        await new Promise((r) => setTimeout(r, ANIMATION_DELAY));

        setIsAnimating(false);
        return;
      }

      // 2. Check for Status Animations (Bust, LifeSaver, Turn 7)
      // We check if the status changed from false to true (or true to false for LifeSaver)

      if (pendingOverlayRef.current) {
        const type = pendingOverlayRef.current;
        await new Promise<void>((resolve) => {
          setOverlayAnimation({ type, onComplete: resolve });
        });
        setOverlayAnimation(null);
        pendingOverlayRef.current = null;
      } else {
        // We iterate players to find changes
        for (let i = 0; i < visualGameState.players.length; i++) {
          const vp = visualGameState.players[i];
          const rp = realGameState.players[i];

          // Bust
          if (!vp.hasBusted && rp.hasBusted) {
            await new Promise<void>((resolve) => {
              setOverlayAnimation({ type: 'bust', onComplete: resolve });
            });
            setOverlayAnimation(null);
            // We don't return here, we let the state sync happen below
            // But wait, if we don't sync, the loop will run again and see the same diff?
            // Yes. So we MUST sync the state or at least this property.
            // But we usually sync the whole state at step 4.
            // So we just await the animation, then fall through to step 4.
            break; // Only one animation per step
          }

          // Life Saver (Used)
          // Condition: Had it, lost it, didn't bust.
          if (vp.hasLifeSaver && !rp.hasLifeSaver && !rp.hasBusted) {
            // Simulate the draw that caused the save
            // The drawn card and the Life Saver are now in the discard pile (last 2 cards)
            // We need to animate the draw of the card that caused the save
            if (realGameState.discardPile && realGameState.discardPile.length >= 2) {
              const drawnCard = realGameState.discardPile[realGameState.discardPile.length - 2];
              // Animate Flip
              setRevealedDeckCard(drawnCard);
              await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
              setRevealedDeckCard(null);

              // Animate Fly to Hand (Visual only - add temporarily)
              const tempHand = [...vp.hand, drawnCard];
              const tempPlayers = [...visualGameState.players];
              tempPlayers[i] = { ...vp, hand: tempHand };
              setVisualGameState({
                ...visualGameState,
                players: tempPlayers,
                deck: visualGameState.deck.length > 0 ? visualGameState.deck.slice(0, -1) : [],
              });
              await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
            }

            await new Promise<void>((resolve) => {
              setOverlayAnimation({ type: 'lifesaver', onComplete: resolve });
            });
            setOverlayAnimation(null);
            break;
          }

          // Turn 7
          const vpUnique = new Set(
            vp.hand.filter((c) => !c.suit || c.suit === 'number').map((c) => c.rank)
          ).size;
          const rpUnique = new Set(
            rp.hand.filter((c) => !c.suit || c.suit === 'number').map((c) => c.rank)
          ).size;
          if (vpUnique < 7 && rpUnique >= 7) {
            await new Promise<void>((resolve) => {
              setOverlayAnimation({ type: 'turn7', onComplete: resolve });
            });
            setOverlayAnimation(null);
            break;
          }
        }
      }

      // 3. Check for Turn Change (if hands are synced)
      if (realGameState.currentPlayerId !== visualGameState.currentPlayerId) {
        setVisualGameState(realGameState);
        await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
        setIsAnimating(false);
        return;
      }

      // 4. Sync any other state (scores, card removals, etc)
      setVisualGameState(realGameState);
      setIsAnimating(false);
    };

    performStep();
  }, [realGameState, visualGameState, isAnimating]);

  const currentPlayer = gameState?.players.find((p) => p.id === gameState.currentPlayerId);
  const hasPendingActions =
    currentPlayer?.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0;

  // Calculate if state is desynced to lock input immediately
  const isStateDesync = useMemo(() => {
    if (!realGameState || !visualGameState) return false;
    return JSON.stringify(realGameState) !== JSON.stringify(visualGameState);
  }, [realGameState, visualGameState]);

  const isInputLocked = isPending || isAnimating || isStateDesync;

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

  const handleNextRound = useCallback(async () => {
    setIsPending(true);
    try {
      await gameService.startNextRound();
    } finally {
      setIsPending(false);
    }
  }, [gameService]);

  const handleNewGame = useCallback(() => {
    gameService.reset();
    setRealGameState(null);
    setVisualGameState(null);
  }, [gameService]);

  // Global Navigation Hotkeys (Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGallery) setShowGallery(false);
        if (showLedger) setShowLedger(false);
        if (showRules) setShowRules(false);
      } else if (e.key === 'Enter') {
        if (gameState?.gamePhase === 'ended') {
          handleNextRound();
        } else if (gameState?.gamePhase === 'gameover') {
          handleNewGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState?.gamePhase, showGallery, showLedger, showRules, handleNextRound, handleNewGame]);

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

        {/* Overlay Animations */}
        <AnimatePresence>
          {overlayAnimation && (
            <GameOverlayAnimation
              type={overlayAnimation.type}
              onComplete={overlayAnimation.onComplete}
            />
          )}
        </AnimatePresence>
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
            <div className="pile" style={{ position: 'relative', perspective: '1000px' }}>
              <div className="card face-down">
                <div className="card-back">
                  <span className="back-label" style={{ fontSize: '1.5rem' }}>
                    T7
                  </span>
                </div>
              </div>
              {revealedDeckCard && (
                <motion.div
                  layoutId={revealedDeckCard.id}
                  initial={{ rotateY: 180, scale: 0.8 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <CardComponent card={{ ...revealedDeckCard, isFaceUp: true }} />
                </motion.div>
              )}
              <span>Deck ({gameState.deck.length})</span>
            </div>
            <div className="pile">
              {gameState.discardPile.length > 0 ? (
                <CardComponent
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
              key={currentPlayer.id}
              className="active-player-zone"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
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
              <ActivePlayerHand
                hand={currentPlayer.hand}
                isBusted={currentPlayer.hasBusted}
                isLocked={currentPlayer.isLocked}
                hasStayed={currentPlayer.hasStayed}
              />

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
            <button className="btn btn-primary" onClick={handleNextRound}>
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
            <button className="btn btn-primary" onClick={handleNewGame}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Overlay Animations */}
      <AnimatePresence>
        {overlayAnimation && (
          <GameOverlayAnimation
            type={overlayAnimation.type}
            onComplete={overlayAnimation.onComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
