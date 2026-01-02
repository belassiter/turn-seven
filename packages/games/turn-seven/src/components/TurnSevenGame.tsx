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

  // Ref to track immediate processing state to prevent rapid-fire actions
  const isProcessingRef = useRef(false);

  const isHost = useMemo(() => {
    if (gameMode === 'local') return true;
    if (!lobbyState || !localPlayerId) return false;
    const player = lobbyState.players.find((p) => p.id === localPlayerId);
    return player?.isHost ?? false;
  }, [gameMode, lobbyState, localPlayerId]);

  // Queue for animations that should play AFTER a card deal
  const pendingOverlayRef = useRef<OverlayAnimationType | null>(null);
  const isDealingLargeBatch = useRef<boolean>(false);
  const lastAnimatedLog = useRef<string>('');

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

    if (isAnimating) {
      // console.log('Animation loop skipped: isAnimating=true');
      return;
    }

    const performStep = async () => {
      // console.log('Starting animation step...');
      setIsAnimating(true);

      const playOverlayAnimation = async (type: OverlayAnimationType) => {
        await new Promise<void>((resolve) => {
          let resolved = false;
          const safeResolve = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          setOverlayAnimation({ type, onComplete: safeResolve });
          // Fallback timeout in case animation gets stuck (e.g. tab backgrounded)
          setTimeout(safeResolve, 3000);
        });
        setOverlayAnimation(null);
      };

      try {
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

            await playOverlayAnimation('lock');

            // Update visual state to reflect lock so we don't loop
            const nextPlayers = [...visualGameState.players];
            nextPlayers[i] = { ...vp, isLocked: true };
            setVisualGameState({ ...visualGameState, players: nextPlayers });

            setIsAnimating(false);
            return;
          }
        }

        // 0.5. Check for removed cards (Discards/Transfers)
        // This handles cases where cards are removed from hand (e.g. Turn Three self-target discard)
        // We must process removals BEFORE additions to ensure correct hand state syncing
        let playerToRemoveIndex = -1;
        for (let i = 0; i < visualGameState.players.length; i++) {
          const vp = visualGameState.players[i];
          const rp = realGameState.players[i];
          // Check if vp has any card that rp does not have (by ID)
          const realIds = new Set(rp.hand.map((c) => c.id));
          if (vp.hand.some((c) => !realIds.has(c.id))) {
            playerToRemoveIndex = i;
            break;
          }
        }

        if (playerToRemoveIndex !== -1) {
          const vp = visualGameState.players[playerToRemoveIndex];
          const rp = realGameState.players[playerToRemoveIndex];
          const realIds = new Set(rp.hand.map((c) => c.id));
          const cardToRemove = vp.hand.find((c) => !realIds.has(c.id));

          if (cardToRemove) {
            // Animate removal
            const nextPlayers = [...visualGameState.players];
            nextPlayers[playerToRemoveIndex] = {
              ...vp,
              hand: vp.hand.filter((c) => c.id !== cardToRemove.id),
            };

            // Add to visual discard pile if not already there
            const nextDiscard = [...visualGameState.discardPile];
            if (!nextDiscard.some((c) => c.id === cardToRemove.id)) {
              nextDiscard.push({ ...cardToRemove, isFaceUp: true });
            }

            setVisualGameState({
              ...visualGameState,
              players: nextPlayers,
              discardPile: nextDiscard,
            });
            await new Promise((r) => setTimeout(r, ANIMATION_DELAY));
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

          // Check for Turn 3 Animation (if receiving 3+ cards at once OR if log indicates Turn 3)
          // We only trigger this once, before the first card of the batch is dealt
          const cardsNeeded = rp.hand.length - vp.hand.length;

          // Track if we are in a large deal sequence (e.g. initial deal of 7 cards)
          // We use 4 as threshold because a Turn 3 action can result in 4 cards (3 drawn + 1 returned)
          // and we still want to show the Turn 3 overlay in that case.
          if (cardsNeeded > 4) {
            isDealingLargeBatch.current = true;
          }
          if (cardsNeeded === 0) {
            isDealingLargeBatch.current = false;
          }

          const currentLog = realGameState.previousTurnLog || '';
          const isTurnThreeLog = currentLog.includes('played Turn Three');
          const isNewLog = currentLog !== lastAnimatedLog.current;

          if (
            (cardsNeeded >= 3 || (isTurnThreeLog && isNewLog && cardsNeeded > 0)) &&
            !isDealingLargeBatch.current
          ) {
            if (isTurnThreeLog) {
              lastAnimatedLog.current = currentLog;
            }
            await playOverlayAnimation('turn3');
            // Now proceed to deal the card
          }

          // Check if card exists in any other hand in visual state (Action Card Transfer)
          const existingCardOwner = visualGameState.players.find((p) =>
            p.hand.some((c) => c.id === newCard.id)
          );

          // Check if card is in discard pile (Returning Action Card)
          const inDiscard = visualGameState.discardPile.find((c) => c.id === newCard.id);

          if (existingCardOwner || inDiscard) {
            // Move directly (no deck animation)
            // We need to remove from old owner/discard and add to new owner in one step
            const nextPlayers = visualGameState.players.map((p, idx) => {
              if (existingCardOwner && p.id === existingCardOwner.id) {
                return { ...p, hand: p.hand.filter((c) => c.id !== newCard.id) };
              }
              if (p.id === vp.id) {
                // vp is the target player
                // Sync with real player state to capture pending actions
                return { ...realGameState.players[idx], hand: [...p.hand, newCard] };
              }
              return p;
            });

            let nextDiscard = visualGameState.discardPile;
            if (inDiscard) {
              nextDiscard = nextDiscard.filter((c) => c.id !== newCard.id);
            }

            const nextState = { ...visualGameState, players: nextPlayers, discardPile: nextDiscard };
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
          // IMPORTANT: Do not copy ...rp here, as it may contain future state flags (like hasBusted)
          // that we haven't animated yet. We only want to update the hand.
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
          await playOverlayAnimation(type);
          pendingOverlayRef.current = null;
        } else {
          // We iterate players to find changes
          for (let i = 0; i < visualGameState.players.length; i++) {
            const vp = visualGameState.players[i];
            const rp = realGameState.players[i];

            // Bust
            // Ensure we only show bust if we have synced the hand (no pending cards to deal)
            if (!vp.hasBusted && rp.hasBusted && rp.hand.length === vp.hand.length) {
              await playOverlayAnimation('bust');
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
              setRevealedDeckCard(null);

              // Animate Fly to Hand (Visual only - add temporarily)
              // FIX: Get drawn card from discard pile (it was just discarded)
              const drawnCard = realGameState.discardPile[realGameState.discardPile.length - 1];
              // Fallback if discard is empty (shouldn't happen)
              const cardToAnimate =
                drawnCard || ({ id: 'unknown', rank: '?', suit: 'number' } as CardModel);

              const tempHand = [...vp.hand, cardToAnimate];
              const tempPlayers = [...visualGameState.players];
              // Update hasLifeSaver to false immediately to prevent re-triggering this animation loop
              tempPlayers[i] = { ...vp, hand: tempHand, hasLifeSaver: false };
              setVisualGameState({
                ...visualGameState,
                players: tempPlayers,
                deck: visualGameState.deck.length > 0 ? visualGameState.deck.slice(0, -1) : [],
              });
              await new Promise((r) => setTimeout(r, ANIMATION_DELAY));

              await playOverlayAnimation('lifesaver');
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
              await playOverlayAnimation('turn7');
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
      } catch (error) {
        console.error('Animation error:', error);
        // Force sync to recover from error state
        if (realGameState) {
          setVisualGameState(realGameState);
        }
      } finally {
        // console.log('Animation step complete.');
        setIsAnimating(false);
      }
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
                }}
              >
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
            }}
          >
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
