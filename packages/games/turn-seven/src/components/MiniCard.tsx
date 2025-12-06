import React from 'react';
import { CardModel } from '@turn-seven/engine';
import { motion } from 'framer-motion';

interface MiniCardProps {
  card: CardModel;
}

export const MiniCard: React.FC<MiniCardProps> = ({ card }) => {
  const { rank, suit } = card;
  const isNumber = suit === 'number';
  const isAction = suit === 'action';

  let displayRank = String(rank);

  // Abbreviate action names
  if (isAction) {
    // Support both spaced "Turn Three" and camelcase "TurnThree" forms used in tests
    if (displayRank === 'Turn Three') displayRank = 'T3';
    else if (displayRank === 'TurnThree') displayRank = 'T3';
    else if (displayRank === 'Lock') displayRank = '🔒';
    else if (displayRank === 'LifeSaver' || displayRank === 'Life Saver') displayRank = '🛟';
    else if (displayRank === 'Double Down') displayRank = 'x2'; // Assuming this exists or similar
    else {
      // Fallback: First letter
      displayRank = displayRank.charAt(0);
    }
  }

  // Ensure the right helper classes exist so CSS rules apply consistently for number, action and modifier mini-cards
  const helperClass = isNumber
    ? 'mini-card-number'
    : suit === 'action'
    ? 'mini-card-action'
    : 'mini-card-modifier';

  const classes = [
    'mini-card',
    `mini-card-${suit}`,
    `rank-${String(rank).toLowerCase()}`,
    helperClass,
  ].join(' ');

  return (
    <motion.div className={classes} title={`${rank} (${suit})`} layoutId={card.id}>
      <span className="mini-card-content">{displayRank}</span>
    </motion.div>
  );
};
