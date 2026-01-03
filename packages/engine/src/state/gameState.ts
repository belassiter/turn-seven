import { CardModel, PlayerModel } from '../types';

export type GameEventType =
  | 'DRAW'
  | 'PLAY_CARD'
  | 'ACTION_RESOLVED'
  | 'BUST'
  | 'TURN_SEVEN'
  | 'ROUND_END'
  | 'STAY'
  | 'DISCARD'
  | 'TRANSFER'
  | 'SHUFFLE_DISCARD'
  | 'DEAL'
  | 'NEW_ROUND'
  | 'LIFE_SAVED';

export interface GameEvent {
  type: GameEventType;
  playerId?: string; // The primary actor or target
  targetId?: string; // For interactions
  card?: CardModel; // The card involved
  cards?: CardModel[]; // For multi-card events (like dealing)
  timestamp: number;
  details?: string;
}

export interface LedgerEntry {
  roundNumber: number;
  playerName: string;
  action: string;
  targetName?: string;
  result: string;
  timestamp: number;
}

export interface GameState {
  players: PlayerModel[];
  currentPlayerId: string | null;
  // The ID of the player whose turn initiated the current action chain.
  // Used to determine who goes next after the chain resolves.
  turnOrderBaseId?: string | null;
  // The ID of the player who started the current round.
  roundStarterId?: string | null;
  deck: CardModel[];
  discardPile: CardModel[];
  gamePhase: 'initial' | 'playing' | 'ended' | 'gameover';
  winnerId?: string | null;
  roundNumber: number;
  previousTurnLog?: string;
  previousRoundScores?: {
    [playerId: string]: { score: number; resultType?: 'turn-seven' | 'bust' | 'normal' };
  };
  ledger: LedgerEntry[];
  lastTurnEvents?: GameEvent[];
}

// A simple in-memory store for the game state.
export class ClientGameStateManager {
  private state: GameState;
  private subscribers: ((state: GameState) => void)[] = [];

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  public getState(): GameState {
    return this.state;
  }

  public setState(newState: Partial<GameState>) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }

  public subscribe(callback: (state: GameState) => void) {
    this.subscribers.push(callback);
    // return an unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.state));
  }
}
