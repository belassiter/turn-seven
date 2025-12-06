import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerSidebar } from './PlayerSidebar';
import type { PlayerModel, CardModel } from '@turn-seven/engine';

describe('PlayerSidebar ordering', () => {
  it('orders cards left-to-right: numbers asc, then +X, then x2, then actions', () => {
    const players: PlayerModel[] = [
      {
        id: 'p1',
        name: 'P1',
        hand: [
          { id: 'a1', suit: 'action', rank: 'Lock', isFaceUp: true } as CardModel,
          { id: 'm1', suit: 'modifier', rank: '+2', isFaceUp: true } as CardModel,
          { id: 'n3', suit: 'number', rank: '3', isFaceUp: true } as CardModel,
          { id: 'm2', suit: 'modifier', rank: 'x2', isFaceUp: true } as CardModel,
          { id: 'n1', suit: 'number', rank: '1', isFaceUp: true } as CardModel,
        ],
        isActive: true,
        hasStayed: false,
        hasBusted: false,
        hasLifeSaver: false,
        roundScore: 0,
        totalScore: 0,
        pendingImmediateActionIds: [],
        reservedActions: [],
      },
    ];

    render(<PlayerSidebar players={players} />);

    const row = screen.getByText(/P1/).closest('.player-row')!;
    const miniCards = Array.from(row.querySelectorAll('.mini-card'));

    // Expect first two to be numbers (1, then 3)
    expect(miniCards[0].textContent?.trim()).toBe('1');
    expect(miniCards[1].textContent?.trim()).toBe('3');

    // Next should be modifier +2 then x2
    expect(miniCards[2].textContent?.trim()).toBe('+2');
    expect(miniCards[3].textContent?.trim()).toBe('x2');

    // Last should be the action (Lock -> 🔒)
    expect(miniCards[4].textContent).toBeTruthy();
    // Lock renders emoji ❖ check it contains either the emoji or the label
    expect(/🔒|Lock/.test(miniCards[4].textContent || '')).toBeTruthy();
  });
});
