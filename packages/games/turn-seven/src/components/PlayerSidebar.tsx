import React from 'react';
import { PlayerModel } from '@turn-seven/engine';
import { MiniCard } from './MiniCard';
import { motion, AnimatePresence } from 'framer-motion';

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
  targetingActorId,
}) => {
  return (
    <div className="player-sidebar">
      <div className="sidebar-list">
        {players.map((player) => {
          const isCurrent = player.id === currentPlayerId;
          const isTargetable = isTargetingMode && player.isActive; // Simplified targeting logic
          const isSelf = player.id === targetingActorId;
          const isInactiveTarget = isTargetingMode && !player.isActive;

          const handleClick = () => {
            if (isTargetingMode && onTargetPlayer && player.isActive) {
              onTargetPlayer(player.id);
            }
          };

          // Filter out pending actions (cards currently being resolved/targeted) so they don't appear in the sidebar prematurely
          // Only do this for the current player, as they have a dedicated UI for pending actions.
          // For other players, we want to see all their cards.
          const visibleHand = player.hand.filter(
            (c) => !isCurrent || !player.pendingImmediateActionIds?.includes(c.id)
          );

          // Sort hand: Numbers (asc) -> +X (asc) -> x2 -> Actions
          const sortedHand = [...visibleHand].sort((a, b) => {
            // Helper to get sort weight
            const getWeight = (c: typeof a) => {
              if (c.suit === 'number') return 0 + parseInt(String(c.rank));
              if (c.suit === 'modifier') {
                if (String(c.rank).startsWith('+')) return 100 + parseInt(String(c.rank).slice(1));
                if (String(c.rank) === 'x2') return 200;
                return 150;
              }
              if (c.suit === 'action') return 300;
              return 999;
            };
            return getWeight(a) - getWeight(b);
          });

          return (
            <motion.div
              key={player.id}
              className={`player-row ${isCurrent ? 'active-turn' : ''} ${
                isTargetable ? 'targeting-candidate' : ''
              } ${isInactiveTarget ? 'inactive-target' : ''} ${player.hasBusted ? 'busted' : ''} ${
                player.isLocked ? 'locked' : ''
              } ${player.hasStayed ? 'stayed' : ''}`}
              onClick={handleClick}
              animate={
                player.hasBusted
                  ? { x: [0, -5, 5, -5, 5, 0], backgroundColor: '#fee2e2' }
                  : { x: 0, backgroundColor: 'rgba(0,0,0,0)' }
              }
              transition={{ duration: 0.4 }}
            >
              <div className="player-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="player-status-icons">
                    <AnimatePresence mode="wait">
                      {player.hasBusted ? (
                        <motion.span
                          key="bust"
                          title="Busted"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1.5 }}
                          transition={{ type: 'spring' }}
                        >
                          💥
                        </motion.span>
                      ) : player.isLocked ? (
                        <motion.span
                          key="lock"
                          title="Locked"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' }}
                        >
                          🔒
                        </motion.span>
                      ) : player.hasStayed ? (
                        <motion.span
                          key="stay"
                          title="Stayed"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' }}
                        >
                          🛑
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <span className="player-name">
                    {player.name}
                    {isSelf && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 6 }}>
                        (you)
                      </span>
                    )}
                    {isCurrent && <span className="turn-indicator"> (Turn)</span>}
                  </span>
                </div>
                <span
                  className="player-score-info"
                  style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}
                >
                  {player.totalScore ?? 0} points
                </span>
              </div>
              <div className="player-mini-hand">
                {sortedHand.map((card) => (
                  <MiniCard key={card.id} card={card} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
