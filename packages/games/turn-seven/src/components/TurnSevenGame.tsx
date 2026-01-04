import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GameState,
  Card as CardComponent,
  CardModel,
  IGameService,
  IRemoteGameService,
  RemoteGameService,
  Lobby,
  LobbyState,
  GameEvent,
} from '@turn-seven/engine';
import { LocalGameService } from '../services/gameService';
import { GameSetup, PlayerSetup } from './GameSetup';
import { RemoteSetup } from './RemoteSetup';
import { useActionTargeting } from '../hooks/useActionTargeting';
import { useBotPlayer } from '../hooks/useBotPlayer';
import { computeHitExpectation, getFullDeckTemplate } from '../logic/odds';
import { computeHandScore } from '@turn-seven/engine';
import { getPlayerColor, getDifficultyColor } from '../utils/colors';

const ANIMATION_DELAY = import.meta.env.MODE === 'test' ? 50 : 1000;

type OddsMode = 'off' | 'green' | 'blue' | 'purple';

// Layout Components
// import { GameHeader } from './GameHeader'; // Removed
import { GameFooter } from './GameFooter';
import { PlayerSidebar } from './PlayerSidebar';
import { MobilePlayerDrawer } from './MobilePlayerDrawer';
import { PlayerHud } from './PlayerHud';
import { ActivePlayerHand } from './ActivePlayerHand';
import { CardGalleryModal } from './CardGalleryModal';
import { LedgerModal } from './LedgerModal';
import { RulesModal } from './RulesModal';
import { AnimatePresence, motion } from 'framer-motion';
import { GameOverlayAnimation, OverlayAnimationType } from './GameOverlayAnimation';

// Helper to reconstruct deck state before a batch of draws
const reconstructDeck = (finalDeck: CardModel[], events: GameEvent[]): CardModel[] => {
  const deck = [...finalDeck];
  // Process events in reverse order
  // Only care about DRAW events that pulled from the deck
  const drawEvents = events.filter((e) => e.type === 'DRAW');
  for (let i = drawEvents.length - 1; i >= 0; i--) {
    if (drawEvents[i].card) {
      deck.push(drawEvents[i].card!);
    }
  }
  return deck;
};

// Helper to rewind state for initial load animation
const rewindInitialState = (finalState: GameState): GameState => {
  const state = structuredClone(finalState);
  const events = state.lastTurnEvents || [];

  // 1. Reconstruct Deck
  state.deck = reconstructDeck(finalState.deck, events);

  // 2. Remove drawn cards from hands
  events.forEach((e) => {
    if (e.type === 'DRAW' && e.card && e.playerId) {
      const p = state.players.find((p) => p.id === e.playerId);
      if (p) {
        p.hand = p.hand.filter((c) => c.id !== e.card!.id);
        if (p.reservedActions) {
          p.reservedActions = p.reservedActions.filter((c) => c.id !== e.card!.id);
        }
      }
    }
  });

  return state;
};

