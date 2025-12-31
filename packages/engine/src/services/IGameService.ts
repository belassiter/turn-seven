import { GameState } from '../state/gameState';

export interface IGameService {
  // Starts the game with the given configuration.
  // For Local: Initializes state immediately.
  // For Remote: Host calls this to transition from Lobby to Playing.
  start(config: unknown): Promise<void>;

  // Sends an action to be processed.
  sendAction(action: { type: string; payload?: unknown }): Promise<void>;

  // Subscribes to state updates. Optional `gameId` allows subscribing
  // from a fresh service instance to a specific game without joining.
  subscribe(callback: (state: GameState) => void, gameId?: string): () => void;

  // Gets the current state synchronously (if available).
  getState(): GameState | null;

  // Resets the service (disconnects, clears state).
  reset(): void;
}

export interface LobbyState {
  gameId: string;
  hostName: string;
  players: { id: string; name: string; isHost: boolean; isBot?: boolean }[];
  status: 'lobby' | 'playing' | 'finished';
}

export interface IRemoteGameService extends IGameService {
  createGame(hostPlayerName: string): Promise<string>; // Returns gameId
  joinGame(gameId: string, playerName: string): Promise<string>;
  subscribeToLobby(callback: (lobby: LobbyState) => void, gameId?: string): () => void;
  addBot(gameId: string): Promise<void>;
  updateBotDifficulty?(gameId: string, botId: string, difficulty: string): Promise<void>;
  removePlayer?(gameId: string, playerId: string): Promise<void>;
}
