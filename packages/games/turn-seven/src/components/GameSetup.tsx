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
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'omg' | 'omniscient';
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
          const usedNames = prev.map((pl) => pl.name);
          const availableNames = BOT_NAMES.filter(
            (name) => !usedNames.some((used) => used.includes(name))
          );
          const pool = availableNames.length > 0 ? availableNames : BOT_NAMES;
          const randomName = pool[Math.floor(Math.random() * pool.length)];
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
    <div
      className="game-setup"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      {/* Fixed Header Section */}
      <div
        style={{
          flexShrink: 0,
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <button
            onClick={start}
            className="btn btn-primary"
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              padding: '12px 32px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            Start Game
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Number of players: {count}
          </label>
          <input
            type="range"
            value={count}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(e) => handleCountChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {error && (
          <div className="error" style={{ color: 'red', marginBottom: 12 }}>
            {error}
          </div>
        )}
      </div>

      {/* Scrollable Player List */}
      <div
        className="player-names"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
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
              style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <label style={{ fontWeight: 600, color: '#374151' }}>Player {i + 1}:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                        width: 72,
                        padding: '2px 4px',
                        fontSize: '0.85rem',
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
                      <option value="omniscient" style={{ color: '#ec4899' }}>
                        Omni
                      </option>
                    </select>
                  )}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.9rem',
                      color: '#4b5563',
                    }}
                  >
                    Bot
                    <input
                      type="checkbox"
                      checked={player.isBot}
                      onChange={() => handleBotToggle(i)}
                    />
                  </label>
                </div>
              </div>
              <input
                value={player.name}
                onChange={(e) => handleNameChange(i, e.target.value)}
                disabled={player.isBot}
                style={{ width: '100%', padding: '8px 12px', fontSize: '1rem', height: '42px' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
