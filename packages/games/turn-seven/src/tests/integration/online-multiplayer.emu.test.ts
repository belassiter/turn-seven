import { describe, it, expect } from 'vitest';
import { RemoteGameService, GameState, LobbyState } from '@turn-seven/engine';

// Integration test for multiplayer interaction (Host + Human Joiner)
// This ensures that a joined player can actually perform actions when it's their turn.

const maybeDescribe = (globalThis as unknown as { process?: { env?: Record<string, string> } })
  .process?.env?.RUN_EMULATOR_TESTS
  ? describe
  : describe.skip;

maybeDescribe('emulator: online multiplayer', () => {
  it('allows joined player to play when it is their turn', async () => {
    // 1. Host creates game
    const hostSvc = new RemoteGameService();
    const gameId = await hostSvc.createGame('Host');

    // 2. Joiner joins game
    const joinerSvc = new RemoteGameService();
    const joinerId = await joinerSvc.joinGame(gameId, 'Joiner');

    // 3. Host starts game
    // Wait for join to propagate to lobby (optional, but good practice)
    await new Promise((r) => setTimeout(r, 500));

    // Get lobby state to confirm players
    let lobbyPlayers: LobbyState['players'] = [];
    const unsubLobby = hostSvc.subscribeToLobby((lobby) => {
      lobbyPlayers = lobby.players;
    }, gameId);

    // Wait for lobby update
    await new Promise((r) => setTimeout(r, 500));
    unsubLobby();

    expect(lobbyPlayers.length).toBeGreaterThanOrEqual(2);

    // Start game with current lobby players
    const configs = lobbyPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: false,
    }));
    await hostSvc.start(configs);

    // 4. Subscribe to game state for both
    let hostState: any = null;
    let joinerState: any = null;

    const unsubHost = hostSvc.subscribe((s) => {
      hostState = s;
    }, gameId);
    const unsubJoiner = joinerSvc.subscribe((s) => {
      joinerState = s;
    }, gameId);

    // Wait for game start
    await new Promise((r) => setTimeout(r, 2000));

    expect(hostState).not.toBeNull();
    expect(joinerState).not.toBeNull();
    expect(hostState.gamePhase).toBe('playing');

    // 5. Determine whose turn it is
    // Usually Host (p1) goes first, but let's check
    let currentPlayerId = hostState.currentPlayerId;
    console.log('Current player:', currentPlayerId);

    // If it's Host's turn, Host hits/stays
    if (currentPlayerId === lobbyPlayers.find((p) => p.isHost)?.id) {
      console.log('Host turn, Host hitting...');
      await hostSvc.sendAction({ type: 'HIT' });
      await new Promise((r) => setTimeout(r, 1000));
      // Check if turn changed or state updated
      expect(hostState.previousTurnLog).toContain('Host hit');
    }

    // If it's Joiner's turn (or became Joiner's turn)
    currentPlayerId = hostState.currentPlayerId;
    if (currentPlayerId === joinerId) {
      console.log('Joiner turn, Joiner hitting...');
      // THIS IS THE CRITICAL CHECK: Can the joiner service send an action?
      await joinerSvc.sendAction({ type: 'HIT' });
      await new Promise((r) => setTimeout(r, 1000));
      expect(hostState.previousTurnLog).toContain('Joiner hit');
    } else {
      // If it's still Host's turn, maybe Host needs to Stay to pass turn?
      // For this test, we just want to verify Joiner CAN act.
      // Let's force Host to Stay until it's Joiner's turn.
      while (hostState.currentPlayerId !== joinerId && hostState.gamePhase === 'playing') {
        console.log('Still Host turn, Host staying...');
        await hostSvc.sendAction({ type: 'STAY' });
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (hostState.gamePhase === 'playing' && hostState.currentPlayerId === joinerId) {
        console.log('Now Joiner turn, Joiner hitting...');
        await joinerSvc.sendAction({ type: 'HIT' });
        await new Promise((r) => setTimeout(r, 1000));
        expect(hostState.previousTurnLog).toContain('Joiner hit');
      }
    }

    unsubHost();
    unsubJoiner();
  }, 30000);
});
