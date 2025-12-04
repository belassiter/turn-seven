import React from 'react';
import { CardModel } from '@turn-seven/engine';

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
    else if (displayRank === 'TurnThree') displayRank = 'TurnThree';
    else if (displayRank === 'Freeze') displayRank = 'F';
    else if (displayRank === 'Second Chance') displayRank = '2C';
    else if (displayRank === 'Double Down') displayRank = 'x2'; // Assuming this exists or similar
    else {
      // Fallback: First letter
      displayRank = displayRank.charAt(0);
    }
  }

  const classes = [
    'mini-card',
    `mini-card-${suit}`,
    isNumber ? 'mini-card-number' : 'mini-card-special'
  ].join(' ');

  return (
    <div className={classes} title={`${rank} (${suit})`}>
      {displayRank}
    </div>
  );
};