export const TurnSevenGame: React.FC<{ initialGameState?: GameState }> = ({ initialGameState }) => {
  // Mode Selection State
  const [gameMode, setGameMode] = useState<'local' | 'remote' | null>(null);
  const [gameService, setGameService] = useState<IGameService | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [initialGameCode, setInitialGameCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameCode = params.get('game');
    if (gameCode) {
      setInitialGameCode(gameCode);
      setGameMode('remote');
    } else {
      setGameMode((prev) => (prev ? prev : 'local'));
    }
  }, []);

  // Initialize Local Service if initialGameState is provided (Testing/Dev)
  useEffect(() => {
    if (initialGameState && !gameService) {
      setGameMode('local');
      setGameService(new LocalGameService({ initialState: initialGameState }));
    }
  }, [initialGameState, gameService]);

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

  const [oddsMode, setOddsMode] = useState<OddsMode>('off');
  const [showRules, setShowRules] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Event Processing State
  const [processingEventIndex, setProcessingEventIndex] = useState<number>(-1);
  const [targetRealState, setTargetRealState] = useState<GameState | null>(null);

  // Ref to track immediate processing state to prevent rapid-fire actions
  const isProcessingRef = useRef(false);

  const isHost = useMemo(() => {
    if (gameMode === 'local') return true;
    if (!lobbyState || !localPlayerId) return false;
    const player = lobbyState.players.find((p) => p.id === localPlayerId);
    return player?.isHost ?? false;
  }, [gameMode, lobbyState, localPlayerId]);

  // Queue for animations that should play AFTER a card deal
  // const pendingOverlayRef = useRef<OverlayAnimationType | null>(null);
  // const isDealingLargeBatch = useRef<boolean>(false);
  // const lastAnimatedLog = useRef<string>('');

  // Use visualGameState for rendering logic
  const gameState = visualGameState;

  // Handlers for Game Setup
  const handleLocalStart = useCallback((players: PlayerSetup[]) => {
    const service = new LocalGameService();
    setGameService(service);
    service.start(players);
    // For local games, assume the local client is the first player (p1)
    setLocalPlayerId('p1');
  }, []);

  const handleRemoteCreate = useCallback(async (name: string) => {
    const service = new RemoteGameService();
    try {
      await service.createGame(name);
      setGameService(service);
      setLocalPlayerId('p1'); // Host is p1
      service.subscribeToLobby(setLobbyState);
    } catch (e) {
      console.error(e);
      alert('Failed to create game');
      setGameService(null);
    }
  }, []);

  const handleRemoteJoin = useCallback(async (gameId: string, name: string) => {
    const service = new RemoteGameService();
    try {
      const playerId = await service.joinGame(gameId, name);
      setGameService(service);
      setLocalPlayerId(playerId);
      service.subscribeToLobby(setLobbyState);
    } catch (e) {
      console.error(e);
      alert('Failed to join game');
      setGameService(null);
    }
  }, []);

  const handleRemoteStart = useCallback(async () => {
    if (gameService && lobbyState?.players) {
      const count = lobbyState.players.length;
      if (count < 3 || count > 18) {
        alert('Player limit: 3-18 players. Please remove excess players and try again.');
        return;
      }
      // For remote games, we just signal start. The backend handles config from the lobby state.
      const configs = lobbyState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        botDifficulty: p.botDifficulty || 'medium',
      }));
      await gameService.start(configs);
    }
  }, [gameService, lobbyState]);

  const handleAddBot = useCallback(async () => {
    if (gameService && 'addBot' in gameService) {
      // Cast to IRemoteGameService or check capability
      // Since we know we are in remote mode, gameService is RemoteGameService
      await (gameService as IRemoteGameService).addBot(lobbyState?.gameId || '');
    }
  }, [gameService, lobbyState]);

  const handleUpdateBotDifficulty = useCallback(
    async (botId: string, difficulty: string) => {
      if (gameService && 'updateBotDifficulty' in gameService) {
        const svc = gameService as IRemoteGameService;
        if (svc.updateBotDifficulty) {
          await svc.updateBotDifficulty(lobbyState?.gameId || '', botId, difficulty);
        }
      }
    },
    [gameService, lobbyState]
  );

  const handleRemovePlayer = useCallback(
    async (playerId: string) => {
      if (!gameService) return;
      try {
        // Prefer service-level removePlayer (updates lobby directly) when available
        if ('removePlayer' in gameService) {
          const svc = gameService as IRemoteGameService;
          if (svc.removePlayer) {
            await svc.removePlayer(lobbyState?.gameId || '', playerId);
          } else {
            await gameService.sendAction({ type: 'REMOVE_PLAYER', payload: { playerId } });
          }
        } else {
          await gameService.sendAction({ type: 'REMOVE_PLAYER', payload: { playerId } });
        }
      } catch (e) {
        console.error('Remove player failed', e);
      }
    },
    [gameService, lobbyState?.gameId]
  );

  // Effect to handle being kicked from lobby
  useEffect(() => {
    if (gameMode === 'remote' && lobbyState && localPlayerId) {
      const player = lobbyState.players.find((p) => p.id === localPlayerId);
      if (!player) {
        // We were removed from the lobby
        setGameService(null);
        setLobbyState(null);
      }
    }
  }, [gameMode, lobbyState, localPlayerId]);

  // Memoize potentially expensive odds/expectation calculation
  const hitStats = useMemo(() => {
    if (oddsMode === 'off' || !realGameState) return null;
    const current = realGameState.players.find((p) => p.id === realGameState.currentPlayerId);
    const activeCountLocal = realGameState.players.filter((p) => p.isActive).length;

    let effectiveDeck: CardModel[] = [];

    if (oddsMode === 'purple') {
      // Purple: All cards seen since shuffle (Perfect Memory)
      // This is exactly what's in the draw pile (gameState.deck)
      // If deck is empty, we assume we know the discard pile is about to be reshuffled
      effectiveDeck =
        realGameState.deck.length > 0 ? realGameState.deck : realGameState.discardPile || [];
    } else {
      // Green (Hand Only) or Blue (All Visible)
      // Start with a full fresh deck
      const fullDeck = getFullDeckTemplate();

      // Determine which cards are "known" and should be removed from the full deck
      const knownCards: CardModel[] = [];

      // 1. Always remove current player's hand
      if (current) {
        knownCards.push(...current.hand);
      }

      // 2. If Blue, remove other players' hands and top discard
      if (oddsMode === 'blue') {
        // Other players
        realGameState.players.forEach((p) => {
          if (p.id !== current?.id) {
            knownCards.push(...p.hand);
          }
        });
        // Top discard
        if (realGameState.discardPile.length > 0) {
          knownCards.push(realGameState.discardPile[realGameState.discardPile.length - 1]);
        }
      }

      // Now subtract knownCards from fullDeck by matching Rank+Suit
      // We use a frequency map to handle duplicates correctly
      const deckCounts = new Map<string, number>();
      fullDeck.forEach((c) => {
        const key = `${c.suit}:${c.rank}`;
        deckCounts.set(key, (deckCounts.get(key) || 0) + 1);
      });

      // Decrement for known cards
      knownCards.forEach((c) => {
        const key = `${c.suit}:${c.rank}`;
        const count = deckCounts.get(key);
        if (count && count > 0) {
          deckCounts.set(key, count - 1);
        }
      });

      // Reconstruct effective deck
      fullDeck.forEach((c) => {
        const key = `${c.suit}:${c.rank}`;
        const count = deckCounts.get(key);
        if (count && count > 0) {
          effectiveDeck.push(c);
          deckCounts.set(key, count - 1);
        }
      });
    }

    return computeHitExpectation(current?.hand, effectiveDeck, activeCountLocal);
  }, [oddsMode, realGameState]);

  const { targetingState, startTargeting, cancelTargeting, confirmTarget } =
    useActionTargeting(gameService);

  // Subscribe to game service
  useEffect(() => {
    if (!gameService) return;
    const unsubscribe = gameService.subscribe((s) => {
      setRealGameState(s);
      // If this is a local game service, allow the local UI to act as the current player
      if (gameService instanceof LocalGameService) {
        setLocalPlayerId(s.currentPlayerId || null);
      }
    });
    // If gameService has state, set it immediately
    const currentState = gameService.getState();
    if (currentState) {
      setRealGameState(currentState);
      if (gameService instanceof LocalGameService) {
        setLocalPlayerId(currentState.currentPlayerId || null);
      }
    }
    return () => unsubscribe();
  }, [gameService]);

  // Animation Sequencing Logic
  useEffect(() => {
    if (!realGameState) return;

    // Initial load
    if (!visualGameState) {
      // Check if we have initial deal events to animate
      if (
        realGameState.roundNumber === 1 &&
        realGameState.lastTurnEvents?.some((e) => e.type === 'DRAW')
      ) {
        const startState = rewindInitialState(realGameState);
        setVisualGameState(startState);
        setTargetRealState(realGameState);
        setProcessingEventIndex(0);
      } else {
        setVisualGameState(realGameState);
      }
      return;
    }

    // If states are identical, do nothing
    if (realGameState === visualGameState) return;

    // Check if we need to start processing events
    if (targetRealState !== realGameState) {
      // New state arrived
      if (realGameState.lastTurnEvents && realGameState.lastTurnEvents.length > 0) {
        setTargetRealState(realGameState);
        setProcessingEventIndex(0);
      } else {
        // No events (e.g. Stay, or legacy). Snap to state.
        setVisualGameState(realGameState);
      }
    }
  }, [realGameState, visualGameState, targetRealState]);

  // Event Processor
  useEffect(() => {
    if (!targetRealState || processingEventIndex === -1) return;

    const events = targetRealState.lastTurnEvents || [];

    if (processingEventIndex >= events.length) {
      // Done processing events. Snap to final state to ensure consistency.
      setVisualGameState(targetRealState);
      setProcessingEventIndex(-1);
      setTargetRealState(null);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const event = events[processingEventIndex];
    let animationDuration = ANIMATION_DELAY;

    // Side effect containers
    let overlayToTrigger: OverlayAnimationType | null = null;
    let cardToReveal: CardModel | null = null;
    let drawRevealDuration = 600;

    // Apply event to visualGameState
    const nextState = structuredClone(visualGameState);
    if (!nextState) return;

    // Helper to find player index
    const getPlayerIdx = (id: string) => nextState.players.findIndex((p) => p.id === id);

    let updateVisualState = true;

    switch (event.type) {
      case 'DRAW': {
        const pIdx = getPlayerIdx(event.playerId!);
        if (pIdx !== -1) {
          // Set revealed card for animation
          cardToReveal = event.card!;
          // Ensure current player is the one drawing (for camera focus)
          if (nextState.currentPlayerId !== event.playerId) {
            nextState.currentPlayerId = event.playerId!;
          }

          // Don't add to hand yet in visual state
          updateVisualState = true; // Update currentPlayerId immediately

          // Request 5: Add 0.5s pause after flip (reveal) before moving to hand.
          // Original was 600ms. New is 600ms + 500ms = 1100ms.
          drawRevealDuration = import.meta.env.MODE === 'test' ? 50 : 1100;
          animationDuration = Math.max(
            animationDuration,
            drawRevealDuration + (import.meta.env.MODE === 'test' ? 20 : 900)
          ); // Ensure total delay covers it
        }
        break;
      }
      case 'DISCARD': {
        const pIdx = getPlayerIdx(event.playerId!);
        if (pIdx !== -1) {
          // Remove from hand
          nextState.players[pIdx].hand = nextState.players[pIdx].hand.filter(
            (c) => c.id !== event.card!.id
          );
          // Add to discard
          nextState.discardPile.push(event.card!);
        }
        break;
      }
      case 'BUST': {
        const pIdx = getPlayerIdx(event.playerId!);
        if (pIdx !== -1) {
          nextState.players[pIdx].hasBusted = true;
          nextState.players[pIdx].isActive = false;
          // Flip cards
          nextState.players[pIdx].hand.forEach((c) => (c.isFaceUp = false));
        }
        overlayToTrigger = 'bust';
        animationDuration = 2000;
        break;
      }
      case 'TURN_SEVEN': {
        overlayToTrigger = 'turn7';
        animationDuration = 2000;
        break;
      }
      case 'PLAY_CARD': {
        const pIdx = getPlayerIdx(event.playerId!);
        if (pIdx !== -1) {
          // Remove from hand
          nextState.players[pIdx].hand = nextState.players[pIdx].hand.filter(
            (c) => c.id !== event.card!.id
          );
          // If it was reserved, remove it too
          if (nextState.players[pIdx].reservedActions) {
            nextState.players[pIdx].reservedActions = nextState.players[
              pIdx
            ].reservedActions!.filter((c) => c.id !== event.card!.id);
          }

          if (String(event.card!.rank) === 'Lock') {
            if (event.targetId) {
              nextState.currentPlayerId = event.targetId; // Switch view to target
              const tIdx = getPlayerIdx(event.targetId);
              if (tIdx !== -1) nextState.players[tIdx].isLocked = true;
            }
            overlayToTrigger = 'lock';
            animationDuration = 2000;
          } else if (String(event.card!.rank) === 'TurnThree') {
            if (event.targetId) {
              nextState.currentPlayerId = event.targetId; // Switch view to target
            }
            overlayToTrigger = 'turn3';
            animationDuration = 2000;
          } else if (String(event.card!.rank) === 'LifeSaver') {
            // Request 3: Do NOT play animation here. Only on LIFE_SAVED event.
            // playOverlayAnimation('lifesaver');
          }
        }
        break;
      }
      case 'SHUFFLE_DISCARD': {
        // Move discard to deck
        nextState.deck = [...nextState.discardPile];
        nextState.discardPile = [];
        break;
      }
      case 'NEW_ROUND': {
        nextState.players.forEach((p) => {
          p.hand = [];
          p.roundScore = 0;
          p.hasBusted = false;
          p.isLocked = false;
          p.hasStayed = false;
          p.reservedActions = [];
        });
        // Request 2: Ensure game phase is playing so modal closes
        nextState.gamePhase = 'playing';

        // Fix: Reconstruct deck for the start of the round so subsequent DRAW animations work
        if (targetRealState) {
          const remainingEvents = events.slice(processingEventIndex + 1);
          nextState.deck = reconstructDeck(targetRealState.deck, remainingEvents);
        }
        break;
      }
      case 'LIFE_SAVED': {
        overlayToTrigger = 'lifesaver';
        animationDuration = 2000;
        const pIdx = getPlayerIdx(event.playerId!);
        if (pIdx !== -1 && event.cards) {
          const cardIds = event.cards.map((c) => c.id);
          nextState.players[pIdx].hand = nextState.players[pIdx].hand.filter(
            (c) => !cardIds.includes(c.id)
          );
          // Add to discard
          nextState.discardPile.push(...event.cards);
        }
        break;
      }
      case 'TRANSFER': {
        const sourceIdx = getPlayerIdx(event.playerId!);
        const targetIdx = event.targetId ? getPlayerIdx(event.targetId) : -1;

        if (sourceIdx !== -1 && targetIdx !== -1 && event.card) {
          // Remove from source (if not already removed by PLAY_CARD)
          nextState.players[sourceIdx].hand = nextState.players[sourceIdx].hand.filter(
            (c) => c.id !== event.card!.id
          );
          if (nextState.players[sourceIdx].reservedActions) {
            nextState.players[sourceIdx].reservedActions = nextState.players[
              sourceIdx
            ].reservedActions!.filter((c) => c.id !== event.card!.id);
          }

          // Add to target
          nextState.players[targetIdx].hand.push(event.card!);

          // Switch view to target
          nextState.currentPlayerId = event.targetId!;
        }
        break;
      }
    }

    // Request 1: Pause before moving to next player
    // Fix: Ensure visualGameState is not null before accessing properties
    const isPlayerSwitch =
      visualGameState && nextState.currentPlayerId !== visualGameState.currentPlayerId;
    // User explicitly requested delay on all deals/switches, including initial deal
    const switchDelay = isPlayerSwitch ? (import.meta.env.MODE === 'test' ? 50 : 1000) : 0;
    // If we switch players, wait for rotation (approx 600ms) before starting action
    const rotationDelay = isPlayerSwitch ? (import.meta.env.MODE === 'test' ? 20 : 600) : 0;
    const actionStartDelay = switchDelay + rotationDelay;

    const updateTimer = setTimeout(() => {
      if (updateVisualState) {
        setVisualGameState(nextState);
      }
    }, switchDelay);

    const sideEffectTimer = setTimeout(() => {
      if (overlayToTrigger) {
        setOverlayAnimation({ type: overlayToTrigger, onComplete: () => {} });
      }

      if (cardToReveal) {
        setRevealedDeckCard(cardToReveal);
        // Schedule the card addition
        setTimeout(() => {
          setVisualGameState((prevState) => {
            if (!prevState) return prevState;
            const newState = structuredClone(prevState);
            const pIdx = newState.players.findIndex((p) => p.id === event.playerId);
            if (pIdx !== -1) {
              newState.players[pIdx].hand.push(event.card!);
              if (newState.deck.length > 0) newState.deck.pop();
            }
            return newState;
          });
          setRevealedDeckCard(null);
        }, drawRevealDuration);
      }
    }, actionStartDelay);

    const nextEventTimer = setTimeout(() => {
      if (event.type !== 'DRAW') {
        setRevealedDeckCard(null);
        setOverlayAnimation(null); // Clear overlay
        setProcessingEventIndex((i) => i + 1);
      } else {
        // For DRAW, we wait for the animation to complete
        setOverlayAnimation(null);
        setProcessingEventIndex((i) => i + 1);
      }
    }, actionStartDelay + animationDuration);

    return () => {
      clearTimeout(updateTimer);
      clearTimeout(sideEffectTimer);
      clearTimeout(nextEventTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingEventIndex, targetRealState]);

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
    if (isInputLocked || !gameService || isProcessingRef.current) return;
    // Double check game service state
    if (!gameService.getState()) {
      console.error('Attempted to hit but game service has no state');
      // Force reset to setup screen if we are in a bad state
      setRealGameState(null);
      setVisualGameState(null);
      return;
    }

    isProcessingRef.current = true;
    setIsPending(true);
    try {
      await gameService.sendAction({ type: 'HIT' });
    } catch (e) {
      console.error('Hit action failed:', e);
      // If error is "Game not started", reset UI
      if (e instanceof Error && e.message === 'Game not started') {
        setRealGameState(null);
        setVisualGameState(null);
      }
    } finally {
      setIsPending(false);
      isProcessingRef.current = false;
    }
  }, [gameService, isInputLocked]);

  const handleStay = useCallback(async () => {
    if (isInputLocked || !gameService || isProcessingRef.current) return;
    if (!gameService.getState()) {
      console.error('Attempted to stay but game service has no state');
      setRealGameState(null);
      setVisualGameState(null);
      return;
    }

    isProcessingRef.current = true;
    setIsPending(true);
    try {
      await gameService.sendAction({ type: 'STAY' });
    } catch (e) {
      console.error('Stay action failed:', e);
      if (e instanceof Error && e.message === 'Game not started') {
        setRealGameState(null);
        setVisualGameState(null);
      }
    } finally {
      setIsPending(false);
      isProcessingRef.current = false;
    }
  }, [gameService, isInputLocked]);

  useBotPlayer({
    gameState: realGameState,
    currentPlayer: realGameState?.players.find((p) => p.id === realGameState.currentPlayerId),
    isAnimating,
    isInputLocked,
    isHost,
    targetingState,
    onStartTargeting: startTargeting,
    onHit: handleHit,
    onStay: handleStay,
    onTargetPlayer: confirmTarget,
  });

  const handleNextRound = useCallback(async () => {
    if (!gameService) return;
    setIsPending(true);
    try {
      await gameService.sendAction({ type: 'NEXT_ROUND' });
    } finally {
      setIsPending(false);
    }
  }, [gameService]);

  // Auto-advance rounds if all players are bots
  useEffect(() => {
    if (!realGameState || realGameState.gamePhase !== 'ended') return;

    const allBots = realGameState.players.every((p) => p.isBot);
    if (allBots) {
      const timer = setTimeout(() => {
        handleNextRound();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [realGameState, handleNextRound]);

  const handleNewGame = useCallback(() => {
    if (gameService) {
      gameService.reset();
    }
    setRealGameState(null);
    setVisualGameState(null);
    setRevealedDeckCard(null);
    setOverlayAnimation(null);
    setIsAnimating(false);
    setIsPending(false);
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
      // Ensure local player is the current player (for remote play)
      if (localPlayerId && currentPlayer.id !== localPlayerId) return;

      if (currentPlayer.isBot) return;
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
  }, [
    gameState,
    currentPlayer,
    hasPendingActions,
    handleHit,
    handleStay,
    isInputLocked,
    localPlayerId,
  ]);

  // --- Render Helpers ---

  if (!gameState) {
    // 1. Remote Lobby / Loading (Active Remote Game Service)
    if (gameMode === 'remote' && gameService) {
      if (lobbyState) {
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
                paddingTop: 16,
                paddingBottom: 16,
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <div
                className="turn-seven-game-setup"
                style={{
                  padding: 0,
                  maxWidth: 600,
                  width: '95%',
                  margin: '0 auto',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <button
                  className="btn-icon-toggle"
                  onClick={() => setShowRules(true)}
                  title="Rules"
                  style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
                >
                  ❓
                </button>
                <div style={{ padding: '16px 32px 0 32px', flexShrink: 0, textAlign: 'center' }}>
                  <img
                    src="/logo.png"
                    alt="Turn Seven"
                    style={{ height: 100, marginBottom: 12, maxWidth: '100%' }}
                  />
                </div>
                <Lobby
                  gameId={lobbyState.gameId}
                  players={lobbyState.players}
                  isHost={!!lobbyState.players.find((p) => p.id === localPlayerId && p.isHost)}
                  onStartGame={handleRemoteStart}
                  onAddBot={handleAddBot}
                  onUpdateBotDifficulty={handleUpdateBotDifficulty}
                  onCopyInviteLink={() =>
                    navigator.clipboard.writeText(
                      window.location.origin + '?game=' + lobbyState.gameId
                    )
                  }
                  currentPlayerId={localPlayerId || undefined}
                  onRemovePlayer={handleRemovePlayer}
                />
              </div>
            </div>
            <GameFooter />
            {showRules && <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />}
          </div>
        );
      }
      // Loading state for remote
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-yellow-400"></div>
        </div>
      );
    }

    // 2. Unified Setup Screen (No active game service)
    const activeTab = gameMode === 'remote' ? 'remote' : 'local';

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
            paddingTop: 16,
            paddingBottom: 16,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            className="turn-seven-game-setup"
            style={{
              padding: 0,
              maxWidth: 600,
              width: '95%',
              margin: '0 auto',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              position: 'relative',
            }}
          >
            <button
              className="btn-icon-toggle"
              onClick={() => setShowRules(true)}
              title="Rules"
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
            >
              ❓
            </button>
            <div style={{ padding: '16px 32px 0 32px', flexShrink: 0, textAlign: 'center' }}>
              <img
                src="/logo.png"
                alt="Turn Seven"
                style={{ height: 100, marginBottom: 12, maxWidth: '100%' }}
              />

              <div className="setup-tabs" style={{ marginBottom: 0 }}>
                <button
                  className={`setup-tab ${activeTab === 'local' ? 'active' : ''}`}
                  onClick={() => setGameMode('local')}
                >
                  Local Game
                </button>
                <button
                  className={`setup-tab ${activeTab === 'remote' ? 'active' : ''}`}
                  onClick={() => setGameMode('remote')}
                >
                  Online Game
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {activeTab === 'local' ? (
                <GameSetup onStart={handleLocalStart} />
              ) : (
                <RemoteSetup
                  onCreateGame={handleRemoteCreate}
                  onJoinGame={handleRemoteJoin}
                  initialGameCode={initialGameCode}
                />
              )}
            </div>
          </div>
        </div>

        <GameFooter />
        {showRules && <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />}

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
    if (!currentPlayer || !gameService) return;
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

    // Only show reserved actions if we are the current player
    if (localPlayerId && currentPlayer.id !== localPlayerId) return null;

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
    if (oddsMode === 'off') return null;
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

      <div className="desktop-only">
        <PlayerSidebar
          players={gameState.players}
          currentPlayerId={gameState.currentPlayerId ?? undefined}
          isTargetingMode={!!targetingState || hasPendingActions}
          targetingActorId={currentPlayer?.id}
          onTargetPlayer={handleSidebarTargetClick}
        />
      </div>

      <MobilePlayerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        players={gameState.players}
        currentPlayerId={gameState.currentPlayerId ?? undefined}
        isTargetingMode={!!targetingState || hasPendingActions}
        targetingActorId={currentPlayer?.id}
        onTargetPlayer={handleSidebarTargetClick}
      />

      <div className="game-main-area">
        {/* Mobile Status Bar */}
        <div className="mobile-status-bar mobile-only">
          {/* Row 1: Round | Logo | Buttons */}
          <div className="mobile-status-row-1">
            <div className="mobile-round-badge">
              <span
                className="round-badge-large"
                style={{ fontSize: '0.9rem', padding: '4px 8px' }}
              >
                Round {gameState.roundNumber}
              </span>
            </div>
            <div className="mobile-logo-container">
              <img src="/logo.png" alt="Turn Seven" style={{ height: 40 }} />
            </div>
            <div className="mobile-status-buttons">
              <button
                className="btn-icon-toggle"
                onClick={() => setShowLedger(true)}
                title="Game Ledger"
              >
                📜
              </button>
              <button className="btn-icon-toggle" onClick={() => setShowRules(true)} title="Rules">
                ❓
              </button>
            </div>
          </div>

          {/* Row 2: Deck/Discard | Previous Turn Summary */}
          <div className="mobile-status-row-2">
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
            <div className="last-action-log mobile-log">
              {gameState.previousTurnLog ? <p>{gameState.previousTurnLog}</p> : null}
            </div>
          </div>
        </div>

        {/* Top Status Bar */}
        <div className="game-status-bar desktop-only">
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
              {/* Odds Button - Commented out per request
              <button
                className={`btn-icon-toggle ${oddsMode !== 'off' ? 'active' : ''}`}
                style={{
                  background:
                    oddsMode === 'green'
                      ? '#22c55e'
                      : oddsMode === 'blue'
                      ? '#3b82f6'
                      : oddsMode === 'purple'
                      ? '#a855f7'
                      : undefined,
                  color: oddsMode !== 'off' ? 'white' : undefined,
                  borderColor: oddsMode !== 'off' ? 'transparent' : undefined,
                }}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOddsMode((prev) => {
                    if (prev === 'off') return 'green';
                    if (prev === 'green') return 'blue';
                    if (prev === 'blue') return 'purple';
                    return 'off';
                  });
                }}
                title={`Odds Mode: ${
                  oddsMode === 'off'
                    ? 'White'
                    : oddsMode.charAt(0).toUpperCase() + oddsMode.slice(1)
                }`}
                aria-label={`Odds Mode: ${oddsMode === 'off' ? 'White' : oddsMode}`}
              >
                🎲
              </button>
              */}
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
                  <span
                    style={{
                      color:
                        currentPlayer.isBot && currentPlayer.botDifficulty
                          ? getDifficultyColor(currentPlayer.botDifficulty)
                          : getPlayerColor(currentPlayer.name, currentPlayer.isBot || false),
                    }}
                  >
                    {currentPlayer.name}
                  </span>
                  &apos;s Turn
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
                style={{
                  marginTop: 20,
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: 20,
                  pointerEvents:
                    currentPlayer?.isBot || currentPlayer?.id !== localPlayerId ? 'none' : 'auto',
                }}
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
                        id="btn-hit"
                        className="btn btn-primary"
                        onClick={handleHit}
                        disabled={
                          isInputLocked ||
                          !!currentPlayer.hasStayed ||
                          !currentPlayer.isActive ||
                          !!currentPlayer.hasBusted ||
                          (gameState.deck.length === 0 && gameState.discardPile.length === 0) ||
                          currentPlayer.id !== localPlayerId
                        }
                        title={
                          gameState.deck.length === 0 && gameState.discardPile.length === 0
                            ? 'No cards left to draw'
                            : 'Draw a card'
                        }
                      >
                        Hit
                      </button>
                      <button
                        id="btn-stay"
                        className="btn btn-secondary"
                        onClick={handleStay}
                        disabled={
                          isInputLocked ||
                          !!currentPlayer.hasStayed ||
                          !!currentPlayer.hasBusted ||
                          currentPlayer.id !== localPlayerId
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

      <PlayerHud
        players={gameState.players}
        currentPlayerId={gameState.currentPlayerId ?? undefined}
        onPlayerClick={() => setIsDrawerOpen(true)}
      />

      <GameFooter />
      {showGallery && <CardGalleryModal onClose={() => setShowGallery(false)} />}
      {showLedger && gameState && (
        <LedgerModal
          isOpen={showLedger}
          onClose={() => setShowLedger(false)}
          ledger={gameState.ledger || []}
          players={gameState.players}
        />
      )}
      {showRules && <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />}

      {/* Overlays for Round End / Game Over */}
      {gameState.gamePhase === 'ended' && (
        <div className="overlay-container">
          <div className="overlay-content" style={{ fontSize: '0.9rem', padding: '16px' }}>
            <h2>Round Results</h2>
            <ul style={{ textAlign: 'left', paddingLeft: '10px' }}>
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
                      <strong
                        style={{
                          color:
                            p.isBot && p.botDifficulty
                              ? getDifficultyColor(p.botDifficulty)
                              : getPlayerColor(p.name, p.isBot || false),
                        }}
                      >
                        {p.name}
                      </strong>{' '}
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
                {gameState.winnerId ? (
                  <span
                    style={{
                      color: (() => {
                        const w = gameState.players.find((p) => p.id === gameState.winnerId);
                        if (!w) return 'inherit';
                        return w.isBot && w.botDifficulty
                          ? getDifficultyColor(w.botDifficulty)
                          : getPlayerColor(w.name, w.isBot || false);
                      })(),
                    }}
                  >
                    {gameState.players.find((p) => p.id === gameState.winnerId)?.name}
                  </span>
                ) : (
                  '—'
                )}
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
                        <span
                          style={{
                            color:
                              p.isBot && p.botDifficulty
                                ? getDifficultyColor(p.botDifficulty)
                                : getPlayerColor(p.name, p.isBot || false),
                          }}
                        >
                          {p.name}
                        </span>
                        : {p.totalScore ?? 0} points {medal}
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
