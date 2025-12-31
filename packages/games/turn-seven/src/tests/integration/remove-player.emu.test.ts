import { describe, it, expect } from 'vitest';
import { RemoteGameService } from '@turn-seven/engine';

// Integration test against emulator. This test is marked slow; it requires the emulator running.

const maybeDescribe = (globalThis as unknown as { process?: { env?: Record<string, string> } })
  .process?.env?.RUN_EMULATOR_TESTS
  ? describe
  : describe.skip;
maybeDescribe('emulator: remove-player end-to-end', () => {
  it('creates game, joins player, removes player and verifies lobby update', async () => {
    const svcHost = new RemoteGameService();
    const gameId = await svcHost.createGame('Host');

    const svcJoin = new RemoteGameService();
    const joinerId = await svcJoin.joinGame(gameId, 'Joiner');

    // Wait a tick for firestore updates to propagate in emulator
    await new Promise((r) => setTimeout(r, 300));

    // Host removes Joiner
    await svcHost.removePlayer(gameId, joinerId);

    // Read back via new service.
    const verifier = new RemoteGameService();
    let seen = false;
    const unsub = verifier.subscribeToLobby((lobby) => {
      if (!lobby.players.find((p) => p.name === 'Joiner')) seen = true;
    }, gameId);

    await new Promise((r) => setTimeout(r, 500));
    unsub();

    expect(seen).toBe(true);
  });
});
