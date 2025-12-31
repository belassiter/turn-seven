import React, { useState } from 'react';

interface RemoteSetupProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  initialGameCode?: string;
}

export const RemoteSetup: React.FC<RemoteSetupProps> = ({
  onCreateGame,
  onJoinGame,
  initialGameCode,
}) => {
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState(initialGameCode || '');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div
      className="game-setup"
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        {/* Name Input Section */}
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Enter your name"
            data-testid="player-name-input"
          />
        </div>

        {/* Divider */}
        <div style={{ width: '100%', borderTop: '1px solid #e5e7eb' }}></div>

        {/* Create Game Section */}
        <div>
          <button
            onClick={() => name && onCreateGame(name)}
            disabled={!name || !!gameCode}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }}
            data-testid="create-game-btn"
          >
            Create Game
          </button>
        </div>

        {/* OR Separator */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              padding: '0 12px',
              backgroundColor: '#f3f4f6', // Matches global bg
              color: '#6b7280',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            OR
          </span>
        </div>

        {/* Join Game Section */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', textTransform: 'uppercase' }}
            placeholder="Existing game code"
            maxLength={6}
            data-testid="game-code-input"
          />
          <button
            onClick={() => name && gameCode && onJoinGame(gameCode, name)}
            disabled={!name || !gameCode}
            className="btn btn-primary"
            style={{
              whiteSpace: 'nowrap',
              backgroundColor: name && gameCode ? '#16a34a' : undefined, // Green override for Join
              borderColor: name && gameCode ? '#15803d' : undefined,
            }}
            data-testid="join-game-btn"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
};
