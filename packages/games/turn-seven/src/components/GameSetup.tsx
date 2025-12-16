import React, { useState } from 'react';
import { MIN_PLAYERS, MAX_PLAYERS } from '../logic/game';
import { getDifficultyColor } from '../utils/colors';

const BOT_NAMES = [
  'C-3PO',
  'Data',
  'HAL 9000',
  'R2-D2',
  'T-800',
  'Johnny 5',
  'Wall-E',
  'Bender',
  'KITT',
  'Marvin',
  'Lore',
  'GLaDOS',
  'Cortana',
  'Claptrap',
  'EDI',
  'HK-47',
  'R. Daneel',
  'Skynet',
  'J.A.R.V.I.S.',
  'Agent Smith',
];

export interface PlayerSetup {
  name: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'omg';
}

interface Props {
  onStart: (players: PlayerSetup[]) => void;
}

export const GameSetup: React.FC<Props> = ({ onStart }) => {
  const [count, setCount] = useState<number>(MIN_PLAYERS);
  const [players, setPlayers] = useState<PlayerSetup[]>(
    Array.from({ length: MIN_PLAYERS }, (_, i) => ({
      name: `Player ${i + 1}`,
      isBot: false,
      botDifficulty: 'medium',
    }))
  );
  const [error, setError] = useState<string | null>(null);

  const handleCountChange = (n: number) => {
    const clamped = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    setCount(clamped);
    setPlayers((prev) => {
      const next = prev.slice(0, clamped);
      while (next.length < clamped) {
        next.push({
          name: `Player ${next.length + 1}`,
          isBot: false,
          botDifficulty: 'medium',
        });
      }
      return next;
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, name: value } : p)));
  };

  const handleBotToggle = (index: number) => {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const isBot = !p.isBot;
        let newName = p.name;
        if (isBot) {
          // Pick a random name if switching to bot
          const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          newName = `🤖 ${randomName}`;
        } else if (p.name.startsWith('🤖 ')) {
          // Revert to default if switching back
          newName = `Player ${i + 1}`;
        }
        return { ...p, isBot, name: newName };
      })
    );
  };

  const handleDifficultyChange = (index: number, difficulty: PlayerSetup['botDifficulty']) => {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, botDifficulty: difficulty } : p))
    );
  };

  const start = () => {
    if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
      setError(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
      return;
    }
    const finalPlayers = players.slice(0, count).map((p, i) => ({
      ...p,
      name: p.name && p.name.trim().length ? p.name.trim() : `Player ${i + 1}`,
    }));
    onStart(finalPlayers);
  };

  return (
    <div className="game-setup">
      {/* Logo removed here — kept in the outer setup wrapper (TurnSevenGame) to avoid duplication */}
      <label style={{ display: 'block', marginBottom: 12 }}>Number of players: {count}</label>
      <input
        type="range"
        value={count}
        min={MIN_PLAYERS}
        max={MAX_PLAYERS}
        onChange={(e) => handleCountChange(Number(e.target.value))}
      />
      <div className="player-names">
        {Array.from({ length: count }).map((_, i) => {
          const player = players[i] || {
            name: `Player ${i + 1}`,
            isBot: false,
            botDifficulty: 'medium',
          };
          return (
            <div
              key={i}
              className="player-input"
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
            >
              <label style={{ minWidth: 70, whiteSpace: 'nowrap' }}>Player {i + 1}:</label>
              <input
                value={player.name}
                onChange={(e) => handleNameChange(i, e.target.value)}
                disabled={player.isBot}
                style={{ flex: 1, minWidth: 0 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={player.isBot}
                    onChange={() => handleBotToggle(i)}
                  />
                  Bot
                </label>
                {player.isBot && (
                  <select
                    value={player.botDifficulty}
                    onChange={(e) =>
                      handleDifficultyChange(i, e.target.value as PlayerSetup['botDifficulty'])
                    }
                    style={{
                      color: getDifficultyColor(player.botDifficulty),
                      fontWeight: 'bold',
                      borderColor: getDifficultyColor(player.botDifficulty),
                      width: 90,
                    }}
                  >
                    <option value="easy" style={{ color: 'green' }}>
                      Easy
                    </option>
                    <option value="medium" style={{ color: '#eab308' }}>
                      Med
                    </option>
                    <option value="hard" style={{ color: 'orange' }}>
                      Hard
                    </option>
                    <option value="omg" style={{ color: 'darkred' }}>
                      OMG
                    </option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="setup-actions">
        <button onClick={start}>Start Game</button>
      </div>
    </div>
  );
};
