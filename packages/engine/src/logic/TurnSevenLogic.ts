import { CardModel, PlayerModel } from '../types';
import { GameState, LedgerEntry } from '../state/gameState';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 18;

export interface PlayerConfig {
  id?: string;
  name: string;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'omg' | 'omniscient';
}

// We can define a generic interface for game logic
export interface IGameLogic {
  createInitialState(playerIds: string[]): GameState;
  performAction(state: GameState, action: { type: string; payload?: unknown }): GameState;
}

// Implementation for Turn Seven
export class TurnSevenLogic implements IGameLogic {
  private readonly WIN_SCORE = 200;

  createInitialState(playerIds: string[]): GameState {
    const deck = this.createDeck();
    const players = playerIds.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      hand: [] as CardModel[],
      hasStayed: false,
      isLocked: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasLifeSaver: false,
    }));

    const ledger: LedgerEntry[] = [];

    // Deal one card to each player to start, resolving Action cards immediately.
    // If a player already received a card (e.g. as a target of an earlier action),
    // that counts as their initial card and we should not deal another.
    this.continueDealing({
      players,
      deck,
      discardPile: [],
      currentPlayerId: playerIds[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    });

    return {
      players,
      deck,
      discardPile: [],
      currentPlayerId:
        players.find((p) => p.pendingImmediateActionIds?.length > 0)?.id || playerIds[0] || null,
      roundStarterId: playerIds[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    };
  }

  public createInitialStateFromConfig(configs: PlayerConfig[]): GameState {
    // generate ids from names with a suffix index to ensure uniqueness
    const ids = configs.map((c, i) => c.id || `p${i + 1}`);
    const deck = this.createDeck();
    const players = configs.map((config, index) => ({
      id: ids[index],
      name: config.name || `Player ${index + 1}`,
      isBot: config.isBot,
      botDifficulty: config.botDifficulty,
      hand: [] as CardModel[],
      hasStayed: false,
      isLocked: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasLifeSaver: false,
    }));

    const ledger: LedgerEntry[] = [];

    // Deal one card to each player and resolve action cards immediately.
    this.continueDealing({
      players,
      deck,
      discardPile: [],
      currentPlayerId: ids[0] || null,
      roundStarterId: ids[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    });

    return {
      players,
      deck,
      discardPile: [],
      currentPlayerId:
        players.find((p) => p.pendingImmediateActionIds?.length > 0)?.id || ids[0] || null,
      roundStarterId: ids[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    };
  }

  private createDeck(): CardModel[] {
    const deck: CardModel[] = [];
    let idCounter = 0;

    // numbers 12 down to 1
    for (let value = 12; value >= 1; value--) {
      const count = value;
      for (let i = 0; i < count; i++) {
        deck.push({
          id: `card-${idCounter++}`,
          suit: 'number',
          rank: String(value),
          isFaceUp: false,
        });
      }
    }

    // single 0 card
    deck.push({ id: `card-${idCounter++}`, suit: 'number', rank: '0', isFaceUp: false });

    // Add modifier cards
    const modifiers = ['+2', '+4', '+6', '+8', '+10', 'x2'];
    for (const mod of modifiers) {
      deck.push({ id: `card-${idCounter++}`, suit: 'modifier', rank: mod, isFaceUp: false });
    }

    // Add action cards
    const actions = ['Lock', 'TurnThree', 'LifeSaver'];
    for (const action of actions) {
      for (let i = 0; i < 3; i++) {
        deck.push({ id: `card-${idCounter++}`, suit: 'action', rank: action, isFaceUp: false });
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  // Create initial state given player names (keeps provided names)
  public createInitialStateFromNames(names: string[]): GameState {
    // generate ids from names with a suffix index to ensure uniqueness
    const ids = names.map((n, i) => `p${i + 1}`);
    const deck = this.createDeck();
    const players = names.map((name, index) => ({
      id: ids[index],
      name: name || `Player ${index + 1}`,
      hand: [] as CardModel[],
      hasStayed: false,
      isLocked: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasLifeSaver: false,
    }));

    const ledger: LedgerEntry[] = [];

    // Deal one card to each player and resolve action cards immediately.
    this.continueDealing({
      players,
      deck,
      discardPile: [],
      currentPlayerId: ids[0] || null,
      roundStarterId: ids[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    });

    return {
      players,
      deck,
      discardPile: [],
      currentPlayerId:
        players.find((p) => p.pendingImmediateActionIds?.length > 0)?.id || ids[0] || null,
      roundStarterId: ids[0] || null,
      gamePhase: 'playing',
      roundNumber: 1,
      previousTurnLog: undefined,
      previousRoundScores: undefined,
      ledger,
    };
  }

  performAction(state: GameState, action: { type: string; payload?: unknown }): GameState {
    if (state.gamePhase !== 'playing' && action.type !== 'NEXT_ROUND') return state;

    switch (action.type) {
      case 'HIT':
        return this.handleHit(state);
      case 'STAY':
        return this.handleStay(state);
      case 'PLAY_ACTION':
        return this.handlePlayAction(
          state,
          action.payload as { actorId: string; cardId: string; targetId: string }
        );
      case 'NEXT_ROUND':
        return this.startNextRound(state);
      default:
        return state;
    }
  }

  // Handle a player's HIT action: draw top card and resolve basic effects
  private handleHit(state: GameState): GameState {
    // If no cards are available in deck or discard, a HIT is impossible.
    // Force the player to STAY instead to prevent an infinite loop.
    if ((state.deck?.length ?? 0) === 0 && (state.discardPile?.length ?? 0) === 0) {
      return this.handleStay(state);
    }

    const newState = structuredClone(state);
    const { players } = newState;
    const currentPlayerId = newState.currentPlayerId;
    const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return newState;

    // Case 19: Establish the "anchor" for turn order if not already set.
    // This ensures that if this hit triggers a chain of actions (e.g. drawing a Turn Three),
    // play eventually resumes from the player AFTER this one.
    if (!newState.turnOrderBaseId) {
      newState.turnOrderBaseId = currentPlayerId;
    }

    const currentPlayer = players[currentPlayerIndex];

    // If player has pending immediate actions, they must resolve them before hitting again.
    if (
      currentPlayer.pendingImmediateActionIds &&
      currentPlayer.pendingImmediateActionIds.length > 0
    ) {
      return newState;
    }

    const card = this.drawOne(newState);
    if (!card) return newState;

    let log = `${currentPlayer.name} hit: drew ${String(card.rank).replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    )}.`;

    let ledgerResult = `Drew ${String(card.rank).replace(/([a-z])([A-Z])/g, '$1 $2')}`;

    if (card.suit === 'action') {
      // Reserve action for later play and show a visible representation in hand for UI
      currentPlayer.reservedActions = currentPlayer.reservedActions || [];
      currentPlayer.reservedActions.push({ ...card, isFaceUp: true });
      currentPlayer.hand.push({ ...card, isFaceUp: true });

      // If it's Lock or TurnThree, it must be resolved immediately (cannot HIT/STAY until done)
      const rank = String(card.rank);
      if (rank === 'Lock' || rank === 'TurnThree') {
        currentPlayer.pendingImmediateActionIds = currentPlayer.pendingImmediateActionIds || [];
        currentPlayer.pendingImmediateActionIds.push(card.id);
      } else if (rank === 'LifeSaver') {
        // If player doesn't have one, they keep it automatically and turn ends (advances).
        // If they have one, it becomes pending (must give to someone else).
        if (!currentPlayer.hasLifeSaver) {
          currentPlayer.hasLifeSaver = true;
          // Remove from reservedActions since it's being kept as a passive buff, not an active action to play
          currentPlayer.reservedActions = currentPlayer.reservedActions.filter(
            (c) => c.id !== card.id
          );

          // Card stays in hand.
          // Turn ends for this player because they drew an action card?
          // Rules say "Action cards are resolved immediately".
          // Resolving Life Saver means keeping it.
          // Does turn end? User says "Play should just continue to the next player."
          // So we force turn advance.
          newState.previousTurnLog = log;
          this.addToLedger(newState, currentPlayer.name, 'Hit', ledgerResult);
          this.advanceTurn(newState);
          this.checkRoundEnd(newState);
          return newState;
        } else {
          // If they already have one, they must give it to someone else.
          // Check if there are any other eligible players (active and don't have Life Saver).
          const otherEligible = newState.players.some(
            (p) => p.id !== currentPlayer.id && p.isActive && !p.hasLifeSaver
          );

          if (otherEligible) {
            currentPlayer.pendingImmediateActionIds = currentPlayer.pendingImmediateActionIds || [];
            currentPlayer.pendingImmediateActionIds.push(card.id);
          } else {
            // No one to give it to. Discard it.
            // Remove from reservedActions and hand
            currentPlayer.reservedActions = currentPlayer.reservedActions.filter(
              (c) => c.id !== card.id
            );
            currentPlayer.hand = currentPlayer.hand.filter((c) => c.id !== card.id);
            newState.discardPile.push({ ...card, isFaceUp: true });

            newState.previousTurnLog = log + ' (Discarded Life Saver - no eligible targets)';
            this.addToLedger(
              newState,
              currentPlayer.name,
              'Hit',
              ledgerResult + ' (Discarded - no targets)'
            );
            this.advanceTurn(newState);
            this.checkRoundEnd(newState);
            return newState;
          }
        }
      }
    } else if (card.suit === 'modifier') {
      currentPlayer.hand.push({ ...card, isFaceUp: true });
    } else {
      // number card
      currentPlayer.hand.push({ ...card, isFaceUp: true });
      const duplicateCount = currentPlayer.hand.filter(
        (h) => (!h.suit || h.suit === 'number') && h.rank === card.rank
      ).length;
      if (duplicateCount > 1) {
        if (currentPlayer.hasLifeSaver) {
          // consume Life Saver and discard the duplicate drawn card
          currentPlayer.hand = currentPlayer.hand.filter((h) => h.id !== card.id);
          // Also remove the Life Saver card from hand
          const scIdx = currentPlayer.hand.findIndex(
            (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
          );
          if (scIdx !== -1) {
            const lifeSaverCard = currentPlayer.hand.splice(scIdx, 1)[0];
            newState.discardPile.push({ ...lifeSaverCard, isFaceUp: true });
          }
          newState.discardPile.push({ ...card, isFaceUp: true });

          log += ' Life Saved!';
          ledgerResult += '. Life Saved!';

          // Check if we have another Life Saver (e.g. pending)
          const hasAnother = currentPlayer.hand.some(
            (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
          );
          if (hasAnother) {
            // Activate it!
            currentPlayer.hasLifeSaver = true;
            // Find the card ID of the remaining Life Saver
            const otherLS = currentPlayer.hand.find(
              (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
            );
            if (otherLS) {
              if (currentPlayer.pendingImmediateActionIds) {
                currentPlayer.pendingImmediateActionIds =
                  currentPlayer.pendingImmediateActionIds.filter((id) => id !== otherLS.id);
              }
              if (currentPlayer.reservedActions) {
                currentPlayer.reservedActions = currentPlayer.reservedActions.filter(
                  (c) => c.id !== otherLS.id
                );
              }
            }
          } else {
            currentPlayer.hasLifeSaver = false;
          }
        } else {
          currentPlayer.hasBusted = true;
          currentPlayer.isActive = false;
          log += ' Busted!';
          ledgerResult += '. Busted!';
          // Flip this player's cards face-down when they bust
          if (currentPlayer.hand && currentPlayer.hand.length > 0) {
            currentPlayer.hand = currentPlayer.hand.map((c) => ({ ...c, isFaceUp: false }));
          }
        }
      }
    }

    // Check for Turn 7 condition for logging
    const numberRanks = currentPlayer.hand
      .filter((h) => !h.suit || h.suit === 'number')
      .map((h) => h.rank);
    const uniqueCount = new Set(numberRanks).size;
    if (uniqueCount >= 7) {
      log += ' Turn 7!';
    }

    newState.previousTurnLog = log;
    this.addToLedger(newState, currentPlayer.name, 'Hit', ledgerResult);

    // If the player has pending immediate actions (e.g. Lock/TurnThree target selection),
    // the turn does not advance yet. They must resolve the action.
    // Otherwise, whether they busted or successfully hit, the turn passes to the next player (Round-Robin).
    if (
      !currentPlayer.pendingImmediateActionIds ||
      currentPlayer.pendingImmediateActionIds.length === 0
    ) {
      // If we just finished resolving a pending action, we should check if there are MORE pending actions.
      // But `handlePlayAction` handles the removal.
      // If we are here, it means we are in `handleHit` or `handlePlayAction` (via recursive call or fallthrough).
      // Wait, `handlePlayAction` calls `advanceTurn` explicitly.
      // `handleHit` calls `advanceTurn` explicitly.
      // We need to make sure `handlePlayAction` doesn't advance if there are still pending actions.

      // This block is inside `handleHit`.
      this.advanceTurn(newState);
    }

    this.checkRoundEnd(newState);
    return newState;
  }

  // Helper to advance turn to next active player
  private advanceTurn(state: GameState) {
    const { players, currentPlayerId, turnOrderBaseId } = state;

    // Case 19: If we have a stored "base" for the turn order (from a complex action chain),
    // we calculate the next player relative to THAT player, not necessarily the current actor.
    const baseId = turnOrderBaseId || currentPlayerId;
    const baseIndex = players.findIndex((p) => p.id === baseId);

    // Clear the base ID as we are now advancing
    state.turnOrderBaseId = null;

    if (baseIndex === -1) return;

    const total = players.length;
    let found = false;
    for (let offset = 1; offset <= total; offset++) {
      const idx = (baseIndex + offset) % total;
      if (players[idx].isActive) {
        state.currentPlayerId = players[idx].id;
        found = true;
        break;
      }
    }

    if (!found) {
      this.computeScores(state);
      if (state.gamePhase !== 'gameover') state.gamePhase = 'ended';
      // Clear current player when the round ends so UI won't show action buttons
      state.currentPlayerId = null;
    }
  }

  // Play a reserved action card held by actorId against targetId
  private handlePlayAction(
    state: GameState,
    payload: { actorId: string; cardId: string; targetId: string }
  ): GameState {
    const newState = structuredClone(state);

    // Security Check: Ensure actor is the current player
    if (payload.actorId !== newState.currentPlayerId) {
      return newState;
    }

    const { players } = newState;
    const actorIndex = players.findIndex((p) => p.id === payload.actorId);
    const targetIndex = players.findIndex((p) => p.id === payload.targetId);
    if (actorIndex === -1 || targetIndex === -1) return newState;
    const actor = players[actorIndex];
    const target = players[targetIndex];

    // Validation: Cannot target inactive players (busted, stayed, locked)
    // Exception: Lock can target self if only one left? Rules say "Target any active player".
    // If target is not active, action fails.
    if (!target.isActive) {
      // Action fails, but we don't consume the card? Or do we?
      // If UI prevents it, this shouldn't happen.
      // If it happens, we should probably just return state unchanged.
      return newState;
    }

    actor.reservedActions = actor.reservedActions || [];
    const idx = actor.reservedActions.findIndex((c) => c.id === payload.cardId);
    if (idx === -1) return newState;

    // Validation: Life Saver cannot be played on self
    const cardToCheck = actor.reservedActions[idx];
    if (String(cardToCheck.rank) === 'LifeSaver' && actor.id === target.id) {
      return newState;
    }

    const card = actor.reservedActions.splice(idx, 1)[0];

    // Remove visible representation from actor.hand if present
    if (actor.hand) actor.hand = actor.hand.filter((h) => h.id !== card.id);

    // Remove from pendingImmediateActionIds if present
    if (actor.pendingImmediateActionIds) {
      actor.pendingImmediateActionIds = actor.pendingImmediateActionIds.filter(
        (id: string) => id !== card.id
      );
    }

    // Resolve the action
    const rank = String(card.rank);
    const cardName = rank.replace(/([a-z])([A-Z])/g, '$1 $2');
    let log = `${actor.name} played ${cardName} on ${target.name}.`;
    newState.previousTurnLog = log;

    let result = 'Played';
    if (rank === 'Lock') result = `Locked ${target.name}`;
    else if (rank === 'LifeSaver') result = 'Given';

    if (rank !== 'TurnThree') {
      // Attempt to merge with previous "Hit" entry if it exists and belongs to the same actor
      const lastEntry =
        newState.ledger && newState.ledger.length > 0
          ? newState.ledger[newState.ledger.length - 1]
          : null;
      if (lastEntry && lastEntry.playerName === actor.name && lastEntry.action === 'Hit') {
        lastEntry.result += `. ${result}`;
        // If the hit didn't have a target, we can set it now, or just leave it in the result string.
        // Setting targetName might be useful for UI columns.
        if (!lastEntry.targetName) {
          lastEntry.targetName = target.name;
        }
      } else {
        this.addToLedger(newState, actor.name, 'Action', result, target.name);
      }
    }

    switch (rank) {
      case 'Lock': {
        // target immediately stays and becomes inactive
        target.hasStayed = true;
        target.isLocked = true;
        target.isActive = false;
        target.hand.push({ ...card, isFaceUp: true });

        // If target is locked, they cannot perform further actions.
        // If target has pending actions (e.g. from an interrupted Turn Three), clear them.
        if (target.pendingImmediateActionIds && target.pendingImmediateActionIds.length > 0) {
          // Move pending reserved actions to discard pile
          const pendingIds = new Set(target.pendingImmediateActionIds);
          if (target.reservedActions) {
            const toDiscard = target.reservedActions.filter((c) => pendingIds.has(c.id));
            target.reservedActions = target.reservedActions.filter((c) => !pendingIds.has(c.id));
            newState.discardPile = newState.discardPile || [];
            newState.discardPile.push(...toDiscard);
          }
          target.pendingImmediateActionIds = [];
        }

        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
          this.advanceTurn(newState);
          this.checkRoundEnd(newState);
        }
        break;
      }
      case 'TurnThree': {
        // Parse remaining draws from ID if present (for resumed actions)
        let drawCount = 3;
        const resumeMatch = payload.cardId.match(/#resume:(\d+)$/);
        if (resumeMatch) {
          drawCount = parseInt(resumeMatch[1], 10);
        }

        // We do NOT put the TurnThree card in hand immediately.
        // We wait to see if the action completes or is interrupted.

        // Queue for actions revealed during the draw
        const drawnCardNames: string[] = [];
        let interrupted = false;

        for (let i = 0; i < drawCount; i++) {
          const next = this.drawOne(newState);
          if (!next) break;
          drawnCardNames.push(String(next.rank).replace(/([a-z])([A-Z])/g, '$1 $2'));

          if (!next.suit || next.suit === 'number') {
            const duplicateCount = target.hand.filter(
              (h) => (!h.suit || h.suit === 'number') && h.rank === next.rank
            ).length;
            target.hand.push({ ...next, isFaceUp: true });
            if (duplicateCount > 0) {
              if (target.hasLifeSaver) {
                // consume Life Saver and discard the duplicate drawn card
                target.hand = target.hand.filter((h) => h.id !== next.id);
                // Also remove the Life Saver card from hand
                const scIdx = target.hand.findIndex(
                  (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
                );
                if (scIdx !== -1) target.hand.splice(scIdx, 1);

                // Check if we have another Life Saver (e.g. pending)
                const hasAnother = target.hand.some(
                  (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
                );
                if (hasAnother) {
                  // Activate it!
                  target.hasLifeSaver = true;
                  // Find the card ID of the remaining Life Saver
                  const otherLS = target.hand.find(
                    (h) => h.suit === 'action' && String(h.rank) === 'LifeSaver'
                  );
                  if (otherLS) {
                    if (target.pendingImmediateActionIds) {
                      target.pendingImmediateActionIds = target.pendingImmediateActionIds.filter(
                        (id) => id !== otherLS.id
                      );
                    }
                    if (target.reservedActions) {
                      target.reservedActions = target.reservedActions.filter(
                        (c) => c.id !== otherLS.id
                      );
                    }
                  }
                } else {
                  target.hasLifeSaver = false;
                }
              } else {
                target.hasBusted = true;
                target.isActive = false;
                log += ` ${target.name} Busted!`;
                // Flip target's cards face-down when they bust during TurnThree
                if (target.hand && target.hand.length > 0) {
                  target.hand = target.hand.map((c) => ({ ...c, isFaceUp: false }));
                }
                break;
              }
            }

            // Check for 7 unique number cards immediately
            const numberRanks = target.hand
              .filter((h) => !h.suit || h.suit === 'number')
              .map((h) => h.rank);
            const uniqueCount = new Set(numberRanks).size;
            if (uniqueCount >= 7) {
              // Log action BEFORE computing scores (which logs Round End)
              const drawnString = drawnCardNames.length > 0 ? drawnCardNames.join(', ') : 'nothing';
              this.addToLedger(
                newState,
                actor.name,
                'Action',
                `Turn 3 (on ${target.name}). Draws ${drawnString}`
              );

              this.computeScores(newState);
              if (newState.gamePhase !== 'gameover') {
                newState.gamePhase = 'ended';
                // Round ended due to 7-unique — clear current player so UI reflects ended state
                newState.currentPlayerId = null;
              }
              log += ` ${target.name} Turn 7!`;
              break; // Stop drawing
            }
          } else if (next.suit === 'modifier') {
            target.hand.push({ ...next, isFaceUp: true });
          } else if (next.suit === 'action') {
            const nextRank = String(next.rank);
            let shouldInterrupt = false;

            if (nextRank === 'Lock' || nextRank === 'TurnThree') {
              shouldInterrupt = true;
            } else if (nextRank === 'LifeSaver') {
              if (target.hasLifeSaver) {
                const otherEligible = newState.players.some(
                  (p) => p.id !== target.id && p.isActive && !p.hasLifeSaver
                );
                if (otherEligible) {
                  shouldInterrupt = true;
                } else {
                  newState.discardPile.push({ ...next, isFaceUp: true });
                }
              } else {
                target.hasLifeSaver = true;
                target.hand.push({ ...next, isFaceUp: true });
              }
            }

            if (shouldInterrupt) {
              // Add action to hand/reserved for resolution
              target.reservedActions = target.reservedActions || [];
              target.reservedActions.push({ ...next, isFaceUp: true });

              // Only add to hand if it's NOT a Life Saver overflow (which we pass on)
              if (nextRank !== 'LifeSaver') {
                target.hand.push({ ...next, isFaceUp: true });
              }

              // Queue action for immediate resolution
              target.pendingImmediateActionIds = target.pendingImmediateActionIds || [];
              target.pendingImmediateActionIds.push(next.id);

              // Re-queue the current TurnThree for resumption
              const remaining = drawCount - (i + 1);
              if (remaining > 0) {
                // Update ID to store state
                const baseId = card.id.split('#')[0];
                card.id = `${baseId}#resume:${remaining}`;

                // Put back in reservedActions
                target.reservedActions.push(card);
                // Add to pending queue (AFTER the new action)
                target.pendingImmediateActionIds.push(card.id);
              } else {
                // If no cards left, just put it in hand as normal
                target.hand.push({ ...card, isFaceUp: true });
              }

              interrupted = true;

              // Transfer control to target to resolve actions
              if (!newState.turnOrderBaseId) {
                newState.turnOrderBaseId = actor.id;
              }
              newState.currentPlayerId = target.id;

              break; // Stop drawing
            } else {
              // Non-interrupting action (e.g. first LifeSaver)
              // Already handled in if/else block above
            }
          }
        }

        if (!interrupted) {
          // Case 14/15: If player busted, discard any set-aside actions
          if (target.hasBusted) {
            // If target busted, they cannot perform further actions.
            // Clear any pending actions they might have.
            if (target.pendingImmediateActionIds && target.pendingImmediateActionIds.length > 0) {
              const pendingIds = new Set(target.pendingImmediateActionIds);
              if (target.reservedActions) {
                const toDiscard = target.reservedActions.filter((c) => pendingIds.has(c.id));
                target.reservedActions = target.reservedActions.filter(
                  (c) => !pendingIds.has(c.id)
                );
                newState.discardPile = newState.discardPile || [];
                newState.discardPile.push(...toDiscard);
              }
              target.pendingImmediateActionIds = [];
            }

            // Discard the original TurnThree card when the target busted (Case 14)
            // Note: card is NOT in hand yet, so we just discard it directly
            if (!newState.discardPile.some((d) => d.id === card.id)) {
              newState.discardPile.push(card);
            }

            // Turn ends for actor.
            if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
              this.advanceTurn(newState);
              this.checkRoundEnd(newState);
            }
          } else {
            // Case 12: After successful resolution we keep the original TurnThree in the target's hand
            target.hand.push({ ...card, isFaceUp: true });

            // No pending actions, advance turn from Actor
            if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
              this.advanceTurn(newState);
              this.checkRoundEnd(newState);
            }
          }

          // Only log if we haven't already logged (due to Turn 7 condition above)
          if (newState.gamePhase !== 'ended' && newState.gamePhase !== 'gameover') {
            const drawnString = drawnCardNames.length > 0 ? drawnCardNames.join(', ') : 'nothing';
            this.addToLedger(
              newState,
              actor.name,
              'Action',
              `Turn 3 (on ${target.name}). Draws ${drawnString}`
            );
          }
        }

        newState.previousTurnLog = log;
        break;
      }
      case 'LifeSaver': {
        // giveLifeSaver may discard the card if there's no eligible recipient
        this.giveLifeSaver(newState, targetIndex, card);
        // Playing an action card ends the actor's turn
        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
          this.advanceTurn(newState);
          this.checkRoundEnd(newState);
        }
        break;
      }
      default: {
        if (!newState.discardPile.some((d) => d.id === card.id)) {
          newState.discardPile.push({ ...card, isFaceUp: true });
        }
        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
          this.advanceTurn(newState);
        }
        break;
      }
    }

    // After resolving an action, check if we are still in the initial deal phase (active players with no cards).
    // If so, continue dealing instead of normal turn advancement.
    // Note: advanceTurn might have been called above.
    // If we are in deal phase, advanceTurn might pick a player with no cards.
    // But we want to DEAL to them, not let them HIT/STAY.
    // So we should check this condition.
    // However, `advanceTurn` sets `currentPlayerId`.
    // `continueDealing` also sets `currentPlayerId`.
    // If we call `continueDealing`, it will override `currentPlayerId` to the next person needing a card.
    // This is correct.

    // But wait, if `advanceTurn` was called, it might have ended the round if no active players?
    // If we are in initial deal, there should be active players.
    // Also, `advanceTurn` moves to next player.
    // `continueDealing` finds first player with empty hand.
    // If P1 played action, and P1 has empty hand (because action card is gone), P1 needs card.
    // `continueDealing` will find P1.
    // So calling `continueDealing` is safe and correct.

    const needsDeal = newState.players.some(
      (p) =>
        p.isActive && p.hand.length === 0 && (!p.reservedActions || p.reservedActions.length === 0)
    );
    if (needsDeal) {
      // If we are in deal phase, we override whatever advanceTurn did.
      this.continueDealing(newState);
    }

    return newState;
  }

  private handleStay(state: GameState): GameState {
    const newState = structuredClone(state);
    const { players, currentPlayerId } = newState;
    const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return newState;

    const currentPlayer = players[currentPlayerIndex];
    // If player has pending immediate actions, they must resolve them before staying.
    if (
      currentPlayer.pendingImmediateActionIds &&
      currentPlayer.pendingImmediateActionIds.length > 0
    ) {
      return newState;
    }

    // Mark current player as stayed and inactive for drawing
    players[currentPlayerIndex].hasStayed = true;
    players[currentPlayerIndex].isActive = false;
    newState.previousTurnLog = `${currentPlayer.name} stayed.`;
    this.addToLedger(newState, currentPlayer.name, 'Stay', 'Stayed');

    // Advance to next active player (forward-wrapping)
    const total = players.length;
    let found = false;
    if (total > 0) {
      for (let offset = 1; offset < total; offset++) {
        const idx = (currentPlayerIndex + offset) % total;
        if (players[idx].isActive) {
          newState.currentPlayerId = players[idx].id;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // No active players left; end the round and compute scores
      newState.currentPlayerId = null;
      this.computeScores(newState);
      if (newState.gamePhase !== 'gameover') {
        newState.gamePhase = 'ended';
      }
    }

    // After staying, also check 7-unique condition
    this.checkRoundEnd(newState);
    return newState;
  }

  private checkRoundEnd(state: GameState) {
    // If the round is already marked as ended or gameover, avoid re-computing scores.
    if (state.gamePhase === 'ended' || state.gamePhase === 'gameover') return;
    // If any player has 7 unique number cards, end round
    for (const p of state.players) {
      const numberRanks = p.hand.filter((h) => h.suit === 'number').map((h) => h.rank);
      const uniqueCount = new Set(numberRanks).size;
      if (uniqueCount >= 7) {
        this.computeScores(state);
        // If computeScores didn't already mark a gameover, mark round as ended.
        if ((state.gamePhase as string) !== 'gameover') {
          state.gamePhase = 'ended';
          state.currentPlayerId = null;
        }
        return;
      }
    }

    // If no active players left, end round
    const anyActive = state.players.some((p) => p.isActive);
    if (!anyActive) {
      this.computeScores(state);
      if ((state.gamePhase as string) !== 'gameover') {
        state.gamePhase = 'ended';
        state.currentPlayerId = null;
      }
    }
  }

  private computeScores(state: GameState) {
    // For each player: if busted => 0, else sum numeric ranks and apply modifiers (modifiers not implemented yet)
    for (const p of state.players) {
      if (p.hasBusted) {
        p.roundScore = 0;
        p.totalScore = (p.totalScore ?? 0) + 0;
        this.addToLedger(state, p.name, 'Round End', `Busted (Score: 0, Total: ${p.totalScore})`);
        continue;
      }

      // Calculate number card sum, modifiers, and multipliers per rules:
      // - Sum number cards (face values)
      // - Apply x2 multipliers to the number sum (each x2 doubles)
      // - Then add any +X modifiers
      let numberSum = 0;
      let multiplierCount = 0; // count of x2 cards
      let plusModifiers = 0; // sum of +X modifiers

      for (const c of p.hand) {
        if (!c.suit || c.suit === 'number') {
          const v = parseInt(String(c.rank), 10);
          if (!isNaN(v)) numberSum += v;
        } else if (c.suit === 'modifier') {
          const r = String(c.rank);
          if (r.startsWith('x')) {
            // e.g. 'x2'
            const mult = parseInt(r.slice(1), 10);
            if (!isNaN(mult) && mult === 2) multiplierCount += 1;
          } else if (r.startsWith('+')) {
            const add = parseInt(r.slice(1), 10);
            if (!isNaN(add)) plusModifiers += add;
          }
        }
        // action cards (Lock, Turn Three, Life Saver) don't affect scoring here
      }

      // apply multipliers (each x2 doubles)
      const multiplier = Math.pow(2, multiplierCount);
      let roundTotal = numberSum * multiplier + plusModifiers;

      // 7-unique bonus applies after number sum but before modifiers? Rules say bonus is added to total.
      const uniqueNumbers = new Set(
        p.hand.filter((h) => !h.suit || h.suit === 'number').map((h) => h.rank)
      );
      if (uniqueNumbers.size >= 7) roundTotal += 15;

      p.roundScore = roundTotal;
      p.totalScore = (p.totalScore ?? 0) + roundTotal;

      this.addToLedger(state, p.name, 'Round End', `Score: ${roundTotal} (Total: ${p.totalScore})`);
    }
    // After computing totals, check for an overall winner.
    // Find all players who have crossed the win threshold
    const winners = state.players.filter((p) => (p.totalScore ?? 0) >= this.WIN_SCORE);
    if (winners.length > 0) {
      // Sort by total score descending to find the highest score
      winners.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

      state.gamePhase = 'gameover';
      // attach winnerId for UI - the player with the highest score wins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).winnerId = winners[0].id;
      // When game over, clear current player so UI stops showing action controls
      state.currentPlayerId = null;
      return;
    }
  }

  // Reset the entire game (clear totals) and deal a fresh initial round.
  public resetGame(state: GameState): GameState {
    const playerIds = state.players.map((p) => p.id);
    const newState = this.createInitialState(playerIds);
    // ensure totalScore reset to zero
    newState.players = newState.players.map((p) => ({ ...p, totalScore: 0, roundScore: 0 }));
    newState.gamePhase = 'playing';
    newState.roundNumber = 1;
    newState.previousTurnLog = undefined;
    newState.previousRoundScores = undefined;
    return newState;
  }

  public startNextRound(state: GameState): GameState {
    const newState = structuredClone(state);

    // Capture scores from the end of the previous round
    newState.previousRoundScores = {};
    state.players.forEach((p) => {
      if (newState.previousRoundScores) {
        let resultType: 'normal' | 'bust' | 'turn-seven' = 'normal';
        if (p.hasBusted) {
          resultType = 'bust';
        } else {
          const numberRanks = p.hand
            .filter((h) => !h.suit || h.suit === 'number')
            .map((h) => h.rank);
          const uniqueCount = new Set(numberRanks).size;
          if (uniqueCount >= 7) {
            resultType = 'turn-seven';
          }
        }
        newState.previousRoundScores[p.id] = {
          score: p.totalScore ?? 0,
          resultType,
        };
      }
    });

    // Move all cards from players (hands, reserved actions) into the discard pile for the finished round
    newState.discardPile = newState.discardPile || [];

    // Robustly deduplicate the existing discard pile first to ensure no ID collisions
    const uniqueDiscardMap = new Map<string, CardModel>();
    newState.discardPile.forEach((c) => uniqueDiscardMap.set(c.id, c));

    // Track IDs to prevent adding duplicates from hands/reserved
    const discardedIds = new Set<string>(uniqueDiscardMap.keys());

    newState.players.forEach((p) => {
      if (p.hand && p.hand.length > 0) {
        p.hand.forEach((c) => {
          if (!discardedIds.has(c.id)) {
            uniqueDiscardMap.set(c.id, { ...c, isFaceUp: true });
            discardedIds.add(c.id);
          }
        });
      }
      if (p.reservedActions && p.reservedActions.length > 0) {
        p.reservedActions.forEach((c) => {
          if (!discardedIds.has(c.id)) {
            uniqueDiscardMap.set(c.id, { ...c, isFaceUp: true });
            discardedIds.add(c.id);
          }
        });
      }
    });

    // Reconstruct discard pile from the unique map
    newState.discardPile = Array.from(uniqueDiscardMap.values());

    // Do not shuffle discarded cards back into the deck immediately at the start of a round.
    // Per rules: collect all cards into the discard pile. Preserve the current deck and discard
    // piles rather than creating a fresh deck so the leftover cards at the end of a round
    // carry over into the next round. If there is no deck array present (shouldn't normally
    // happen), initialize it as an empty array.
    if (!newState.deck) newState.deck = [];
    // If after carrying over the deck we find it empty, we must replenish it.
    // If we have a discard pile, reshuffle it into the deck.
    // Only create a fresh deck if both are empty (which implies we lost all cards).
    if (newState.deck.length === 0) {
      if (newState.discardPile && newState.discardPile.length > 0) {
        newState.deck = this.shuffle(newState.discardPile);
        newState.discardPile = [];
      } else {
        newState.deck = this.createDeck();
      }
    }
    newState.gamePhase = 'playing';
    newState.roundNumber = (state.roundNumber || 1) + 1;
    newState.previousTurnLog = undefined;

    newState.players = newState.players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      hasStayed: false,
      isLocked: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: p.totalScore ?? 0,
      pendingImmediateActionIds: [],
      reservedActions: [],
      hasLifeSaver: false,
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
    }));

    // Determine next round starter based on round number to ensure deterministic rotation
    // Round 1 -> Index 0, Round 2 -> Index 1, etc.
    const nextStarterIndex = (newState.roundNumber - 1) % newState.players.length;
    const nextStarter = newState.players[nextStarterIndex];
    newState.roundStarterId = nextStarter.id;

    // Deal one card to each player (face up). If a player was already dealt a
    // card (e.g. was targeted earlier during action resolution), don't give
    // them another — that initial card counts for them.
    this.continueDealing(newState);

    // If continueDealing paused, currentPlayerId is set to the pending player.
    // If it finished, it set currentPlayerId to the first active player.
    // So we don't need to force it here, unless continueDealing failed to set it?
    // continueDealing sets it.

    return newState;
  }

  private addToLedger(
    state: GameState,
    playerName: string,
    action: string,
    result: string,
    targetName?: string
  ): void {
    if (!state.ledger) {
      state.ledger = [];
    }
    const entry: LedgerEntry = {
      roundNumber: state.roundNumber,
      playerName,
      action,
      targetName,
      result,
      timestamp: Date.now(),
    };
    state.ledger.push(entry);
  }

  // Helper: find next active player index starting after `fromIndex` (forward-wrapping)
  private nextActiveIndex(players: PlayerModel[], fromIndex: number): number {
    const total = players.length;
    if (total === 0) return -1;
    for (let offset = 1; offset < total; offset++) {
      const idx = (fromIndex + offset) % total;
      if (players[idx].isActive) return idx;
    }
    return -1;
  }

  // Helper: give a Life Saver to the player if they don't have one; otherwise pass to next eligible active player.
  // Also places the card in the recipient's hand.
  private giveLifeSaver(state: GameState, startIdx: number, card?: CardModel) {
    const players = state.players;
    const p = players[startIdx];
    if (!p.hasLifeSaver) {
      p.hasLifeSaver = true;
      if (card) {
        if (!p.hand) p.hand = [];
        if (!p.hand.some((c) => c.id === card.id)) p.hand.push({ ...card, isFaceUp: true });
      }
      // assigned directly to the requested player
      return true;
    }

    // no eligible player — discard the card to prevent it from being lost
    state.discardPile = state.discardPile || [];
    if (card && !state.discardPile.some((d) => d.id === card.id)) {
      state.discardPile.push({ ...card, isFaceUp: true });
    }
    // discarded because no eligible players
    return false;
  }

  // Draw one card from deck, reshuffling discard into deck if the deck is empty
  // Returns undefined if there are no cards available at all.
  private drawOne(state: GameState): CardModel | undefined {
    if (!state.deck) state.deck = [];
    if (!state.discardPile) state.discardPile = [];

    if (state.deck.length === 0 && state.discardPile.length > 0) {
      // Shuffle the discard pile into the deck and empty discard
      state.deck = this.shuffle(state.discardPile);
      state.discardPile = [];
    }

    return state.deck.pop();
  }

  // Resolve an action card that was dealt or drawn. `drawerIdx` is index of the player who caused the reveal.
  // `deck` is the deck array (top = end of array via pop()).
  private resolveActionOnDeal(players: PlayerModel[], drawerIdx: number, card: CardModel) {
    const rank = String(card.rank);
    const drawer = players[drawerIdx];

    switch (rank) {
      case 'Lock': {
        // Queue for user targeting
        drawer.reservedActions = drawer.reservedActions || [];
        drawer.reservedActions.push({ ...card, isFaceUp: true });
        drawer.hand.push({ ...card, isFaceUp: true });
        drawer.pendingImmediateActionIds = drawer.pendingImmediateActionIds || [];
        drawer.pendingImmediateActionIds.push(card.id);
        break;
      }
      case 'TurnThree': {
        // Queue for user targeting
        drawer.reservedActions = drawer.reservedActions || [];
        drawer.reservedActions.push({ ...card, isFaceUp: true });
        drawer.hand.push({ ...card, isFaceUp: true });
        drawer.pendingImmediateActionIds = drawer.pendingImmediateActionIds || [];
        drawer.pendingImmediateActionIds.push(card.id);
        break;
      }
      case 'LifeSaver': {
        // If drawer doesn't have one, keep it.
        if (!drawer.hasLifeSaver) {
          drawer.hasLifeSaver = true;
          drawer.hand.push({ ...card, isFaceUp: true });
        } else {
          // Drawer has one. Must give away.
          // Queue for targeting.
          drawer.reservedActions = drawer.reservedActions || [];
          drawer.reservedActions.push({ ...card, isFaceUp: true });
          drawer.hand.push({ ...card, isFaceUp: true });
          drawer.pendingImmediateActionIds = drawer.pendingImmediateActionIds || [];
          drawer.pendingImmediateActionIds.push(card.id);
        }
        break;
      }
      default:
        break;
    }
  }

  private continueDealing(state: GameState) {
    // If deck is empty, we can't deal.
    // DEBUG: track deck/discard counts when troubleshooting large-player deals
    // (no-op) debug logs removed
    if (state.deck.length === 0) {
      // Ensure we have a valid current player if possible
      if (!state.currentPlayerId) {
        const first = state.players.find((p) => p.isActive);
        state.currentPlayerId = first ? first.id : null;
      }
      return;
    }

    // Check if anyone has pending actions. If so, they must act first.
    const pendingPlayer = state.players.find(
      (p) => p.pendingImmediateActionIds && p.pendingImmediateActionIds.length > 0
    );
    if (pendingPlayer) {
      state.currentPlayerId = pendingPlayer.id;
      return; // Pause for action
    }

    // Find first active player with empty hand (and no reserved actions that count as "having cards"?)
    // Actually, if they have reserved actions (like a queued Lock), they technically have a card.
    // But if they just resolved it (played it), they might have 0 cards again.
    // So we check for empty hand AND empty reserved actions.
    // We must start searching from the round starter to ensure correct deal order.
    let startIndex = 0;
    if (state.roundStarterId) {
      startIndex = state.players.findIndex((p) => p.id === state.roundStarterId);
      if (startIndex === -1) startIndex = 0;
    }

    let playerIndex = -1;
    for (let i = 0; i < state.players.length; i++) {
      const idx = (startIndex + i) % state.players.length;
      const p = state.players[idx];
      if (
        p.isActive &&
        p.hand.length === 0 &&
        (!p.reservedActions || p.reservedActions.length === 0)
      ) {
        playerIndex = idx;
        break;
      }
    }

    if (playerIndex === -1) {
      // Everyone has cards. Deal done.
      // Set current player to the round starter if available, otherwise first active player.
      if (state.roundStarterId) {
        const starter = state.players.find((p) => p.id === state.roundStarterId && p.isActive);
        if (starter) {
          state.currentPlayerId = starter.id;
          return;
        }
      }

      const first = state.players.find((p) => p.isActive);
      state.currentPlayerId = first ? first.id : null;
      return;
    }

    // Deal to this player
    const player = state.players[playerIndex];
    state.currentPlayerId = player.id;

    // dealing to playerIndex
    let keptCard = false;
    while (!keptCard) {
      const card = this.drawOne(state);
      // drew a card
      if (!card) break; // no cards left even after reshuffling

      if (card.suit === 'action') {
        this.resolveActionOnDeal(state.players, playerIndex, card);

        // Always log the deal of an action card
        const cardName = String(card.rank).replace(/([a-z])([A-Z])/g, '$1 $2');
        this.addToLedger(state, player.name, 'Deal', `Dealt ${cardName}`);

        // If pending action created, STOP.
        // We check the player object directly from the state to be safe
        if (player.pendingImmediateActionIds && player.pendingImmediateActionIds.length > 0) {
          return;
        }

        // If not pending (e.g. Life Saver auto-resolved to someone else), check if player kept it
        if (player.hand.some((h) => h.id === card.id)) {
          keptCard = true;
        }
        // If not kept, loop continues (draw replacement)
      } else {
        player.hand.push({ ...card, isFaceUp: true });
        keptCard = true;
        this.addToLedger(
          state,
          player.name,
          'Deal',
          `Dealt ${String(card.rank).replace(/([a-z])([A-Z])/g, '$1 $2')}`
        );
      }
    }

    // If we successfully dealt to this player, continue to next
    if (keptCard) {
      this.continueDealing(state);
    }
  }

  private shuffle(deck: CardModel[]): CardModel[] {
    const newDeck = [...deck];
    // Fisher-Yates shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }
}
