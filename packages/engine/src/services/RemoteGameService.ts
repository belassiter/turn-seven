import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  getDoc,
  DocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, functions } from '../firebase'; // Assuming this exports the initialized firestore instance
import { IRemoteGameService, LobbyState } from './IGameService';
import { GameState } from '../state/gameState';
import { PlayerModel } from '../types';

export class RemoteGameService implements IRemoteGameService {
  private gameId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private lobbyUnsubscribe: (() => void) | null = null;
  private currentState: GameState | null = null;

  private async ensureAuth() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  }

  async createGame(hostPlayerName: string): Promise<string> {
    await this.ensureAuth();

    // Generate short code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let gameId = '';
    for (let i = 0; i < 6; i++) {
      gameId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newGameRef = doc(db, 'games', gameId);

    const initialData = {
      hostName: hostPlayerName,
      status: 'lobby',
      createdAt: Date.now(),
      players: [
        {
          id: 'p1', // Host is always p1 initially? Or use Auth UID? For now simple.
          name: hostPlayerName,
          isHost: true,
          slotIndex: 0,
        },
      ],
      gameState: null, // Will be populated on start
    };

    await setDoc(newGameRef, initialData);
    this.gameId = gameId;
    return gameId;
  }

  async joinGame(gameId: string, playerName: string): Promise<string> {
    await this.ensureAuth();
    // Uppercase the gameId to match generation
    const normalizedGameId = gameId.toUpperCase();
    const gameRef = doc(db, 'games', normalizedGameId);

    // In a real app, we'd check if game exists and is in lobby state.
    // We'd also probably use a Cloud Function to join to prevent race conditions on slots.
    // For MVP/V1, we'll just push to the array.

    // We need a unique ID for the player.
    // For now, let's generate a random one or rely on the server to assign.
    // But arrayUnion takes the whole object.
    const playerId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await updateDoc(gameRef, {
      players: arrayUnion({
        id: playerId,
        name: playerName,
        isHost: false,
      }),
    });

    this.gameId = normalizedGameId;
    return playerId;
  }

  async addBot(gameId: string): Promise<void> {
    await this.ensureAuth();
    const gameRef = doc(db, 'games', gameId);
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const BOT_NAMES = [
      'C-3PO',
      'R2-D2',
      'HAL 9000',
      'Data',
      'Wall-E',
      'Bender',
      'GLaDOS',
      'Cortana',
    ];
    const botName = `🤖 ${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]}`;

    await updateDoc(gameRef, {
      players: arrayUnion({
        id: botId,
        name: botName,
        isHost: false,
        isBot: true,
        botDifficulty: 'medium',
      }),
    });
  }

  async updateBotDifficulty(gameId: string, botId: string, difficulty: string): Promise<void> {
    await this.ensureAuth();
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const players = (data?.players as PlayerModel[]) || [];

    const updatedPlayers = players.map((p) => {
      if (p.id === botId) {
        return { ...p, botDifficulty: difficulty };
      }
      return p;
    });

    await updateDoc(gameRef, { players: updatedPlayers });
  }

  async removePlayer(gameId: string, playerId: string): Promise<void> {
    await this.ensureAuth();
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const players =
      (data?.players as {
        id: string;
        name?: string;
        isHost?: boolean;
        isBot?: boolean;
      }[]) || [];
    const filtered = players.filter((p) => p.id !== playerId);
    await updateDoc(gameRef, { players: filtered });
  }

  subscribeToLobby(callback: (lobby: LobbyState) => void, gameId?: string): () => void {
    const id = gameId ?? this.gameId;
    if (!id) {
      console.warn('Attempted to subscribe to lobby without a gameId');
      return () => {};
    }

    const gameRef = doc(db, 'games', id);

    this.lobbyUnsubscribe = onSnapshot(gameRef, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data) {
          const lobbyState: LobbyState = {
            gameId: snapshot.id,
            hostName: data.hostName,
            players: data.players || [],
            status: data.status,
          };
          callback(lobbyState);
        }
      }
    });

    return () => {
      if (this.lobbyUnsubscribe) {
        this.lobbyUnsubscribe();
        this.lobbyUnsubscribe = null;
      }
    };
  }

  async start(config: unknown): Promise<void> {
    if (!this.gameId) throw new Error('No game active');
    await this.ensureAuth();

    // Call the Cloud Function to initialize the game state
    const startGameFunc = httpsCallable(functions, 'performAction'); // We might reuse performAction or make a new one

    // Actually, 'start' is just an action: 'INIT_GAME'
    await startGameFunc({
      gameId: this.gameId,
      action: { type: 'INIT_GAME', payload: config },
    });
  }

  async sendAction(action: { type: string; payload?: unknown }): Promise<void> {
    if (!this.gameId) throw new Error('No game active');
    await this.ensureAuth();

    const performActionFunc = httpsCallable(functions, 'performAction');

    await performActionFunc({
      gameId: this.gameId,
      action,
    });
  }

  subscribe(callback: (state: GameState) => void, gameId?: string): () => void {
    const id = gameId ?? this.gameId;
    if (!id) {
      console.warn('Attempted to subscribe without a gameId');
      return () => {};
    }

    const gameRef = doc(db, 'games', id);

    this.unsubscribe = onSnapshot(gameRef, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.gameState) {
          this.currentState = data.gameState as GameState;
          callback(this.currentState);
        }
      }
    });

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  getState(): GameState | null {
    return this.currentState;
  }

  reset(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.lobbyUnsubscribe) {
      this.lobbyUnsubscribe();
      this.lobbyUnsubscribe = null;
    }
    this.gameId = null;
    this.currentState = null;
  }
}
