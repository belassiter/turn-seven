import React from 'react';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'omg' | 'omniscient';
}

export interface LobbyProps {
  gameId: string;
  players: LobbyPlayer[];
  isHost: boolean;
  onStartGame: () => void;
  onCopyInviteLink: () => void;
  onAddBot?: () => void;
  onUpdateBotDifficulty?: (botId: string, difficulty: string) => void;
  currentPlayerId?: string;
  onRemovePlayer?: (playerId: string) => void;
  maxPlayers?: number;
}

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'easy':
      return 'green';
    case 'medium':
      return '#eab308'; // yellow-500
    case 'hard':
      return 'orange';
    case 'omg':
      return 'darkred';
    case 'omniscient':
      return '#ec4899'; // pink-500
    default:
      return undefined;
  }
};

export const Lobby: React.FC<LobbyProps> = ({
  gameId,
  players,
  isHost,
  onStartGame,
  onCopyInviteLink,
  onAddBot,
  onUpdateBotDifficulty,
  currentPlayerId,
  onRemovePlayer,
  maxPlayers = 18,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flex: 1,
        backgroundColor: 'transparent',
        color: '#111827',
        padding: '24px',
        width: '100%',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 8px 20px rgba(16,24,40,0.06)',
          maxWidth: '600px',
          width: '100%',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
            color: '#111827',
          }}
        >
          Game Lobby
        </h1>

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', marginBottom: '8px' }}>Game Code</p>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <code
              style={{
                backgroundColor: '#f3f4f6',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '1.25rem',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              {gameId}
            </code>
            <button
              onClick={onCopyInviteLink}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#111827',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              title="Copy Link"
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>📋</span>
            </button>
          </div>
        </div>

        {/* Start Game above players list */}
        <div style={{ marginBottom: '16px' }}>
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={players.length < 3 || players.length > 18}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '1.05rem',
                border: 'none',
                cursor: players.length < 3 || players.length > 18 ? 'not-allowed' : 'pointer',
                backgroundColor: players.length < 3 || players.length > 18 ? '#e5e7eb' : '#16a34a',
                color: players.length < 3 || players.length > 18 ? '#9ca3af' : '#ffffff',
              }}
            >
              Start Game
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Waiting for host to start...
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '16px',
              borderBottom: '1px solid #eef2f6',
              paddingBottom: '8px',
            }}
          >
            Players ({players.length})
          </h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '40vh',
              overflowY: 'auto',
            }}
          >
            {players.map((player) => (
              <li
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}
                >
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.name}
                  </span>
                  {player.isHost && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      HOST
                    </span>
                  )}
                  {player.isBot && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#7c3aed',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      BOT
                    </span>
                  )}
                  {player.id === currentPlayerId && (
                    <span style={{ marginLeft: 6, fontSize: '0.8rem', color: '#6b7280' }}>
                      (you)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {player.isBot && isHost && onUpdateBotDifficulty && (
                    <select
                      style={{
                        color: getDifficultyColor(player.botDifficulty),
                        fontWeight: 'bold',
                        borderColor: getDifficultyColor(player.botDifficulty),
                        width: 72,
                        padding: '2px 4px',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        outline: 'none',
                        backgroundColor: '#fff',
                      }}
                      value={player.botDifficulty || 'medium'}
                      onChange={(e) => onUpdateBotDifficulty(player.id, e.target.value)}
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

                  {player.isBot && !isHost && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: getDifficultyColor(player.botDifficulty) || '#6b7280',
                        fontWeight: 'bold',
                      }}
                    >
                      {player.botDifficulty || 'medium'}
                    </span>
                  )}
                  {isHost && !player.isHost && onRemovePlayer && (
                    <button
                      onClick={() => onRemovePlayer(player.id)}
                      title={`Remove ${player.name}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      <span style={{ color: '#ef4444' }}>❌</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {isHost && onAddBot && (
            <button
              onClick={onAddBot}
              disabled={players.length >= maxPlayers}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '10px',
                backgroundColor: players.length >= maxPlayers ? '#e5e7eb' : '#7c3aed',
                color: players.length >= maxPlayers ? '#9ca3af' : 'white',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: players.length >= maxPlayers ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {players.length >= maxPlayers ? 'Lobby Full' : '+ Add Bot'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            Invite players with the game code above
          </div>
        </div>
      </div>
    </div>
  );
};
