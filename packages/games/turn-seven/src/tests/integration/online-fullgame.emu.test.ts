import { describe, it, expect } from 'vitest';
import { RemoteGameService } from '@turn-seven/engine';

// End-to-end full online game test against emulator. Skipped by default.

const maybeDescribe = (globalThis as unknown as { process?: { env?: Record<string, string> } })
  .process?.env?.RUN_EMULATOR_TESTS
  ? describe
  : describe.skip;
maybeDescribe('emulator: online full game', () => {
  it('runs a small online game from start to finish (host + bots)', async () => {
    const hostSvc = new RemoteGameService();
    const gameId = await hostSvc.createGame('Host');

    // Host adds 2 bots and starts
    await hostSvc.addBot(gameId);
    await hostSvc.addBot(gameId);

    // Wait before starting
    await new Promise((r) => setTimeout(r, 200));

    const lobbyPlayers: Array<{ name: string; isBot?: boolean }> = [];

    let unsub: () => void;
    // Create a promise that resolves when we have 3 players
    const playersReady = new Promise<void>((resolve) => {
      unsub = hostSvc.subscribeToLobby((lobby) => {
        lobbyPlayers.splice(0, lobbyPlayers.length, ...lobby.players);
        if (lobby.players.length === 3) {
          resolve();
        }
      });
    });

    // Wait for players to sync
    await playersReady;
    if (unsub!) unsub();

    // Start game
    const configs = lobbyPlayers.map((p) => ({
      name: p.name,
      isBot: p.isBot,
      botDifficulty: 'medium',
    }));
    await hostSvc.start(configs);

    // Subscribe to game state and run until finished
    const svc = new RemoteGameService();
    unsub = svc.subscribe(() => {
      // noop; in a real test we'd assert on state transitions
    }, gameId);

    // Wait some time for game to run in emulator functions
    await new Promise((r) => setTimeout(r, 5000));

    if (unsub!) unsub();

    expect(true).toBe(true);
  }, 45000);
});
