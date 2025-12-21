import React from 'react';
import { PlayerModel } from '@turn-seven/engine';
import { getPlayerColor, getDifficultyColor } from '../utils/colors';

interface PlayerHudProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  onPlayerClick: () => void;
}

const getCardCountEmoji = (count: number) => {
  const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return emojis[count] || `${count}`;
};

export const PlayerHud: React.FC<PlayerHudProps> = ({
  players,
  currentPlayerId,
  onPlayerClick,
}) => {
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    if (diff > 30) {
      // Dragged up
      onPlayerClick();
    }
    touchStartY.current = null;
  };

  return (
    <div
      className="player-hud mobile-only"
      onClick={onPlayerClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hud-handle-indicator" />
      <div className="hud-grid">
        {players.map((p) => {
          // Use totalScore (from last turn/cumulative) instead of current hand score
          const score = p.totalScore ?? 0;
          const numberCards = p.hand.filter((c) => !c.suit || c.suit === 'number').length;
          const isActive = p.id === currentPlayerId;
          const color =
            p.isBot && p.botDifficulty
              ? getDifficultyColor(p.botDifficulty)
              : getPlayerColor(p.name, p.isBot || false);

          return (
            <div
              key={p.id}
              className={`hud-player-cell ${isActive ? 'active' : ''} ${
                !p.isActive ? 'inactive' : ''
              }`}
              style={{ borderColor: isActive ? color : 'transparent' }}
            >
              <span className="hud-cell-status">
                {p.hasBusted ? '💥' : p.isLocked ? '🔒' : p.hasStayed ? '🛑' : ''}
                {p.hasLifeSaver && !p.hasBusted && !p.hasStayed ? '🛟' : ''}
              </span>
              <span className="hud-cell-score" style={{ color }}>
                {score}
              </span>
              <span className="hud-cell-cards">{getCardCountEmoji(numberCards)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
