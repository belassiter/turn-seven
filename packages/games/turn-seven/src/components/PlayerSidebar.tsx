import React from 'react';
import { PlayerModel } from '@turn-seven/engine';
import { MiniCard } from './MiniCard';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlayerColor, getDifficultyColor } from '../utils/colors';

interface PlayerSidebarProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  onTargetPlayer?: (playerId: string) => void;
  isTargetingMode?: boolean;
  targetingActorId?: string;
}

const logAnimation = (name: string, trigger: string, details: any = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'ANIMATION_LOG',
      name,
      trigger,
      ...details,
    })
  );
};

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  players,
  currentPlayerId,
  onTargetPlayer,
  isTargetingMode,
}) => {
  return (
    <div className="player-sidebar">
      <div className="sidebar-list">
        {players.map((player) => {
          const isCurrent = player.id === currentPlayerId;
          const isTargetable = isTargetingMode && player.isActive; // Simplified targeting logic
          const isInactiveTarget = isTargetingMode && !player.isActive;

          const handleClick = () => {
            if (isTargetingMode && onTargetPlayer && player.isActive) {
              onTargetPlayer(player.id);
            }
          };

          // Filter out pending actions (cards currently being resolved/targeted) so they don't appear in the sidebar prematurely
          // Only do this for the current player, as they have a dedicated UI for pending actions.
          // For other players, we want to see all their cards.
          // UPDATE: Users found it confusing that cards disappeared. Showing all cards (even pending) is better.
          const visibleHand = player.hand;

          // Deduplicate hand to prevent React key warnings if state has transient duplicates
          const uniqueHandMap = new Map();
          visibleHand.forEach((c) => uniqueHandMap.set(c.id, c));
          const uniqueHand = Array.from(uniqueHandMap.values());

          // Sort hand: Numbers (asc) -> +X (asc) -> x2 -> Actions
          const sortedHand = [...uniqueHand].sort((a, b) => {
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
              id={`player-row-${player.id}`}
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
              onAnimationStart={(definition) =>
                logAnimation('Sidebar Player Row', 'animate', {
                  playerId: player.id,
                  isBusted: player.hasBusted,
                  definition,
                })
              }
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
                          onAnimationStart={(definition) =>
                            logAnimation('Sidebar Status Icon', 'animate', {
                              playerId: player.id,
                              status: 'busted',
                              definition,
                            })
                          }
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
                          onAnimationStart={(definition) =>
                            logAnimation('Sidebar Status Icon', 'animate', {
                              playerId: player.id,
                              status: 'locked',
                              definition,
                            })
                          }
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
                          onAnimationStart={(definition) =>
                            logAnimation('Sidebar Status Icon', 'animate', {
                              playerId: player.id,
                              status: 'stayed',
                              definition,
                            })
                          }
                        >
                          🛑
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <span
                    className="player-name"
                    style={{
                      color:
                        player.isBot && player.botDifficulty
                          ? getDifficultyColor(player.botDifficulty)
                          : getPlayerColor(player.name, player.isBot || false),
                    }}
                  >
                    {player.name}
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
                <AnimatePresence initial={false}>
                  {sortedHand.map((card) => (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      onAnimationStart={(definition) =>
                        logAnimation('Sidebar Card', 'animate', {
                          playerId: player.id,
                          cardId: card.id,
                          rank: card.rank,
                          suit: card.suit,
                          definition,
                        })
                      }
                      onLayoutAnimationStart={() =>
                        logAnimation('Sidebar Card', 'layout', {
                          playerId: player.id,
                          cardId: card.id,
                          rank: card.rank,
                          suit: card.suit,
                        })
                      }
                    >
                      <MiniCard
                        card={card}
                        disableLayoutId={isCurrent}
                        onLayoutAnimationStart={() =>
                          logAnimation('Sidebar Card', 'layout', {
                            playerId: player.id,
                            cardId: card.id,
                            rank: card.rank,
                            suit: card.suit,
                            subType: 'shared-element',
                          })
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
