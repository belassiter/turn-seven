import React from 'react';
import { PlayerModel } from '@turn-seven/engine';
import { MiniCard } from './MiniCard';

interface PlayerSidebarProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  onTargetPlayer?: (playerId: string) => void;
  isTargetingMode?: boolean;
  targetingActorId?: string;
}

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ 
  players, 
  currentPlayerId, 
  onTargetPlayer,
  isTargetingMode,
  targetingActorId
}) => {
  return (
    <div className="player-sidebar">
      <div className="sidebar-list">
        {players.map(player => {
          const isCurrent = player.id === currentPlayerId;
          const isTargetable = isTargetingMode && player.isActive; // Simplified targeting logic
          const isSelf = player.id === targetingActorId;
          const isInactiveTarget = isTargetingMode && !player.isActive;
          
          const handleClick = () => {
            if (isTargetingMode && onTargetPlayer && player.isActive) {
              onTargetPlayer(player.id);
            }
          };

          // Sort hand: Actions -> +X (asc) -> x2 -> Numbers (asc)
          const sortedHand = [...player.hand].sort((a, b) => {
            // Helper to get sort weight
            const getWeight = (c: typeof a) => {
              if (c.suit === 'action') return 0;
              if (c.suit === 'modifier') {
                if (String(c.rank).startsWith('+')) return 100 + parseInt(String(c.rank).slice(1));
                if (String(c.rank) === 'x2') return 200;
                return 150;
              }
              if (c.suit === 'number') return 300 + parseInt(String(c.rank));
              return 999;
            };
            return getWeight(a) - getWeight(b);
          });

          return (
            <div 
              key={player.id} 
              className={`player-row ${isCurrent ? 'active-turn' : ''} ${isTargetable ? 'targeting-candidate' : ''} ${isInactiveTarget ? 'inactive-target' : ''} ${player.hasBusted ? 'busted' : ''} ${player.isLocked ? 'locked' : ''} ${player.hasStayed ? 'stayed' : ''}`}
              onClick={handleClick}
            >
              <div className="player-info">
                <span className="player-name">
                  {player.name}
                    {isSelf && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 6 }}>(you)</span>}
                  {isCurrent && <span className="turn-indicator"> (Turn)</span>}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="player-score-info" style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                    {player.totalScore ?? 0} pts
                  </span>
                  <div className="player-status-icons">
                    {player.hasBusted ? (
                      <span title="Busted">💥</span>
                    ) : player.isLocked ? (
                      <span title="Locked">🔒</span>
                    ) : player.hasStayed ? (
                      <span title="Stayed">🛑</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="player-mini-hand">
                {sortedHand.map(card => (
                  <MiniCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
