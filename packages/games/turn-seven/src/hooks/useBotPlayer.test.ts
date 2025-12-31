import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBotPlayer } from './useBotPlayer';
import { GameState, PlayerModel } from '@turn-seven/engine';
import { decideMove, decideTarget } from '../logic/bot-logic';

// Mock the actual bot logic module
vi.mock('../logic/bot-logic', () => ({
  decideMove: vi.fn(),
  decideTarget: vi.fn(),
}));

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

  const createBot = (id: string): PlayerModel => ({
    id,
    name: 'Bot',
    isBot: true,
    botDifficulty: 'medium',
    hand: [],
    isActive: true,
    hasStayed: false,
    hasBusted: false,
    isLocked: false,
    pendingImmediateActionIds: [],
    roundScore: 0,
    totalScore: 0,
  });

  it('should call onHit when decideMove returns HIT', () => {
    const bot = createBot('p1');
    const state = createMockState('p1', [bot]);
    vi.mocked(decideMove).mockReturnValue({ type: 'HIT' });

    const onHit = vi.fn();
    const onStay = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        isHost: true,
        targetingState: null,
        onStartTargeting: vi.fn(),
        onHit,
        onStay,
        onTargetPlayer: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(decideMove).toHaveBeenCalledWith(bot, state);
    expect(onHit).toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });

  it('should call onStay when decideMove returns STAY', () => {
    const bot = createBot('p1');
    const state = createMockState('p1', [bot]);
    vi.mocked(decideMove).mockReturnValue({ type: 'STAY' });

    const onHit = vi.fn();
    const onStay = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        isHost: true,
        targetingState: null,
        onStartTargeting: vi.fn(),
        onHit,
        onStay,
        onTargetPlayer: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(decideMove).toHaveBeenCalledWith(bot, state);
    expect(onStay).toHaveBeenCalled();
    expect(onHit).not.toHaveBeenCalled();
  });

  it('should call onStartTargeting if bot has pending immediate actions', () => {
    const bot = createBot('p1');
    bot.pendingImmediateActionIds = ['card-turn-three'];
    const state = createMockState('p1', [bot]);
    const onStartTargeting = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        isHost: true,
        targetingState: null,
        onStartTargeting,
        onHit: vi.fn(),
        onStay: vi.fn(),
        onTargetPlayer: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onStartTargeting).toHaveBeenCalledWith('card-turn-three', 'p1');
    expect(decideMove).not.toHaveBeenCalled();
  });

  it('should call onTargetPlayer when targetingState is present', () => {
    const bot = createBot('p1');
    bot.hand = [{ id: 'card-lock', suit: 'action', rank: 'Lock', isFaceUp: true }];
    const p2 = { ...createBot('p2'), isBot: false };
    const p3 = { ...createBot('p3'), isBot: false };
    const state = createMockState('p1', [bot, p2, p3]);

    const targetingState = { cardId: 'card-lock', actorId: 'p1' };
    vi.mocked(decideTarget).mockReturnValue('p2'); // Mock the decision
    const onTargetPlayer = vi.fn();

    renderHook(() =>
      useBotPlayer({
        gameState: state,
        currentPlayer: bot,
        isAnimating: false,
        isInputLocked: false,
        isHost: true,
        targetingState,
        onStartTargeting: vi.fn(),
        onHit: vi.fn(),
        onStay: vi.fn(),
        onTargetPlayer,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // We expect decideTarget to be called with the correct context
    expect(decideTarget).toHaveBeenCalled();
    // And we expect the hook to execute the result of that decision
    expect(onTargetPlayer).toHaveBeenCalledWith('p2');
  });
});
