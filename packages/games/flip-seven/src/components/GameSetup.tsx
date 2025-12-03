import * as React from 'react';

export const GameSetup: React.FC<{ onStart?: (names: string[]) => void }> = ({ onStart }) => {
  return (
    <div className="game-setup">
      <h2>Flip Seven (placeholder)</h2>
      <button onClick={() => onStart && onStart(['Player 1', 'Player 2', 'Player 3'])}>Start Game</button>
    </div>
  );
};
