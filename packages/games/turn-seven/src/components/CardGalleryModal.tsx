import React from 'react';
import { Card } from '@turn-seven/engine';
import { CardModel } from '@turn-seven/engine';

interface CardGalleryModalProps {
  onClose: () => void;
}

export const CardGalleryModal: React.FC<CardGalleryModalProps> = ({ onClose }) => {
  // Generate all card types for display
  const numberCards: CardModel[] = Array.from({ length: 13 }, (_, i) => ({
    id: `gallery-n-${i}`,
    suit: 'number',
    rank: String(i),
    isFaceUp: true,
  }));

  const modifierCards: CardModel[] = [
    { id: 'gallery-m-2', suit: 'modifier', rank: '+2', isFaceUp: true },
    { id: 'gallery-m-4', suit: 'modifier', rank: '+4', isFaceUp: true },
    { id: 'gallery-m-6', suit: 'modifier', rank: '+6', isFaceUp: true },
    { id: 'gallery-m-8', suit: 'modifier', rank: '+8', isFaceUp: true },
    { id: 'gallery-m-10', suit: 'modifier', rank: '+10', isFaceUp: true },
    { id: 'gallery-m-x2', suit: 'modifier', rank: 'x2', isFaceUp: true },
  ];

  const actionCards: CardModel[] = [
    { id: 'gallery-a-lock', suit: 'action', rank: 'Lock', isFaceUp: true },
    { id: 'gallery-a-t3', suit: 'action', rank: 'TurnThree', isFaceUp: true },
    { id: 'gallery-a-ls', suit: 'action', rank: 'LifeSaver', isFaceUp: true },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Card Gallery</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <section>
              <h3
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: 8,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                Number Cards
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                {numberCards.map((c) => (
                  <Card key={c.id} card={c} />
                ))}
              </div>
            </section>

            <section>
              <h3
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: 8,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                Modifier Cards
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                {modifierCards.map((c) => (
                  <Card key={c.id} card={c} />
                ))}
              </div>
            </section>

            <section>
              <h3
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: 8,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                Action Cards
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                {actionCards.map((c) => (
                  <Card key={c.id} card={c} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
