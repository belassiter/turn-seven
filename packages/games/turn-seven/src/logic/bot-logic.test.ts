import { describe, it, expect } from 'vitest';
import { GameState, PlayerModel, CardModel } from '@turn-seven/engine';
import { decideMove, decideTarget } from './bot-logic';

describe('decideMove', () => {
  const createPlayer = (
    id: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'omg',
    hand: CardModel[]
  ): PlayerModel => ({
    id,
    name: `Bot_${id}`,
    isBot: true,
    botDifficulty: difficulty,
    hand,
    isActive: true,
    hasStayed: false,
    hasBusted: false,
    isLocked: false,
    pendingImmediateActionIds: [],
    roundScore: 0,
    totalScore: 0,
  });

  const createGameState = (players: PlayerModel[], deck: CardModel[]): GameState => ({
    players,
    currentPlayerId: players[0]?.id || 'p1',
    deck,
    discardPile: [],
    gamePhase: 'playing',
    roundNumber: 1,
    ledger: [],
  });

  it('should sometimes HIT for easy difficulty', () => {
    const player = createPlayer('p1', 'easy', []);
    const gameState = createGameState([player], []);
    const move = decideMove(player, gameState);
    expect(['HIT', 'STAY']).toContain(move.type);
  });

  it('should return HIT for medium bot if score is expected to increase', () => {
    // Hand of 10, deck has only a 2. Bust is impossible. Expected score is 12.
    const player = createPlayer('p1', 'medium', [{ id: 'c1', rank: '10', suit: 'number' }]);
    const deck = [{ id: 'c2', rank: '2', suit: 'number' }];
    const gameState = createGameState([player], deck);
    const move = decideMove(player, gameState);
    expect(move.type).toBe('HIT');
  });

  it('should return STAY for omg bot if bust chance is high', () => {
    // Hand of 20, deck has only a 10 (bust) and a 1 (no bust).
    // An intelligent bot should know the deck for Blue/Purple.
    const player = createPlayer('p1', 'omg', [
      { id: 'c1', rank: '10', suit: 'number' },
      { id: 'c2', rank: '10', suit: 'number' },
    ]);
    const deck = [
      { id: 'c3', rank: '10', suit: 'number' },
      { id: 'c4', rank: '1', suit: 'number' },
    ];
    const gameState = createGameState([player], deck);
    const move = decideMove(player, gameState);
    // Note: The actual logic is based on expected score, not just bust prob.
    // With hand=20, hitting for a 1 gives 21. Hitting for a 10 gives 0.
    // Expected score = (21 * 0.5) + (0 * 0.5) = 10.5. This is < 20, so STAY.
    expect(move.type).toBe('STAY');
  });
});

describe('decideTarget', () => {
  const createPlayer = (id: string, totalScore: number): PlayerModel => ({
    id,
    name: `Player_${id}`,
    isBot: true,
    botDifficulty: 'hard', // Assume hard for targeting logic
    hand: [],
    isActive: true,
    hasStayed: false,
    hasBusted: false,
    isLocked: false,
    pendingImmediateActionIds: [],
    roundScore: 0,
    totalScore,
  });

  const createGameState = (players: PlayerModel[]): GameState => ({
    players,
    currentPlayerId: players[0]?.id || 'p1',
    deck: [],
    discardPile: [],
    gamePhase: 'playing',
    roundNumber: 1,
    ledger: [],
  });

  it('should target the player with the highest score for a "Lock" card', () => {
    const bot = createPlayer('p1', 50);
    const p2_leader = createPlayer('p2', 150);
    const p3_middle = createPlayer('p3', 100);
    const gameState = createGameState([bot, p2_leader, p3_middle]);

    const target = decideTarget(bot, gameState, {
      validTargets: ['p2', 'p3'],
      sourceCard: { id: 'c1', rank: 'Lock', suit: 'action', isFaceUp: true },
    });

    expect(target).toBe('p2'); // p2 is the leader
  });

  it('should target the player with the lowest score for a "LifeSaver" card', () => {
    const bot = createPlayer('p1', 100);
    const p2_losing = createPlayer('p2', 20);
    const p3_middle = createPlayer('p3', 80);
    const gameState = createGameState([bot, p2_losing, p3_middle]);

    const target = decideTarget(bot, gameState, {
      validTargets: ['p2', 'p3'],
      sourceCard: { id: 'c1', rank: 'LifeSaver', suit: 'action', isFaceUp: true },
    });

    expect(target).toBe('p2'); // p2 is the underdog
  });
});
