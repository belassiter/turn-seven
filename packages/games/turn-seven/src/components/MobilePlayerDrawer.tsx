import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerSidebar } from './PlayerSidebar';
import { PlayerModel } from '@turn-seven/engine';

interface MobilePlayerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerModel[];
  currentPlayerId?: string;
  isTargetingMode?: boolean;
  targetingActorId?: string;
  onTargetPlayer?: (playerId: string) => void;
  onPlayerNameClick?: (player: PlayerModel) => void;
}

export const MobilePlayerDrawer: React.FC<MobilePlayerDrawerProps> = ({
  isOpen,
  onClose,
  players,
  currentPlayerId,
  isTargetingMode,
  targetingActorId,
  onTargetPlayer,
  onPlayerNameClick,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="drawer-backdrop mobile-only"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="mobile-player-drawer mobile-only"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="drawer-handle-bar" onClick={onClose}>
              <div className="drawer-handle" />
            </div>
            <div className="drawer-content">
              <PlayerSidebar
                players={players}
                currentPlayerId={currentPlayerId}
                isTargetingMode={isTargetingMode}
                targetingActorId={targetingActorId}
                onTargetPlayer={(id) => {
                  if (onTargetPlayer) onTargetPlayer(id);
                  // Auto-close on selection if in targeting mode
                  if (isTargetingMode) onClose();
                }}
                onPlayerNameClick={onPlayerNameClick}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
