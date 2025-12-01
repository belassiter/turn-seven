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
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
    }));

    // Deal one card to each player to start.
    players.forEach(player => {
      const card = deck.pop();
      if (card) {
        player.hand.push({ ...card, isFaceUp: true });
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
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: 0,
    }));

    players.forEach(player => {
      const card = deck.pop();
      if (card) player.hand.push({ ...card, isFaceUp: true });
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
    switch (action.type) {
      case 'HIT':
        return this.handleHit(state);
      case 'STAY':
        return this.handleStay(state);
      default:
        return state;
    }
  }

  private handleHit(state: GameState): GameState {
    // Using structuredClone for deep cloning state, a modern and safe approach for immutability.
    const newState = structuredClone(state);
    const { players, deck, currentPlayerId } = newState;
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return newState;

    const card = deck.pop();
    if (card) {
      // If card is a number card and matches any existing number in the player's hand -> bust
      const isNumberCard = card.suit === 'number' || !card.suit;
      const drawnRank = card.rank;

      // Add the drawn card to the player's hand (the spec requires the busting card to appear in hand)
      currentPlayer.hand.push({ ...card, isFaceUp: true });

      if (isNumberCard && currentPlayer.hand.filter(h => h.rank === drawnRank).length > 1) {
        // bust: mark player as busted and inactive
        currentPlayer.hasBusted = true;
        currentPlayer.isActive = false;
      }
    }
    
    // TODO: check for bust condition based on Turn Seven rules.

    // After a hit, check for round end (no active players) or 7-unique condition
    this.checkRoundEnd(newState);
    return newState;
  }

  private handleStay(state: GameState): GameState {
    const newState = structuredClone(state);
    const { players, currentPlayerId } = newState;
    const currentPlayerIndex = players.findIndex((p: any) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return newState;

    // Mark current player as stayed and inactive for drawing
    players[currentPlayerIndex].hasStayed = true;
    players[currentPlayerIndex].isActive = false;

    // Find next active player
    const nextActiveIndex = players.findIndex((p: any, idx: number) => p.isActive && idx !== currentPlayerIndex);
    if (nextActiveIndex !== -1) {
      newState.currentPlayerId = players[nextActiveIndex].id;
    } else {
      // No active players left; end the round and compute scores
      newState.currentPlayerId = currentPlayerId;
      this.computeScores(newState);
      // computeScores may set gamePhase to 'gameover' if someone reached the win threshold.
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
      isActive: true,
      hasBusted: false,
      roundScore: 0,
      totalScore: p.totalScore ?? 0,
    }));

    // Deal one card to each player (face up)
    newState.players.forEach((p: any) => {
      const card = newState.deck.pop();
      if (card) p.hand.push({ ...card, isFaceUp: true });
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
