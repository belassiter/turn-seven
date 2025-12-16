import { GameState, ClientGameStateManager } from '@turn-seven/engine';
import { TurnSevenLogic, PlayerConfig } from '../logic/game';

export interface IGameService {
  start(players: PlayerConfig[]): Promise<void>;
  sendAction(action: { type: string; payload?: unknown }): Promise<void>;
  startNextRound(): Promise<void>;
  reset(): void;
  subscribe(callback: (state: GameState) => void): () => void;
  getState(): GameState | null;
}

export class LocalGameService implements IGameService {
  private logic: TurnSevenLogic;
  private manager: ClientGameStateManager | null = null;
  private simulatedLatencyMs: number = 300; // Simulate network lag
  private subscribers: ((state: GameState) => void)[] = [];

  constructor(initialState?: GameState) {
    this.logic = new TurnSevenLogic();
    if (initialState) {
      this.manager = new ClientGameStateManager(initialState);
      // Ensure we subscribe to the manager if we have one, so UI gets updates
      this.manager.subscribe((state) => {
        this.subscribers.forEach((cb) => cb(state));
      });
    }
  }

  async start(players: PlayerConfig[]): Promise<void> {
    await this.simulateLatency();
    const initialState = this.logic.createInitialStateFromConfig(players);
    this.manager = new ClientGameStateManager(initialState);

    // Subscribe to manager updates and forward to our subscribers
    this.manager.subscribe((state) => {
      this.subscribers.forEach((cb) => cb(state));
    });

    // Notify immediately
    this.subscribers.forEach((cb) => cb(initialState));
  }

  async sendAction(action: { type: string; payload?: unknown }): Promise<void> {
    if (!this.manager) {
      console.error('Game not started. Current state:', this.manager);
      throw new Error('Game not started');
    }
    await this.simulateLatency();

    const currentState = this.manager.getState();
    // Simulate serialization to ensure we don't rely on non-serializable data
    const serializedState = JSON.parse(JSON.stringify(currentState));

    const newState = this.logic.performAction(serializedState, action);
    this.manager.setState(newState);
  }

  async startNextRound(): Promise<void> {
    if (!this.manager) throw new Error('Game not started');
    await this.simulateLatency();

    const currentState = this.manager.getState();
    const newState = this.logic.startNextRound(currentState);
    this.manager.setState(newState);
  }

  reset(): void {
    this.manager = null;
  }

  subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.push(callback);
    if (this.manager) {
      callback(this.manager.getState());
    }
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  getState(): GameState | null {
    return this.manager ? this.manager.getState() : null;
  }

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
  }
}
