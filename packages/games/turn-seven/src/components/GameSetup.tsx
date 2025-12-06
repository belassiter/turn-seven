import React, { useState } from 'react';
import { MIN_PLAYERS, MAX_PLAYERS } from '../logic/game';

interface Props {
  onStart: (names: string[]) => void;
}

export const GameSetup: React.FC<Props> = ({ onStart }) => {
  const [count, setCount] = useState<number>(MIN_PLAYERS);
  const [names, setNames] = useState<string[]>(
    Array.from({ length: MIN_PLAYERS }, (_, i) => `Player ${i + 1}`)
  );
  const [error, setError] = useState<string | null>(null);

  const handleCountChange = (n: number) => {
    const clamped = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    setCount(clamped);
    setNames((prev) => {
      const next = prev.slice(0, clamped);
      while (next.length < clamped) next.push(`Player ${next.length + 1}`);
      return next;
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setNames((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const start = () => {
    if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
      setError(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
      return;
    }
    const finalNames = names
      .slice(0, count)
      .map((n, i) => (n && n.trim().length ? n.trim() : `Player ${i + 1}`));
    onStart(finalNames);
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
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="player-input">
            <label>Player {i + 1} name:</label>
            <input
              value={names[i] || `Player ${i + 1}`}
              onChange={(e) => handleNameChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="setup-actions">
        <button onClick={start}>Start Game</button>
      </div>
    </div>
  );
};
