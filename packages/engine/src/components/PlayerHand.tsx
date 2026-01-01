import React from 'react';
import { Card } from './Card';
import { CardModel } from '../types';

export interface PlayerHandProps {
  cards: CardModel[];
  isCurrentPlayer?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ cards, isCurrentPlayer = false }) => {
  const handClasses = ['player-hand', isCurrentPlayer ? 'current-player' : ''].join(' ');

  return (
    <div className={handClasses}>
      {cards.map((card) => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
};
