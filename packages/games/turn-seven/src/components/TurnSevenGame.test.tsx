import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup, within } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { TurnSevenLogic } from '../logic/game';
import { CardModel } from '@turn-seven/engine';

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

  it('renders the game board and actions', () => {
    const { getByText } = render(<TurnSevenGame />);
    // Footer should be visible on setup
    expect(screen.getByText(/Turn Seven/i)).toBeInTheDocument();
    // start the game via setup
    fireEvent.click(getByText('Start Game'));
    // header title removed — assert logo exists instead
    expect(screen.getByAltText('Turn Seven Logo')).toBeInTheDocument();
    expect(getByText('Hit')).toBeInTheDocument();
    expect(getByText('Stay')).toBeInTheDocument();
    expect(getByText('Player 1')).toBeInTheDocument();
  });

  it('does not show the default startup message in the last action log', () => {
    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

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

    const activeHand = container.querySelector('.active-player-hand');
    expect(activeHand?.querySelectorAll('.card')).toHaveLength(1);

    const hitBtn = getByText('Hit') as HTMLButtonElement;
    expect(hitBtn.disabled).toBe(false);

    fireEvent.click(hitBtn);

    // Use waitFor to handle potential async state updates
    await waitFor(() => {
      // Turn should advance to Player 2 (multi-player rules)
      expect(container.querySelector('.zone-header h2')?.textContent).toContain('Player 2');

      // Player 1 should be in sidebar with 2 cards (initial + hit)
      const p1Row = Array.from(container.querySelectorAll('.player-row')).find((r) =>
        r.textContent?.includes('Player 1')
      );
      expect(p1Row?.querySelectorAll('.mini-card')).toHaveLength(2);
    });
  });

  it('handles Stay action', () => {
    // In single player, Stay keeps it on Player 1.
    // But we can verify the button is clickable and doesn't crash.
    const { getByText } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));
    const hitButton = getByText('Hit') as HTMLButtonElement;
    const stayButton = getByText('Stay') as HTMLButtonElement;

    // Initially Hit should be enabled
    expect(hitButton.disabled).toBe(false);

    // After staying, in multi-player mode the turn should advance to the next player
    const actionsHeader = document.querySelector('.zone-header h2')?.textContent || '';
    fireEvent.click(stayButton);
    const actionsHeaderAfter = document.querySelector('.zone-header h2')?.textContent || '';
    expect(actionsHeaderAfter).not.toBe(actionsHeader);
    // Hit should be enabled for the next player
    expect(hitButton.disabled).toBe(false);
  });

  it('shows correct expected delta and hides Turn 7 when probability is exactly zero', () => {
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

    // enable odds display
    const dice = getByTitle('Show Odds');
    fireEvent.click(dice);

    // Expect: current hand is 10, remaining deck after dealing to 3 players is [1,3,5] -> avg=3
    // expected should be 13 (10 + 3), delta = +3
    expect(screen.getByText(/Exp. Score: 13 \(\+3\)/)).toBeInTheDocument();
    // Should not show a Turn 7 percentage when turn7Probability is exactly zero
    expect(screen.queryByText(/Turn 7/)).toBeNull();
  });

  it('handles Lock assigned during initial deal (UI-level)', () => {
    // MIN_PLAYERS is 3 so we test a 3-player initial deal
    // Stack (top to bottom): Lock (P1->P2), 5 (P1 replacement), 6 (P2 initial)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    const playerRows = container.querySelectorAll('.player-row');
    expect(playerRows.length).toBeGreaterThanOrEqual(2);

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
    const p2MiniCards = playerRows[1].querySelectorAll('.mini-card');
    expect(p2MiniCards).toHaveLength(1);

    // Check for locked icon in the sidebar row
    const p2Status = playerRows[1].querySelector('.player-status-icons');
    expect(p2Status?.textContent).toContain('🔒');
  });

  it('handles TurnThree initial-deal chain (UI-level)', () => {
    // 3-player stack top->bottom:
    // TurnThree (P1->P2), 8, Lock, 9, 5 (P1 replacement), 6 (P2 initial)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'n9', rank: '9', suit: 'number', isFaceUp: false },
      { id: 'a2', rank: 'Lock', suit: 'action', isFaceUp: false },
      { id: 'n8', rank: '8', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'TurnThree', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    const playerRows = container.querySelectorAll('.player-row');

    // Player 1 has TurnThree pending. Target Player 2.
    // Click the Player 2 entry in the sidebar
    const sidebar2 = container.querySelector('.player-sidebar');
    const player2InSidebar2 = within(sidebar2 as HTMLElement).getByText(/Player 2/i);
    fireEvent.click(player2InSidebar2);

    const p2MiniCards = playerRows[1].querySelectorAll('.mini-card');

    // Expect Player 2 to have TurnThree + 8 + Lock + 9 (4 cards)
    // BUT Lock is pending and Player 2 is now the current player (to resolve Lock),
    // so Lock is hidden from the sidebar (shown in main UI).
    // So we expect 3 visible cards in sidebar.
    expect(p2MiniCards).toHaveLength(3);
    const ranks = Array.from(p2MiniCards).map((c) => c.textContent || '');
    // normalize whitespace when checking for 'TurnThree' because the card renderer
    // places a newline between camel-cased words ("Turn\nThree").
    // Mini cards might just show "TurnThree" or "T3" depending on implementation.
    // The current MiniCard implementation shows `rank`.
    // Accept multiple possible renderings for special card labels: either full text or abbreviated
    expect(ranks.some((t) => t.includes('TurnThree') || t.includes('T3'))).toBeTruthy();
    // Lock is hidden, so we don't check for it in sidebar
    // expect(ranks.some((t) => t.includes('Lock') || t.includes('🔒') || t === 'F')).toBeTruthy();
  });

  it('pending-action UI allows actor to target themselves', () => {
    // Similar to Lock initial deal test but actor will target themselves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // Actor (Player 1) should have a pending Lock and see targeting UI
    // Choose Player 1 from the sidebar (actor should be able to self-target via sidebar)
    const sidebar3 = container.querySelector('.player-sidebar');
    const player1InSidebar = within(sidebar3 as HTMLElement).getByText(/Player 1/i);
    expect(player1InSidebar).toBeDefined();
    fireEvent.click(player1InSidebar);

    // Now Player 1 should be locked
    const playerRows = container.querySelectorAll('.player-row');
    const p1Status = playerRows[0].querySelector('.player-status-icons');
    expect(p1Status?.textContent).toContain('🔒');
  });

  it('sidebar shows "(you)" hint when actor is selecting targets', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, container } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // Pending action UI is visible
    expect(container.querySelector('.pending-action-ui')).toBeTruthy();

    // Sidebar should show the actor with hint (you)
    const sidebar = container.querySelector('.player-sidebar');
    expect(sidebar).toBeTruthy();
    const actorLabel = sidebar?.querySelector('.player-row .player-name')?.textContent || '';
    expect(actorLabel).toMatch(/Player 1/i);
    expect(actorLabel).toMatch(/you/);
  });

  it('header rules button opens summarized rules overlay', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(TurnSevenLogic.prototype as any, 'createDeck').mockReturnValue([
      { id: 'n6', rank: '6', suit: 'number', isFaceUp: false },
      { id: 'n5', rank: '5', suit: 'number', isFaceUp: false },
      { id: 'a1', rank: 'Lock', suit: 'action', isFaceUp: false },
    ] as CardModel[]);

    const { getByText, getByTitle } = render(<TurnSevenGame />);
    fireEvent.click(getByText('Start Game'));

    // Find the rules button in the header and open it
    const rulesBtn = getByTitle('Show Rules');
    expect(rulesBtn).toBeDefined();
    fireEvent.click(rulesBtn);

    // Overlay should be visible
    expect(screen.getByText('Quick Rules')).toBeInTheDocument();

    // Close it
    const close = screen.getByText('Close');
    fireEvent.click(close);
    expect(screen.queryByText('Quick Rules')).toBeNull();
  });
});
