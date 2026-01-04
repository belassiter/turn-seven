import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TurnSevenGame } from './TurnSevenGame';
import { TurnSevenLogic } from '../logic/game';
import { GameState } from '@turn-seven/engine';

// Mock LocalGameService
vi.mock('../services/gameService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/gameService')>();
  return {
    ...actual,
    LocalGameService: class extends actual.LocalGameService {
      constructor(options?: { initialState?: GameState; latency?: number }) {
        super(options);
        // @ts-expect-error - accessing private/protected property for test
        this.simulatedLatencyMs = 0;
      }
    },
  };
});

describe('TurnSevenGame Odds Button', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.skip('cycles odds mode correctly: Off -> Green -> Blue -> Purple -> Off', async () => {
    // Create a valid initial state to skip setup
    const logic = new TurnSevenLogic();
    const initialState = logic.createInitialStateFromNames(['P1', 'P2', 'P3']);

    render(<TurnSevenGame initialGameState={initialState} />);

    // Initial state: Off (White)
    // The button has title "Odds Mode: White"
    // Use findByTitle to wait for the game to load (useEffect)
    const oddsButton = await screen.findByTitle('Odds Mode: White');
    expect(oddsButton).toBeDefined();

    // Click 1: White -> Green
    fireEvent.click(oddsButton);
    expect(screen.getByTitle('Odds Mode: Green')).toBeDefined();

    // Click 2: Green -> Blue
    fireEvent.click(oddsButton);
    expect(screen.getByTitle('Odds Mode: Blue')).toBeDefined();

    // Click 3: Blue -> Purple
    fireEvent.click(oddsButton);
    expect(screen.getByTitle('Odds Mode: Purple')).toBeDefined();

    // Click 4: Purple -> White
    fireEvent.click(oddsButton);
    expect(screen.getByTitle('Odds Mode: White')).toBeDefined();
  });
});
