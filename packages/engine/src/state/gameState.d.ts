import { CardModel } from '../components/Card';
import { PlayerModel } from '../components/GameBoard';
export interface GameState {
    players: PlayerModel[];
    currentPlayerId: string | null;
    deck: CardModel[];
    discardPile: CardModel[];
    gamePhase: 'initial' | 'playing' | 'ended' | 'gameover';
    winnerId?: string | null;
}
export declare class ClientGameStateManager {
    private state;
    private subscribers;
    constructor(initialState: GameState);
    getState(): GameState;
    setState(newState: Partial<GameState>): void;
    subscribe(callback: (state: GameState) => void): () => void;
    private notifySubscribers;
}
