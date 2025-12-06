import React, { useMemo } from 'react';
import { CardModel, Card } from '@turn-seven/engine';

interface ActivePlayerHandProps {
  hand: CardModel[];
}

export const ActivePlayerHand: React.FC<ActivePlayerHandProps> = ({ hand }) => {
  const { specialCards, numberCards } = useMemo(() => {
    const special: CardModel[] = [];
    const numbers: CardModel[] = [];

    hand.forEach((card) => {
      if (card.suit === 'number') {
        numbers.push(card);
      } else {
        special.push(card);
      }
    });

    // Sort number cards ascending
    numbers.sort((a, b) => {
      const valA = parseInt(String(a.rank), 10) || 0;
      const valB = parseInt(String(b.rank), 10) || 0;
      return valA - valB;
    });

    // Sort special cards? Maybe by type (suit) then rank?
    // For now, just keep them in order or maybe group by suit
    special.sort((a, b) => String(a.suit).localeCompare(String(b.suit)));

    return { specialCards: special, numberCards: numbers };
  }, [hand]);

  return (
    <div className="active-player-hand">
      {specialCards.length > 0 && (
        <div className="hand-row special-row">
          <div className="cards-container">
            {specialCards.map((card) => (
              <Card key={card.id} card={{ ...card, isFaceUp: true }} />
            ))}
          </div>
        </div>
      )}

      <div className="hand-row number-row">
        <div className="cards-container">
          {numberCards.length > 0
            ? numberCards.map((card) => <Card key={card.id} card={{ ...card, isFaceUp: true }} />)
            : null}
        </div>
      </div>
    </div>
  );
};
