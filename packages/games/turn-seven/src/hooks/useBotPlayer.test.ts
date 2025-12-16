import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBotPlayer } from './useBotPlayer';
import { GameState, PlayerModel } from '@turn-seven/engine';

// Mock odds logic
vi.mock('../logic/odds', () => ({
  computeHitExpectation: vi.fn(),
  getFullDeckTemplate: vi.fn(() => []),
}));

import { computeHitExpectation } from '../logic/odds';

describe('useBotPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockState = (currentPlayerId: string, players: PlayerModel[]): GameState => ({
    players,
    currentPlayerId,
    deck: [],
    discardPile: [],
    gamePhase: 'playing',
    roundNumber: 1,
    ledger: [],
  });

  const createBot = (id: string, difficulty: 'easy' | 'medium' = 'medium'): PlayerModel => ({
    id,
    name: 'Bot',
    isBot: true,
    botDifficulty: difficulty,
    hand: [],
    isActive: true,
    hasStayed: false,
    hasBusted: false,
    isLocked: false,
    pendingImmediateActionIds: [],
    roundScore: 0,
    totalScore: 0,
  });

  it('should trigger Hit when expectation is positive (Medium difficulty)', () => {
    const bot = createBot('p1', 'medium');
    // Mock hand score = 10
    bot.hand = [{ id: 'c1', suit: 'number', rank: '10', isFaceUp: true }];

    const state = createMockState('p1', [bot]);

    // Mock expectation > current score (10)
    vi.mocked(computeHitExpectation).mockReturnValue({
      expectedScore: 15,
      bustProbability: 0,
      turn7Probability: 0,
    });

    const onHit = vi.fn();
    const onStay = vi.fn();
    const onTargetPlayer = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        targetingState: null,
        onStartTargeting: vi.fn(),
        onHit,
        onStay,
        onTargetPlayer,
      })
    );

    // Fast-forward timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onHit).toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });

  it('should trigger Stay when expectation is not positive', () => {
    const bot = createBot('p1', 'medium');
    bot.hand = [{ id: 'c1', suit: 'number', rank: '10', isFaceUp: true }];

    const state = createMockState('p1', [bot]);

    // Mock expectation <= current score (10)
    vi.mocked(computeHitExpectation).mockReturnValue({
      expectedScore: 8,
      bustProbability: 0,
      turn7Probability: 0,
    });

    const onHit = vi.fn();
    const onStay = vi.fn();
    const onTargetPlayer = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        targetingState: null,
        onStartTargeting: vi.fn(),
        onHit,
        onStay,
        onTargetPlayer,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onStay).toHaveBeenCalled();
    expect(onHit).not.toHaveBeenCalled();
  });

  it('should call onStartTargeting if bot has pending immediate actions', () => {
    const bot = createBot('p1');
    bot.pendingImmediateActionIds = ['card-turn-three'];

    const state = createMockState('p1', [bot]);
    const onStartTargeting = vi.fn();
    const onHit = vi.fn();
    const onStay = vi.fn();
    const onTargetPlayer = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        targetingState: null,
        onStartTargeting,
        onHit,
        onStay,
        onTargetPlayer,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onStartTargeting).toHaveBeenCalledWith('card-turn-three', 'p1');
  });

  it('should handle targeting logic when targetingState is present', () => {
    const bot = createBot('p1');
    bot.hand = [{ id: 'card-lock', suit: 'action', rank: 'Lock', isFaceUp: true }];
    const p2 = { ...createBot('p2'), isBot: false, totalScore: 100 }; // Leader
    const p3 = { ...createBot('p3'), isBot: false, totalScore: 50 };

    const state = createMockState('p1', [bot, p2, p3]);

    const targetingState = {
      cardId: 'card-lock',
      actorId: 'p1',
    };

    const onHit = vi.fn();
    const onStay = vi.fn();
    const onTargetPlayer = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        targetingState,
        onStartTargeting: vi.fn(),
        onHit,
        onStay,
        onTargetPlayer,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should target p2 (highest score) for Lock
    expect(onTargetPlayer).toHaveBeenCalledWith('p2');
  });
});
