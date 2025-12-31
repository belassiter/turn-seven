import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteGameService } from './RemoteGameService';
import { GameState } from '../state/gameState';

// Hoist mocks so they can be used in vi.mock
const {
  mockDoc,
  mockCollection,
  mockSetDoc,
  mockUpdateDoc,
  mockOnSnapshot,
  mockHttpsCallable,
  mockFirestore,
  mockFunctions,
  mockAuth,
  mockSignInAnonymously,
  mockGetDoc,
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn(),
    mockCollection: vi.fn(),
    mockSetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockOnSnapshot: vi.fn(),
    mockHttpsCallable: vi.fn(),
    mockFirestore: {},
    mockFunctions: {},
    mockAuth: { currentUser: null },
    mockSignInAnonymously: vi.fn(),
    mockGetDoc: vi.fn(),
  };
});

// Add getDoc mock later for removePlayer test

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDoc: (...args: unknown[]) =>
    mockGetDoc ? mockGetDoc(...args) : Promise.resolve({ exists: () => false }),
  arrayUnion: (val: unknown) => ({ type: 'arrayUnion', val }),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: () => mockFunctions,
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
}));

vi.mock('../firebase', () => ({
  db: mockFirestore,
  functions: mockFunctions,
  auth: mockAuth,
}));

describe('RemoteGameService', () => {
  let service: RemoteGameService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemoteGameService();
  });

  it('should create a game and return the gameId', async () => {
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' });
    const gameId = await service.createGame('HostPlayer');

    // expect(mockCollection).toHaveBeenCalledWith(mockFirestore, 'games'); // No longer used
    expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'games', gameId);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(), // The doc ref
      expect.objectContaining({
        hostName: 'HostPlayer',
        status: 'lobby',
        players: expect.arrayContaining([
          expect.objectContaining({ name: 'HostPlayer', isHost: true }),
        ]),
      })
    );
    expect(gameId).toHaveLength(6);
  });

  it('should join an existing game', async () => {
    const gameId = 'existing-game-id';
    const playerName = 'Joiner';

    // Mock doc ref
    const mockGameRef = { id: gameId };
    mockDoc.mockReturnValue(mockGameRef);

    // Mock transaction or update. For simplicity, let's assume updateDoc for now,
    // though real impl might use transaction to prevent race conditions.
    // But wait, joining usually requires reading current players first.
    // Let's assume the service uses updateDoc with arrayUnion or similar,
    // OR it reads then writes.
    // For this test, let's assume it just calls updateDoc to add the player.

    // Actually, a robust join should probably be a Cloud Function to handle race conditions?
    // Or we can use Firestore arrayUnion.
    // Let's assume arrayUnion for now, or just a simple update for the test.

    // We need to mock getDoc or similar if the service checks existence.
    // Let's just test that it tries to update the document.

    await service.joinGame(gameId, playerName);

    expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'games', gameId.toUpperCase());
    // We expect an update to the players array
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should subscribe to game state changes', async () => {
    const gameId = 'test-game-id';
    const callback = vi.fn();

    // Setup internal state so subscribe knows what to listen to
    mockDoc.mockReturnValue({ id: gameId });
    await service.createGame('Host'); // Sets internal gameId

    const unsubscribe = service.subscribe(callback);

    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(unsubscribe).toBeInstanceOf(Function);

    // Simulate a snapshot update
    const mockState = { roundNumber: 1 } as GameState;
    const mockSnapshot = {
      exists: () => true,
      data: () => ({ gameState: mockState }),
    };

    // Get the callback passed to onSnapshot
    const snapshotCallback = mockOnSnapshot.mock.calls[0][1];
    snapshotCallback(mockSnapshot);

    expect(callback).toHaveBeenCalledWith(mockState);
  });

  it('should call cloud function when sending action', async () => {
    const generatedId = await service.createGame('Host');

    const mockPerformAction = vi.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(mockPerformAction);

    const action = { type: 'HIT' };
    await service.sendAction(action);

    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'performAction');
    expect(mockPerformAction).toHaveBeenCalledWith({
      gameId: generatedId,
      action,
    });
  });

  it('should remove player by id (read-modify-write)', async () => {
    const gameId = 'GID123';
    const players = [
      { id: 'p1', name: 'Host', isHost: true },
      { id: 'p2', name: 'Alice' },
      { id: 'p3', name: 'Bob' },
    ];

    mockDoc.mockReturnValue({ id: gameId });
    const mockSnap = {
      exists: () => true,
      data: () => ({ players }),
    };
    // Provide mocked getDoc result
    mockGetDoc.mockResolvedValue(mockSnap);

    await service.removePlayer(gameId, 'p2');

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      players: players.filter((p) => p.id !== 'p2'),
    });
  });
});
