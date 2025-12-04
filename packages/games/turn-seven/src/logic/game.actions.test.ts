import { describe, it, expect } from 'vitest';
import { TurnSevenLogic } from './game';
import type { GameState } from '@turn-seven/engine';

// Subclass to access private methods for testing
class TestableTurnSevenLogic extends TurnSevenLogic {
  public invokeResolveActionOnDeal(players: any[], drawerIdx: number, card: any, deck: any[]) {
    // @ts-ignore - accessing private method
    return this.resolveActionOnDeal(players, drawerIdx, card, deck);
  }
}

describe('Action card behavior', () => {
  const logic = new TurnSevenLogic();
  const testLogic = new TestableTurnSevenLogic();

  it('plays Freeze against target and forces them to stay', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'Lock', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find(p => p.id === 'p2')!;
    expect(p2.hasStayed).toBe(true);
    expect(p2.isActive).toBe(false);
  });

  it('plays SecondChance to give a target second chance', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a2', suit: 'action', rank: 'LifeSaver', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a2', targetId: 'p2' } });
    const p2 = after.players.find(p => p.id === 'p2')!;
    expect(p2.hasLifeSaver).toBe(true);
  });

  it('TurnThree forces target to draw up to 3 cards and honors SecondChance', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a3', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [{ id: 'c1', suit: 'number', rank: '5', isFaceUp: true }], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // deck top: first pop => 'c2' (duplicate 5) then 'm1' modifier then 'n1' number
      deck: [ { id: 'n1', suit: 'number', rank: '6', isFaceUp: false } as any, { id: 'm1', suit: 'modifier', rank: '+2', isFaceUp: false } as any, { id: 'c2', suit: 'number', rank: '5', isFaceUp: false } as any ],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a3', targetId: 'p2' } });
    const p2 = after.players.find(p => p.id === 'p2')!;
    // because p2 already had a 5 and drew a duplicate 5 first, they should bust (no second chance)
    expect(p2.hasBusted).toBe(true);
  });

  it('TurnThree reveals an Action card which is added to reservedActions', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false },
      ],
      currentPlayerId: 'p1',
      // Deck has a Freeze card on top
      deck: [{ id: 'a2', suit: 'action', rank: 'Lock', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find(p => p.id === 'p2')!;
    
    // Should have the Freeze card in hand AND reservedActions
    // Hand has 2 cards: TurnThree (played) + Freeze (revealed)
    expect(p2.hand).toHaveLength(2);
    expect(p2.hand.some((c: any) => c.rank === 'Lock')).toBe(true);
    expect(p2.hand.some((c: any) => c.rank === 'TurnThree')).toBe(true);
    expect(p2.reservedActions).toHaveLength(1);
    expect(p2.reservedActions![0].rank).toBe('Lock');
  });

  it('SecondChance passes to next eligible player if target already has one', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'LifeSaver', isFaceUp: true }] as any },
        { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true, hasBusted: false, hasLifeSaver: true }, // Already has one
        { id: 'p3', name: 'P3', hand: [], hasStayed: false, isActive: true, hasBusted: false, hasLifeSaver: false }, // Needs one
      ],
      currentPlayerId: 'p1',
      deck: [],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    const p2 = after.players.find(p => p.id === 'p2')!;
    const p3 = after.players.find(p => p.id === 'p3')!;

    expect(p2.hasLifeSaver).toBe(true); // Still has it
    expect(p3.hasLifeSaver).toBe(true); // Received the passed one
  });

  it('resolveActionOnDeal: Freeze queues action for drawer', () => {
    const players = [
      { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, reservedActions: [], pendingImmediateActionIds: [] },
      { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true },
    ];
    const deck: any[] = [];
    const freezeCard = { id: 'a1', suit: 'action', rank: 'Lock' };

    // P1 draws Freeze.
    testLogic.invokeResolveActionOnDeal(players, 0, freezeCard, deck);

    // P1 should have pending action
    expect(players[0].pendingImmediateActionIds).toContain('a1');
    expect(players[0].reservedActions).toHaveLength(1);
    
    // P2 should NOT be frozen
    expect(players[1].hasStayed).toBe(false);
  });

  it('resolveActionOnDeal: TurnThree queues action for drawer', () => {
    const players = [
      { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, reservedActions: [], pendingImmediateActionIds: [] },
      { id: 'p2', name: 'P2', hand: [], hasStayed: false, isActive: true },
    ];
    const deck = [
      { id: 'c1', suit: 'number', rank: '1' },
    ];
    const turnThreeCard = { id: 'a1', suit: 'action', rank: 'TurnThree' };

    // P1 draws TurnThree.
    testLogic.invokeResolveActionOnDeal(players, 0, turnThreeCard, deck);

    // P1 should have pending action
    expect(players[0].pendingImmediateActionIds).toContain('a1');
    
    // P2 should NOT have drawn cards
    expect(players[1].hand).toHaveLength(0);
    expect(deck).toHaveLength(1);
  });

  it('TurnThree triggers round end immediately if target collects 7 unique cards', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [{ id: 'a1', suit: 'action', rank: 'TurnThree', isFaceUp: true }] as any },
        { 
          id: 'p2', 
          name: 'P2', 
          hand: [
            { id: 'c1', suit: 'number', rank: '1', isFaceUp: true },
            { id: 'c2', suit: 'number', rank: '2', isFaceUp: true },
            { id: 'c3', suit: 'number', rank: '3', isFaceUp: true },
            { id: 'c4', suit: 'number', rank: '4', isFaceUp: true },
            { id: 'c5', suit: 'number', rank: '5', isFaceUp: true },
            { id: 'c6', suit: 'number', rank: '6', isFaceUp: true },
          ], 
          hasStayed: false, 
          isActive: true, 
          hasBusted: false 
        },
      ],
      currentPlayerId: 'p1',
      // Deck has the 7th unique card
      deck: [{ id: 'c7', suit: 'number', rank: '7', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    const after = logic.performAction(state, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p2' } });
    
    // P2 should have 8 cards: 7 number cards + 1 TurnThree card
    const p2 = after.players.find(p => p.id === 'p2')!;
    expect(p2.hand).toHaveLength(8);
    
    // Round should be ended (or gameover if score is high enough, but here just ended)
    // Note: checkRoundEnd sets gamePhase to 'ended' or 'gameover'
    expect(after.gamePhase).toMatch(/ended|gameover/);
    
    // P2 should have the bonus
    // 1+2+3+4+5+6+7 = 28. Bonus 15. Total 43.
    expect(p2.roundScore).toBe(43);
  });

  it('Action card drawn via HIT must be resolved immediately (blocks HIT/STAY)', () => {
    const state: GameState = {
      players: [
        { id: 'p1', name: 'P1', hand: [], hasStayed: false, isActive: true, hasBusted: false, reservedActions: [], pendingImmediateActionIds: [] },
      ],
      currentPlayerId: 'p1',
      deck: [{ id: 'a1', suit: 'action', rank: 'Lock', isFaceUp: false } as any],
      discardPile: [],
      gamePhase: 'playing'
    } as any;

    // 1. HIT to draw Freeze
    let after = logic.performAction(state, { type: 'HIT' });
    let p1 = after.players[0];
    expect(p1.reservedActions).toHaveLength(1);
    expect(p1.reservedActions![0].rank).toBe('Lock');
    expect(p1.pendingImmediateActionIds).toContain('a1');

    // 2. Try to HIT again -> should be blocked (state unchanged)
    // Note: performAction returns a new object usually, but if blocked it returns state.
    // However, structuredClone might be used inside handleHit before check?
    // Let's check handleHit implementation.
    // It clones state first. But if blocked, does it return original or clone?
    // My implementation:
    // if (currentPlayer.pendingImmediateActionIds && ...) { return newState; }
    // Wait, handleHit does `const newState = structuredClone(state);` then checks.
    // So it returns a clone. So strict equality check `toBe(after)` will fail if I check reference.
    // I should check content equality.
    
    const afterHit = logic.performAction(after, { type: 'HIT' });
    // Expect deck length to be same (no card drawn)
    expect(afterHit.deck.length).toBe(after.deck.length);
    
    // 3. Try to STAY -> should be blocked
    const afterStay = logic.performAction(after, { type: 'STAY' });
    expect(afterStay.players[0].hasStayed).toBe(false);

    // 4. Play the action
    after = logic.performAction(after, { type: 'PLAY_ACTION', payload: { actorId: 'p1', cardId: 'a1', targetId: 'p1' } });
    p1 = after.players[0];
    expect(p1.pendingImmediateActionIds).not.toContain('a1');
    // Since p1 targeted themselves with Freeze, they stayed.
    expect(p1.hasStayed).toBe(true);
  });
});
