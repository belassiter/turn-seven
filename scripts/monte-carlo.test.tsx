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

interface PlayerRoundStats {
  scores: number[];
  busts: number;
  turnSevens: number;
  roundsWon: number;
}

const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

describe(`Monte Carlo Simulation (Headless, N=${SIMULATION_RUNS})`, () => {
  const allResults: Record<string, MatchupResult> = {};
  const ledgerRows: string[] = [
    'Simulation Name,Game #,Player Name,Difficulty,Total Score,Max Round Score,Avg Round Score,Median Round Score,Bust %,Turn 7 %,Rounds Won %,Total Rounds',
  ];

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
    console.log(`\nSummary CSV results written to: ${outputPath}`);

    // Write Ledger
    const ledgerContent = ledgerRows.join('\n');
    const ledgerPath = path.join(process.cwd(), 'scripts', 'simulation_ledger.csv');
    fs.writeFileSync(ledgerPath, ledgerContent);
    console.log(`Ledger CSV results written to: ${ledgerPath}`);
  });

  for (const matchup of BOT_MATCHUPS) {
    it(`should simulate: ${matchup.name}`, async () => {
      const wins: Record<string, number> = {};
      matchup.players.forEach((p) => (wins[p.name] = 0));
      let failures = 0;

      const runGame = async (gameIndex: number) => {
        try {
          const gameService = new LocalGameService({ latency: 0 });
          await gameService.start(matchup.players);

          let state = gameService.getState();
          let turn = 0;
          let roundsPlayed = 0;
          
          const roundStats: Record<string, PlayerRoundStats> = {};
          matchup.players.forEach(p => {
            roundStats[p.name] = { scores: [], busts: 0, turnSevens: 0, roundsWon: 0 };
          });

          while (state.gamePhase !== 'gameover' && turn < MAX_TURNS_PER_GAME) {
            state = gameService.getState();
            const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);

            if (!currentPlayer || !currentPlayer.isActive) {
              if (state.gamePhase === 'ended') {
                await gameService.startNextRound();
                
                // Capture round stats immediately after round transition
                state = gameService.getState();
                if (state.previousRoundScores) {
                  roundsPlayed++;
                  let maxScore = -1;
                  let roundWinners: string[] = [];

                  // First pass: collect scores and find max
                  Object.entries(state.previousRoundScores).forEach(([playerId, result]) => {
                    if (result.resultType !== 'bust') {
                      if (result.score > maxScore) {
                        maxScore = result.score;
                        roundWinners = [playerId];
                      } else if (result.score === maxScore) {
                        roundWinners.push(playerId);
                      }
                    }
                  });

                  // Second pass: update stats
                  Object.entries(state.previousRoundScores).forEach(([playerId, result]) => {
                    const player = state.players.find(p => p.id === playerId);
                    if (player) {
                      const stats = roundStats[player.name];
                      stats.scores.push(result.score);
                      if (result.resultType === 'bust') stats.busts++;
                      if (result.resultType === 'turn-seven') stats.turnSevens++;
                      if (roundWinners.includes(playerId)) stats.roundsWon++;
                    }
                  });
                }
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
          return { state, roundStats, roundsPlayed };
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
          batchPromises.push(runGame(i + j + 1));
        }
        
        const results = await Promise.all(batchPromises);
        
        results.forEach(({ state: finalState, roundStats, roundsPlayed }, index) => {
          const gameNum = i + index + 1;
          
          if (finalState.gamePhase === 'gameover') {
            const winner = finalState.players.find((p) => p.id === finalState.winnerId);
            if (winner && wins[winner.name] !== undefined) {
              wins[winner.name]++;
            }

            // Process Ledger Rows
            finalState.players.forEach(p => {
              const stats = roundStats[p.name];
              const totalScore = p.totalScore || 0;
              const maxRoundScore = Math.max(...stats.scores, 0);
              const avgRoundScore = stats.scores.length > 0 
                ? (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(2) 
                : '0';
              const medianRoundScore = calculateMedian(stats.scores);
              const bustPct = roundsPlayed > 0 ? ((stats.busts / roundsPlayed) * 100).toFixed(1) : '0';
              const turnSevenPct = roundsPlayed > 0 ? ((stats.turnSevens / roundsPlayed) * 100).toFixed(1) : '0';
              const roundsWonPct = roundsPlayed > 0 ? ((stats.roundsWon / roundsPlayed) * 100).toFixed(1) : '0';
              
              ledgerRows.push(
                `"${matchup.name}",${gameNum},"${p.name}","${p.botDifficulty}",${totalScore},${maxRoundScore},${avgRoundScore},${medianRoundScore},${bustPct},${turnSevenPct},${roundsWonPct},${roundsPlayed}`
              );
            });

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
