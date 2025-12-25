import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LocalGameService } from '../packages/games/turn-seven/src/services/gameService';
import { PlayerSetup } from '../packages/games/turn-seven/src/components/GameSetup';
import { decideMove, decideTarget } from '../packages/games/turn-seven/src/logic/bot-logic';

// --- Simulation Configuration ---
// Note: 200 runs takes ~4-5 minutes. Increase for more accuracy.
const SIMULATION_RUNS = 1000;
const MAX_TURNS_PER_GAME = 500; // Safety break to prevent infinite loops.
const BOT_MATCHUPS: { name: string; players: PlayerSetup[] }[] = [
  {
    name: 'Hard (vs 2 Easy)',
    players: [
      { name: 'HardBot', isBot: true, botDifficulty: 'hard' },
      { name: 'EasyBot1', isBot: true, botDifficulty: 'easy' },
      { name: 'EasyBot2', isBot: true, botDifficulty: 'easy' },
    ],
  },
  {
    name: 'Medium (vs 2 Easy)',
    players: [
      { name: 'MediumBot', isBot: true, botDifficulty: 'medium' },
      { name: 'EasyBot1', isBot: true, botDifficulty: 'easy' },
      { name: 'EasyBot2', isBot: true, botDifficulty: 'easy' },
    ],
  },
  {
    name: 'OMG (vs 2 Easy)',
    players: [
      { name: 'OMGBot', isBot: true, botDifficulty: 'omg' },
      { name: 'EasyBot1', isBot: true, botDifficulty: 'easy' },
      { name: 'EasyBot2', isBot: true, botDifficulty: 'easy' },
    ],
  },
  {
    name: 'Hard (vs 2 Medium)',
    players: [
      { name: 'HardBot', isBot: true, botDifficulty: 'hard' },
      { name: 'MediumBot1', isBot: true, botDifficulty: 'medium' },
      { name: 'MediumBot2', isBot: true, botDifficulty: 'medium' },
    ],
  },
  {
    name: 'OMG (vs 2 Hard)',
    players: [
      { name: 'OMGBot', isBot: true, botDifficulty: 'omg' },
      { name: 'HardBot1', isBot: true, botDifficulty: 'hard' },
      { name: 'HardBot2', isBot: true, botDifficulty: 'hard' },
    ],
  },
  {
    name: 'Mixed (E, M, H)',
    players: [
      { name: 'EasyBot', isBot: true, botDifficulty: 'easy' },
      { name: 'MediumBot', isBot: true, botDifficulty: 'medium' },
      { name: 'HardBot', isBot: true, botDifficulty: 'hard' },
    ],
  },
  {
    name: 'Mixed (M, H, O)',
    players: [
      { name: 'MediumBot', isBot: true, botDifficulty: 'medium' },
      { name: 'HardBot', isBot: true, botDifficulty: 'hard' },
      { name: 'OMGBot', isBot: true, botDifficulty: 'omg' },
    ],
  },
  {
    name: 'Control (3 Easy Bots)',
    players: [
      { name: 'EasyBot1', isBot: true, botDifficulty: 'easy' },
      { name: 'EasyBot2', isBot: true, botDifficulty: 'easy' },
      { name: 'EasyBot3', isBot: true, botDifficulty: 'easy' },
    ],
  },
];
// --- End Configuration ---

interface MatchupResult {
  wins: Record<string, number>;
  failures: number;
}

describe(`Monte Carlo Simulation (Headless, N=${SIMULATION_RUNS})`, () => {
  const allResults: Record<string, MatchupResult> = {};

  afterAll(() => {
    console.log('\n\n--- Monte Carlo Simulation Final Results ---');
    
    const csvRows = ['Matchup,Bot Name,Wins,Win Rate (%),Failures,Total Games'];

    for (const matchupName in allResults) {
      const results = allResults[matchupName];
      const totalGames = SIMULATION_RUNS;
      console.log(`\n--- Matchup: ${matchupName} (${totalGames} games) ---`);
      for (const botName in results.wins) {
        const winCount = results.wins[botName];
        const winRate = ((winCount / totalGames) * 100).toFixed(2);
        console.log(`    ${botName}: ${winCount} wins (${winRate}%)`);
        
        // Add to CSV
        csvRows.push(`"${matchupName}","${botName}",${winCount},${winRate},${results.failures},${totalGames}`);
      }
      if (results.failures > 0) {
        console.log(`    Failed games (timeout): ${results.failures}`);
      }
    }
    console.log('\n--- End of Report ---');

    // Write CSV
    const csvContent = csvRows.join('\n');
    const outputPath = path.join(process.cwd(), 'scripts', 'simulation_results.csv');
    fs.writeFileSync(outputPath, csvContent);
    console.log(`\nCSV results written to: ${outputPath}`);
  });

  for (const matchup of BOT_MATCHUPS) {
    it(`should simulate: ${matchup.name}`, async () => {
      const wins: Record<string, number> = {};
      matchup.players.forEach((p) => (wins[p.name] = 0));
      let failures = 0;

      const runGame = async () => {
        try {
          const gameService = new LocalGameService({ latency: 0 });
          await gameService.start(matchup.players);

          let state = gameService.getState();
          let turn = 0;

          while (state.gamePhase !== 'gameover' && turn < MAX_TURNS_PER_GAME) {
            state = gameService.getState();
            const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);

            if (!currentPlayer || !currentPlayer.isActive) {
              if (state.gamePhase === 'ended') {
                await gameService.startNextRound();
              } else {
                break;
              }
              continue;
            }

            if (
              currentPlayer.pendingImmediateActionIds &&
              currentPlayer.pendingImmediateActionIds.length > 0
            ) {
              const cardId = currentPlayer.pendingImmediateActionIds[0];
              const sourceCard =
                currentPlayer.hand.find((c) => c.id === cardId) ||
                currentPlayer.reservedActions?.find((c) => c.id === cardId);
              if (sourceCard) {
                const validTargets = state.players
                  .filter((p) => p.isActive && p.id !== currentPlayer.id)
                  .map((p) => p.id);
                const targetId = decideTarget(currentPlayer, state, {
                  sourceCard,
                  validTargets: validTargets.length > 0 ? validTargets : [currentPlayer.id],
                });
                await gameService.sendAction({
                  type: 'PLAY_ACTION',
                  payload: { actorId: currentPlayer.id, cardId, targetId },
                });
              }
            } else {
              const move = decideMove(currentPlayer, state);
              await gameService.sendAction({ type: move.type });
            }

            turn++;
          }
          return state;
        } catch (e) {
          console.error('Game failed:', e);
          throw e;
        }
      };

      const BATCH_SIZE = 50;
      for (let i = 0; i < SIMULATION_RUNS; i += BATCH_SIZE) {
        const batchPromises = [];
        const count = Math.min(BATCH_SIZE, SIMULATION_RUNS - i);
        for (let j = 0; j < count; j++) {
          batchPromises.push(runGame());
        }
        
        const results = await Promise.all(batchPromises);
        
        results.forEach((finalState) => {
          if (finalState.gamePhase === 'gameover') {
            const winner = finalState.players.find((p) => p.id === finalState.winnerId);
            if (winner && wins[winner.name] !== undefined) {
              wins[winner.name]++;
            }
          } else {
            failures++;
          }
        });
      }

      allResults[matchup.name] = { wins, failures };
      expect(failures).toBeLessThan(SIMULATION_RUNS);
    });
  }
});
