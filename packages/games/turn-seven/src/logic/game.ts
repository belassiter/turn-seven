import { CardModel, GameState, PlayerModel } from '@turn-seven/engine';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 18;

// We can define a generic interface for game logic
export interface IGameLogic {
  createInitialState(playerIds: string[]): GameState;
  performAction(state: GameState, action: { type: string; payload?: any }): GameState;
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
      isFrozen: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasSecondChance: false,
    }));

    // Deal one card to each player to start, resolving Action cards immediately.
    players.forEach((player, idx) => {
      // ensure each player receives at least one card (non-action) if possible
      let keptCard = false;
      while (!keptCard && deck.length > 0) {
        const card = deck.pop();
        if (!card) break;
        if (card.suit === 'action') {
          this.resolveActionOnDeal(players, idx, card, deck);
          if (player.hand.some((h: any) => h.id === card.id)) {
            keptCard = true;
          }
        } else {
          player.hand.push({ ...card, isFaceUp: true });
          keptCard = true;
        }
      }
    });

    return {
      players,
      deck,
      discardPile: [],
      currentPlayerId: playerIds[0] || null,
      gamePhase: 'playing',
    };
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
      isFrozen: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
      pendingImmediateActionIds: [],
      hasSecondChance: false,
    }));

    // Deal one card to each player and resolve action cards immediately.
    players.forEach((player, idx) => {
      let keptCard = false;
      while (!keptCard && deck.length > 0) {
        const card = deck.pop();
        if (!card) break;
        if (card.suit === 'action') {
          this.resolveActionOnDeal(players, idx, card, deck);
          if (player.hand.some((h: any) => h.id === card.id)) {
            keptCard = true;
          }
        } else {
          player.hand.push({ ...card, isFaceUp: true });
          keptCard = true;
        }
      }
    });

    return {
      players,
      deck,
      discardPile: [],
      currentPlayerId: ids[0] || null,
      gamePhase: 'playing',
    };
  }

  performAction(state: GameState, action: { type: string; payload?: any }): GameState {
    if (state.gamePhase !== 'playing') return state;

    switch (action.type) {
      case 'HIT':
        return this.handleHit(state);
      case 'STAY':
        return this.handleStay(state);
      case 'PLAY_ACTION':
        return this.handlePlayAction(state, action.payload);
      default:
        return state;
    }
  }

  // Handle a player's HIT action: draw top card and resolve basic effects
  private handleHit(state: GameState): GameState {
    const newState = structuredClone(state);
    const { players } = newState;
    const currentPlayerId = newState.currentPlayerId;
    const currentPlayerIndex = players.findIndex((p: any) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return newState;

    // Case 19: Establish the "anchor" for turn order if not already set.
    // This ensures that if this hit triggers a chain of actions (e.g. drawing a Turn Three),
    // play eventually resumes from the player AFTER this one.
    if (!newState.turnOrderBaseId) {
      newState.turnOrderBaseId = currentPlayerId;
    }

    const currentPlayer = players[currentPlayerIndex];

    // If player has pending immediate actions, they must resolve them before hitting again.
    if (currentPlayer.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0) {
      return newState;
    }

    const card = newState.deck.pop();
    if (!card) return newState;

    if (card.suit === 'action') {
      // Reserve action for later play and show a visible representation in hand for UI
      currentPlayer.reservedActions = currentPlayer.reservedActions || [];
      currentPlayer.reservedActions.push({ ...card, isFaceUp: true });
      currentPlayer.hand.push({ ...card, isFaceUp: true });
      
      // If it's Freeze or TurnThree, it must be resolved immediately (cannot HIT/STAY until done)
      const rank = String(card.rank);
      if (rank === 'Freeze' || rank === 'TurnThree') {
        currentPlayer.pendingImmediateActionIds = currentPlayer.pendingImmediateActionIds || [];
        currentPlayer.pendingImmediateActionIds.push(card.id);
      } else if (rank === 'SecondChance') {
        // If player doesn't have one, they keep it automatically and turn ends (advances).
        // If they have one, it becomes pending (must give to someone else).
        if (!currentPlayer.hasSecondChance) {
          currentPlayer.hasSecondChance = true;
          // Remove from reservedActions since it's being kept as a passive buff, not an active action to play
          currentPlayer.reservedActions = currentPlayer.reservedActions.filter((c: any) => c.id !== card.id);
          
          // Card stays in hand.
          // Turn ends for this player because they drew an action card?
          // Rules say "Action cards are resolved immediately".
          // Resolving Second Chance means keeping it.
          // Does turn end? User says "Play should just continue to the next player."
          // So we force turn advance.
          this.advanceTurn(newState);
          this.checkRoundEnd(newState);
          return newState;
        } else {
          currentPlayer.pendingImmediateActionIds = currentPlayer.pendingImmediateActionIds || [];
          currentPlayer.pendingImmediateActionIds.push(card.id);
        }
      }
    } else if (card.suit === 'modifier') {
      currentPlayer.hand.push({ ...card, isFaceUp: true });
    } else {
      // number card
      currentPlayer.hand.push({ ...card, isFaceUp: true });
      const duplicateCount = currentPlayer.hand.filter((h: any) => (!h.suit || h.suit === 'number') && h.rank === card.rank).length;
      if (duplicateCount > 1) {
        if (currentPlayer.hasSecondChance) {
          // consume second chance and discard the duplicate drawn card
          currentPlayer.hand = currentPlayer.hand.filter((h: any) => h.id !== card.id);
          // Also remove the Second Chance card from hand
          const scIdx = currentPlayer.hand.findIndex((h: any) => h.suit === 'action' && String(h.rank) === 'SecondChance');
          if (scIdx !== -1) currentPlayer.hand.splice(scIdx, 1);
          currentPlayer.hasSecondChance = false;
        } else {
          currentPlayer.hasBusted = true;
          currentPlayer.isActive = false;
          // Flip this player's cards face-down when they bust
          if (currentPlayer.hand && currentPlayer.hand.length > 0) {
            currentPlayer.hand = currentPlayer.hand.map((c: any) => ({ ...c, isFaceUp: false }));
          }
        }
      }
    }

    // If the player has pending immediate actions (e.g. Freeze/TurnThree target selection),
    // the turn does not advance yet. They must resolve the action.
    // Otherwise, whether they busted or successfully hit, the turn passes to the next player (Round-Robin).
    if (!currentPlayer.pendingImmediateActionIds || currentPlayer.pendingImmediateActionIds.length === 0) {
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
    const baseIndex = players.findIndex((p: any) => p.id === baseId);
    
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
  private handlePlayAction(state: GameState, payload: { actorId: string; cardId: string; targetId: string }): GameState {
    const newState = structuredClone(state);
    const { players, deck } = newState;
    const actorIndex = players.findIndex((p: any) => p.id === payload.actorId);
    const targetIndex = players.findIndex((p: any) => p.id === payload.targetId);
    if (actorIndex === -1 || targetIndex === -1) return newState;
    const actor = players[actorIndex];
    const target = players[targetIndex];

    actor.reservedActions = actor.reservedActions || [];
    const idx = actor.reservedActions.findIndex((c: any) => c.id === payload.cardId);
    if (idx === -1) return newState;
    const card = actor.reservedActions.splice(idx, 1)[0];

    // Remove visible representation from actor.hand if present
    if (actor.hand) actor.hand = actor.hand.filter((h: any) => h.id !== card.id);

    // Remove from pendingImmediateActionIds if present
    if (actor.pendingImmediateActionIds) {
      actor.pendingImmediateActionIds = actor.pendingImmediateActionIds.filter((id: string) => id !== card.id);
    }

    // Resolve the action
    const rank = String(card.rank);
    switch (rank) {
      case 'Freeze': {
        // target immediately stays and becomes inactive
        target.hasStayed = true;
        target.isFrozen = true;
        target.isActive = false;
        target.hand.push({ ...card, isFaceUp: true });
        // Playing an action card ends the actor's turn (per user request/interpretation)
        // Unless they have more pending actions (e.g. from a Turn Three queue)
        
        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
           this.advanceTurn(newState);
        }
        break;
      }
      case 'TurnThree': {
        // target draws up to 3 cards; action cards revealed are set aside as per deal semantics
        target.hand.push({ ...card, isFaceUp: true });
        
        // Queue for actions revealed during the draw
        const revealedActions: CardModel[] = [];

        for (let i = 0; i < 3; i++) {
          const next = deck.pop();
          if (!next) break;
          if (!next.suit || next.suit === 'number') {
            const duplicateCount = target.hand.filter((h: any) => (!h.suit || h.suit === 'number') && h.rank === next.rank).length;
            target.hand.push({ ...next, isFaceUp: true });
            if (duplicateCount > 0) {
              if (target.hasSecondChance) {
                // consume second chance and discard the duplicate drawn card
                target.hand = target.hand.filter((h: any) => h.id !== next.id);
                // Also remove the Second Chance card from hand
                const scIdx = target.hand.findIndex((h: any) => h.suit === 'action' && String(h.rank) === 'SecondChance');
                if (scIdx !== -1) target.hand.splice(scIdx, 1);
                target.hasSecondChance = false;
              } else {
                target.hasBusted = true;
                target.isActive = false;
                // Flip target's cards face-down when they bust during TurnThree
                if (target.hand && target.hand.length > 0) {
                  target.hand = target.hand.map((c: any) => ({ ...c, isFaceUp: false }));
                }
                break;
              }
            }
            
            // Check for 7 unique number cards immediately
            const numberRanks = target.hand.filter((h: any) => (!h.suit || h.suit === 'number')).map((h: any) => h.rank);
            const uniqueCount = new Set(numberRanks).size;
            if (uniqueCount >= 7) {
               this.computeScores(newState);
               if (newState.gamePhase !== 'gameover') {
                 newState.gamePhase = 'ended';
                  // Round ended due to 7-unique — clear current player so UI reflects ended state
                  newState.currentPlayerId = null;
               }
               break; // Stop drawing
            }
          } else if (next.suit === 'modifier') {
            target.hand.push({ ...next, isFaceUp: true });
          } else if (next.suit === 'action') {
            if (String(next.rank) === 'SecondChance') {
              this.giveSecondChance(players, targetIndex, next);
            } else {
              // set aside non-resolution action cards into target's hand for later play
              target.reservedActions = target.reservedActions || [];
              target.reservedActions.push({ ...next, isFaceUp: true });
              target.hand.push({ ...next, isFaceUp: true });
              // Add to queue for resolution after the 3-card draw
              revealedActions.push(next);
            }
          }
        }

         // Case 14/15: If player busted, discard any set-aside actions
         // Note: reaching 7 unique number cards (round end) should NOT discard the original TurnThree card
         if (target.hasBusted) {
           revealedActions.forEach(a => {
             // Remove from reservedActions
             if (target.reservedActions) {
               target.reservedActions = target.reservedActions.filter((r: any) => r.id !== a.id);
             }
             // Remove from hand
             target.hand = target.hand.filter((h: any) => h.id !== a.id);
             // Add to discard pile
             newState.discardPile.push(a);
           });
           // Discard the original TurnThree card when the target busted (Case 14)
           target.hand = target.hand.filter((h: any) => h.id !== card.id);
           newState.discardPile.push(card);
           
           // Turn ends for actor.
           if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
             this.advanceTurn(newState);
           }
        } else {
           // Case 12: After successful resolution we keep the original TurnThree in the target's hand

           // If there are revealed actions, queue them for the target to resolve
           if (target.isActive && revealedActions.length > 0) {
              target.pendingImmediateActionIds = target.pendingImmediateActionIds || [];
              revealedActions.forEach(a => {
                target.pendingImmediateActionIds!.push(a.id);
              });
              
              // Transfer control to target to resolve actions
              // Case 19: We must preserve the original turn order base if it exists, or set it if not.
              // If we are already in a chain (turnOrderBaseId set), keep it.
              // If this is the start of a chain (Actor played TurnThree), set it to Actor.
              if (!newState.turnOrderBaseId) {
                 newState.turnOrderBaseId = actor.id;
              }
              
              newState.currentPlayerId = target.id;
           } else {
              // No pending actions, advance turn from Actor
              if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
                this.advanceTurn(newState);
              }
           }
        }
        break;
      }
      case 'SecondChance': {
        this.giveSecondChance(players, targetIndex, card);
        // Playing an action card ends the actor's turn
        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
           this.advanceTurn(newState);
        }
        break;
      }
      default: {
        newState.discardPile.push({ ...card, isFaceUp: true });
        if (!actor.pendingImmediateActionIds || actor.pendingImmediateActionIds.length === 0) {
           this.advanceTurn(newState);
        }
        break;
      }
    }

    return newState;
  }

  private handleStay(state: GameState): GameState {
    const newState = structuredClone(state);
    const { players, currentPlayerId } = newState;
    const currentPlayerIndex = players.findIndex((p: any) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return newState;

    const currentPlayer = players[currentPlayerIndex];
    // If player has pending immediate actions, they must resolve them before staying.
    if (currentPlayer.pendingImmediateActionIds && currentPlayer.pendingImmediateActionIds.length > 0) {
      return newState;
    }

    // Mark current player as stayed and inactive for drawing
    players[currentPlayerIndex].hasStayed = true;
    players[currentPlayerIndex].isActive = false;

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
    // If the round is already marked as ended, avoid re-computing scores.
    if (state.gamePhase === 'ended') return;
    // If any player has 7 unique number cards, end round
    for (const p of state.players) {
      const numberRanks = p.hand.filter(h => h.suit === 'number').map(h => h.rank);
      const uniqueCount = new Set(numberRanks).size;
      if (uniqueCount >= 7) {
        this.computeScores(state);
        // If computeScores didn't already mark a gameover, mark round as ended.
        if (state.gamePhase !== 'gameover') {
          state.gamePhase = 'ended';
          state.currentPlayerId = null;
        }
        return;
      }
    }

    // If no active players left, end round
    const anyActive = state.players.some(p => p.isActive);
    if (!anyActive) {
      this.computeScores(state);
      if (state.gamePhase !== 'gameover') {
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
        // action cards (Freeze, Turn Three, Second Chance) don't affect scoring here
      }

      // apply multipliers (each x2 doubles)
      const multiplier = Math.pow(2, multiplierCount);
      let roundTotal = numberSum * multiplier + plusModifiers;

      // 7-unique bonus applies after number sum but before modifiers? Rules say bonus is added to total.
      const uniqueNumbers = new Set(p.hand.filter(h => !h.suit || h.suit === 'number').map(h => h.rank));
      if (uniqueNumbers.size >= 7) roundTotal += 15;

      p.roundScore = roundTotal;
      p.totalScore = (p.totalScore ?? 0) + roundTotal;
    }
    // After computing totals, check for an overall winner.
    for (const p of state.players) {
      if ((p.totalScore ?? 0) >= this.WIN_SCORE) {
        state.gamePhase = 'gameover';
        // attach winnerId for UI
        (state as any).winnerId = p.id;
        // When game over, clear current player so UI stops showing action controls
        state.currentPlayerId = null;
        return;
      }
    }
  }

  // Reset the entire game (clear totals) and deal a fresh initial round.
  public resetGame(state: GameState): GameState {
    const playerIds = state.players.map(p => p.id);
    const newState = this.createInitialState(playerIds);
    // ensure totalScore reset to zero
    newState.players = newState.players.map(p => ({ ...p, totalScore: 0, roundScore: 0 }));
    newState.gamePhase = 'playing';
    return newState;
  }

  public startNextRound(state: GameState): GameState {
    const newState = structuredClone(state);
    // Reset per-round fields but keep totalScore
    const deck = this.createDeck();
    newState.deck = deck;
    newState.discardPile = [];
    newState.gamePhase = 'playing';

    newState.players = newState.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      hand: [],
      hasStayed: false,
      isFrozen: false,
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: p.totalScore ?? 0,
      pendingImmediateActionIds: [],
    }));

    // Deal one card to each player (face up)
    newState.players.forEach((p: any, idx: number) => {
      let keptCard = false;
      while (!keptCard && newState.deck.length > 0) {
        const card = newState.deck.pop();
        if (!card) break;
        if (card.suit === 'action') {
          this.resolveActionOnDeal(newState.players, idx, card, newState.deck);
          // If the player kept the card (e.g. Second Chance or self-target), they are done.
          // If the card went to someone else, they get a replacement.
          if (p.hand.some((h: any) => h.id === card.id)) {
            keptCard = true;
          }
        } else {
          p.hand.push({ ...card, isFaceUp: true });
          keptCard = true;
        }
      }
    });

    newState.currentPlayerId = newState.players[0]?.id ?? null;
    return newState;
  }

  private createDeck(): CardModel[] {
    // Implement number-card distribution per rules.md
    // Counts: 12 copies of 12, 11 copies of 11, ..., 2 copies of 2, 1 copy of 1, and 1 copy of 0
    // Note: these are number cards (no suits). We'll store them with suit: 'number'.
    const deck: CardModel[] = [];
    let idCounter = 0;

    // numbers 12 down to 1
    for (let value = 12; value >= 1; value--) {
      const count = value; // e.g., value=12 -> 12 copies
      for (let i = 0; i < count; i++) {
        deck.push({ id: `card-${idCounter++}`, suit: 'number', rank: String(value), isFaceUp: false });
      }
    }

    // single 0 card
    deck.push({ id: `card-${idCounter++}`, suit: 'number', rank: '0', isFaceUp: false });

    // Add modifier cards (one copy each): +2, +4, +6, +8, +10, and x2
    const modifiers = ['+2', '+4', '+6', '+8', '+10', 'x2'];
    for (const mod of modifiers) {
      deck.push({ id: `card-${idCounter++}`, suit: 'modifier', rank: mod, isFaceUp: false });
    }

    // Add action cards: Freeze, TurnThree, SecondChance (3 copies each)
    const actions = ['Freeze', 'TurnThree', 'SecondChance'];
    for (const action of actions) {
      for (let i = 0; i < 3; i++) {
        deck.push({ id: `card-${idCounter++}`, suit: 'action', rank: action, isFaceUp: false });
      }
    }

    return this.shuffle(deck);
  }

  // Helper: find next active player index starting after `fromIndex` (forward-wrapping)
  private nextActiveIndex(players: any[], fromIndex: number): number {
    const total = players.length;
    if (total === 0) return -1;
    for (let offset = 1; offset < total; offset++) {
      const idx = (fromIndex + offset) % total;
      if (players[idx].isActive) return idx;
    }
    return -1;
  }

  // Helper: give a Second Chance to the player if they don't have one; otherwise pass to next eligible active player.
  // Also places the card in the recipient's hand.
  private giveSecondChance(players: any[], startIdx: number, card?: CardModel) {
    const p = players[startIdx];
    if (!p.hasSecondChance) {
      p.hasSecondChance = true;
      if (card) p.hand.push({ ...card, isFaceUp: true });
      return true;
    }
    // find another active player without second chance
    for (let offset = 1; offset < players.length; offset++) {
      const idx = (startIdx + offset) % players.length;
      if (players[idx].isActive && !players[idx].hasSecondChance) {
        players[idx].hasSecondChance = true;
        if (card) players[idx].hand.push({ ...card, isFaceUp: true });
        return true;
      }
    }
    // no eligible player
    return false;
  }

  // Resolve an action card that was dealt or drawn. `drawerIdx` is index of the player who caused the reveal.
  // `deck` is the deck array (top = end of array via pop()).
  private resolveActionOnDeal(players: any[], drawerIdx: number, card: CardModel, deck: CardModel[]) {
    const rank = String(card.rank);
    // default target: next active player (wrap), or drawer if none
    let targetIdx = this.nextActiveIndex(players, drawerIdx);
    if (targetIdx === -1) targetIdx = drawerIdx;

    switch (rank) {
      case 'Freeze': {
        // target must immediately end their turn (stay)
        const t = players[targetIdx];
        t.hasStayed = true;
        t.isFrozen = true;
        t.isActive = false;
        t.hand.push({ ...card, isFaceUp: true });
        // nothing else to do
        break;
      }
      case 'TurnThree': {
        // target must draw next three cards, resolving numbers/modifiers; action cards revealed are set aside (not resolved now)
        const t = players[targetIdx];
        t.hand.push({ ...card, isFaceUp: true });
        const revealedActions: CardModel[] = [];
        for (let i = 0; i < 3; i++) {
          const next = deck.pop();
          if (!next) break;
          if (!next.suit || next.suit === 'number') {
            // number card
            // if duplicate
            const drawnRank = next.rank;
            const duplicateCount = t.hand.filter((h: any) => h.rank === drawnRank).length;
            t.hand.push({ ...next, isFaceUp: true });
            if (duplicateCount >= 1) {
              // would bust
              if (t.hasSecondChance) {
                // consume second chance: discard duplicate and remove second chance
                t.hand = t.hand.filter((h: any) => !(h.id === next.id));
                // Also remove the Second Chance card from hand
                const scIdx = t.hand.findIndex((h: any) => h.suit === 'action' && String(h.rank) === 'SecondChance');
                if (scIdx !== -1) t.hand.splice(scIdx, 1);
                t.hasSecondChance = false;
                // duplicate discarded, continue
              } else {
                t.hasBusted = true;
                t.isActive = false;
                // Flip this player's cards face-down when they bust during resolveActionOnDeal
                if (t.hand && t.hand.length > 0) {
                  t.hand = t.hand.map((c: any) => ({ ...c, isFaceUp: false }));
                }
                break;
              }
            }
            // check 7-unique handled later by checkRoundEnd
          } else if (next.suit === 'modifier') {
            t.hand.push({ ...next, isFaceUp: true });
          } else if (next.suit === 'action') {
            // Set aside: if SecondChance, give to player (if eligible), otherwise add to hand but don't resolve
            if (String(next.rank) === 'SecondChance') {
              this.giveSecondChance(players, targetIdx, next);
            } else {
              // add action card to player's hand to be used later (but not resolved now)
              t.reservedActions = t.reservedActions || [];
              t.reservedActions.push({ ...next, isFaceUp: true });
              t.hand.push({ ...next, isFaceUp: true });
              revealedActions.push(next);
              // console.log('Added to revealedActions:', next.id);
            }
          }
        }

        // If player busted, discard set-aside actions (Case 14/15)
        if (t.hasBusted) {
           revealedActions.forEach(a => {
             if (t.reservedActions) t.reservedActions = t.reservedActions.filter((r: any) => r.id !== a.id);
             t.hand = t.hand.filter((h: any) => h.id !== a.id);
           });
           // Discard the original TurnThree card when the player busts
           t.hand = t.hand.filter((h: any) => h.id !== card.id);
           deck; // no-op to preserve variable usage in some linting setups
           // add the TurnThree to a discard pile is handled by caller (performAction flow)
        } else {
           // Queue revealed actions
              if (t.isActive && revealedActions.length > 0) {
             t.pendingImmediateActionIds = t.pendingImmediateActionIds || [];
             revealedActions.forEach(a => t.pendingImmediateActionIds.push(a.id));
           }
           // Keep the original TurnThree card in the player's hand after resolution
        }
        break;
      }
      case 'SecondChance': {
        // Give to drawer if they don't have, otherwise pass to another active player or discard
        this.giveSecondChance(players, drawerIdx, card);
        break;
      }
      default:
        break;
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
