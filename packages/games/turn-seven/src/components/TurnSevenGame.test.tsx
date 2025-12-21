import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup, within } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { TurnSevenLogic } from '../logic/game';
import { CardModel } from '@turn-seven/engine';

// Mock LocalGameService to remove latency for tests
vi.mock('../services/gameService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gameService')>();
  return {
    ...actual,
    LocalGameService: class extends actual.LocalGameService {
      constructor() {
        super();
        // Force latency to 0
        // @ts-expect-error - accessing private/protected property for test
        this.simulatedLatencyMs = 0;
      }
    },
  };
});

describe('TurnSevenGame component', () => {
  beforeEach(() => {
    // Mock createDeck to return a fixed deck to avoid flakiness and "TurnThree" surprises
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      [
        { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
        { id: 'c2', suit: 'number', rank: '2', isFaceUp: false },
        { id: 'c3', suit: 'number', rank: '3', isFaceUp: false },
        { id: 'c4', suit: 'number', rank: '4', isFaceUp: false },
        { id: 'c5', suit: 'number', rank: '5', isFaceUp: false },
        { id: 'c6', suit: 'number', rank: '6', isFaceUp: false },
        { id: 'c7', suit: 'number', rank: '7', isFaceUp: false },
        { id: 'c8', suit: 'number', rank: '8', isFaceUp: false },
        { id: 'c9', suit: 'number', rank: '9', isFaceUp: false },
        { id: 'c10', suit: 'number', rank: '10', isFaceUp: false },
      ].reverse()
    ); // reverse because pop() takes from end
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders the game board and actions', async () => {
    const { getByText } = render(<TurnSevenGame />);
    // Footer should be visible on setup
    expect(screen.getByText(/Turn Seven/i)).toBeInTheDocument();
    // start the game via setup
    fireEvent.click(getByText('Start Game'));
    // header title removed — assert logo exists instead
    expect(screen.getByAltText('Turn Seven Logo')).toBeInTheDocument();
    await screen.findByText('Hit');
    expect(getByText('Stay')).toBeInTheDocument();
    expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0);
  });

  it('does not show the default startup message in the last action log', async () => {
    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    const lastAction = container.querySelector('.last-action-log');
    // Should not contain the "Game started. Good luck!" text — it should be empty before any actions
    expect(lastAction?.querySelector('p')).toBeNull();
    expect(lastAction?.textContent?.trim()).toBe('');
  });

  it('displays "Hand Score" label for the active player', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(
      [
        // deterministic deck
        { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
      ].reverse()
    );

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    // The active player's current-score should contain 'Hand Score'
    const currentScore = container.querySelector('.current-score');
    expect(currentScore?.textContent).toMatch(/Hand Score:/);
  });

  it('handles Hit action', async () => {
    // Mock deck with plenty of cards to ensure Hit works
    const mockDeck = Array.from({ length: 10 }, (_, i) => ({
      id: `mock-card-${i}`,
      suit: 'number',
      rank: String(i + 1),
      isFaceUp: false,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue(mockDeck);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    const activeHand = container.querySelector('.active-player-hand');
    await waitFor(
      () => {
        expect(activeHand?.querySelectorAll('.card')).toHaveLength(1);
      },
      { timeout: 10000 }
    );

    // Wait for animation lock to release
    await waitFor(() => expect(getByText('Hit').closest('button')).not.toBeDisabled(), {
      timeout: 10000,
    });

    const hitBtn = getByText('Hit') as HTMLButtonElement;
    fireEvent.click(hitBtn);

    // Use waitFor to handle potential async state updates
    await waitFor(
      () => {
        // Turn should advance to Player 2 (multi-player rules)
        expect(container.querySelector('.zone-header h2')?.textContent).toContain('Player 2');

        // Player 1 should be in sidebar with 2 cards (initial + hit)
        const p1Row = screen.getByText('Player 1').closest('.player-row');
        expect(p1Row?.querySelectorAll('.mini-card')).toHaveLength(2);
      },
      { timeout: 15000 }
    ); // Increased timeout for animations
  }, 20000);

  it('handles Stay action', async () => {
    // In single player, Stay keeps it on Player 1.
    // But we can verify the button is clickable and doesn't crash.
    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    // Wait for animation lock to release
    await waitFor(() => expect(getByText('Hit').closest('button')).not.toBeDisabled(), {
      timeout: 10000,
    });

    const hitButton = getByText('Hit') as HTMLButtonElement;
    const stayButton = getByText('Stay') as HTMLButtonElement;

    // Initially Hit should be enabled
    expect(hitButton.disabled).toBe(false);

    // After staying, in multi-player mode the turn should advance to the next player
    const actionsHeader = document.querySelector('.zone-header h2')?.textContent || '';
    fireEvent.click(stayButton);

    await waitFor(
      () => {
        const actionsHeaderAfter = document.querySelector('.zone-header h2')?.textContent || '';
        expect(actionsHeaderAfter).not.toBe(actionsHeader);
      },
      { timeout: 5000 }
    );

    // Hit should be enabled for the next player (after animation lock)
    await waitFor(
      () => {
        const btn = getByText('Hit').closest('button');
        expect(btn).not.toBeDisabled();
      },
      { timeout: 15000 }
    );

    const hitButtonAfter = getByText('Hit') as HTMLButtonElement;
    expect(hitButtonAfter.disabled).toBe(false);
  }, 20000);

  it('shows correct expected delta and hides Turn 7 when probability is exactly zero', async () => {
    // re-mock deck so first card dealt to Player 1 is a 10 and remaining deck averages to 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'c1', suit: 'number', rank: '1', isFaceUp: false },
      { id: 'c3', suit: 'number', rank: '3', isFaceUp: false },
      { id: 'c5', suit: 'number', rank: '5', isFaceUp: false },
      { id: 'c7', suit: 'number', rank: '7', isFaceUp: false },
      { id: 'c9', suit: 'number', rank: '9', isFaceUp: false },
      { id: 'c10', suit: 'number', rank: '10', isFaceUp: false },
    ]);

    const { getByText, getByTitle } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    // enable odds display (cycle to Purple/Perfect Memory mode to match test expectations)
    const dice = getByTitle('Odds Mode: White');
    fireEvent.click(dice); // Green
    fireEvent.click(dice); // Blue
    fireEvent.click(dice); // Purple

    // Expect: current hand is 10, remaining deck after dealing to 3 players is [1,3,5] -> avg=3
    // expected should be 13 (10 + 3), delta = +3
    await waitFor(
      () => {
        expect(screen.getByText(/Exp. Score: 13 \(\+3\)/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    // Should not show a Turn 7 percentage when turn7Probability is exactly zero
    expect(screen.queryByText(/Turn 7/)).toBeNull();
  });

  it('handles Lock assigned during initial deal (UI-level)', async () => {
    // MIN_PLAYERS is 3 so we test a 3-player initial deal
    // Stack (top to bottom): Lock (P1->P2), 5 (P1 replacement), 6 (P2 initial)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      ...Array.from({ length: 10 }, (_, i) => ({
        id: 'filler' + i,
        rank: '1',
        suit: 'number',
        isFaceUp: false,
      })),
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // Wait for sidebar to populate
    await waitFor(
      () => {
        const playerRows = container.querySelectorAll('.player-row');
        expect(playerRows.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 }
    );

    const playerRows = container.querySelectorAll('.player-row');

    // Player 1 (index 0) should have the Lock card pending
    // And should see targeting UI (e.g. "Choose a target")
    // We simulate clicking Player 2 to target them.

    // The pending action UI should only allow targeting via the sidebar. Find Player 2 in the sidebar and click.
    const sidebar = container.querySelector('.player-sidebar');
    const player2InSidebar = within(sidebar as HTMLElement).getByText(/Player 2/i);
    fireEvent.click(player2InSidebar);

    // Now Player 2 should be locked
    // Player 2 (index 1) should only have the Lock card (1 card) and be locked
    // In the sidebar, we check for mini-cards
    await waitFor(
      () => {
        const p2MiniCards = playerRows[1].querySelectorAll('.mini-card');
        expect(p2MiniCards).toHaveLength(1);
        // Check for locked icon in the sidebar row
        const p2Status = playerRows[1].querySelector('.player-status-icons');
        expect(p2Status?.textContent).toContain('🔒');
      },
      { timeout: 10000 }
    );
  }, 20000);

  it('handles TurnThree initial-deal chain (UI-level)', async () => {
    // 3-player stack top->bottom:
    // TurnThree (P1->P2), 8, Lock, 9, 5 (P1 replacement), 6 (P2 initial)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      ...Array.from({ length: 10 }, (_, i) => ({
        id: 'filler' + i,
        rank: '1',
        suit: 'number',
        isFaceUp: false,
      })),
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'n9', rank: '9', suit: 'number', isFaceUp: false },
      { id: 'a2', rank: 'Lock', suit: 'action', isFaceUp: false },
      { id: 'n8', rank: '8', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'TurnThree', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // Wait for sidebar
    await waitFor(
      () => {
        expect(container.querySelector('.player-sidebar')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const playerRows = container.querySelectorAll('.player-row');

    // Player 1 has TurnThree pending. Target Player 2.
    // Click the Player 2 entry in the sidebar
    const sidebar2 = container.querySelector('.player-sidebar');
    const player2InSidebar2 = within(sidebar2 as HTMLElement).getByText(/Player 2/i);
    fireEvent.click(player2InSidebar2);

    await waitFor(
      () => {
        const p2MiniCards = playerRows[1].querySelectorAll('.mini-card');

        // Expect Player 2 to have 8 + Lock (2 cards) - interrupted
        // TurnThree is in reservedActions (not shown). 9 is not drawn yet.
        expect(p2MiniCards).toHaveLength(2);
        const ranks = Array.from(p2MiniCards).map((c) => c.textContent || '');
        expect(ranks).toContain('8');
        // Lock is present (as emoji or text)
      },
      { timeout: 15000 }
    );
  }, 20000);

  it('pending-action UI allows actor to target themselves', async () => {
    // Similar to Lock initial deal test but actor will target themselves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      ...Array.from({ length: 10 }, (_, i) => ({
        id: 'filler' + i,
        rank: '1',
        suit: 'number',
        isFaceUp: false,
      })),
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    await waitFor(() => {
      expect(container.querySelector('.player-sidebar')).toBeInTheDocument();
    });

    // Actor (Player 1) should have a pending Lock and see targeting UI
    // Choose Player 1 from the sidebar (actor should be able to self-target via sidebar)
    const sidebar3 = container.querySelector('.player-sidebar');
    const player1InSidebar = within(sidebar3 as HTMLElement).getByText(/Player 1/i);
    expect(player1InSidebar).toBeDefined();
    fireEvent.click(player1InSidebar);

    // Now Player 1 should be locked
    await waitFor(
      () => {
        const playerRows = container.querySelectorAll('.player-row');
        const p1Status = playerRows[0].querySelector('.player-status-icons');
        expect(p1Status?.textContent).toContain('🔒');
      },
      { timeout: 10000 }
    );
  }, 20000);

  it('sidebar shows actor when selecting targets', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      ...Array.from({ length: 10 }, (_, i) => ({
        id: 'filler' + i,
        rank: '1',
        suit: 'number',
        isFaceUp: false,
      })),
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    await waitFor(() => {
      // Pending action UI is visible
      expect(container.querySelector('.pending-action-ui')).toBeTruthy();
    });

    // Sidebar should show the actor
    const sidebar = container.querySelector('.player-sidebar');
    expect(sidebar).toBeTruthy();
    const actorLabel = sidebar?.querySelector('.player-row .player-name')?.textContent || '';
    expect(actorLabel).toMatch(/Player 1/i);
  });

  it('header rules button opens summarized rules overlay', async () => {
    const { getByText, getByTitle } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    await screen.findByText('Hit');

    // Find the rules button in the header and open it
    const rulesBtn = getByTitle('Show Rules');
    expect(rulesBtn).toBeDefined();
    fireEvent.click(rulesBtn);

    await waitFor(() => {
      expect(screen.getByText(/Quick Rules/i)).toBeInTheDocument();
    });
  });
});
