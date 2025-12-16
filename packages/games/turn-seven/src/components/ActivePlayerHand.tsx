import React, { useMemo } from 'react';
import { CardModel, Card } from '@turn-seven/engine';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivePlayerHandProps {
  hand: CardModel[];
  isBusted?: boolean;
  isLocked?: boolean;
  hasStayed?: boolean;
}

export const ActivePlayerHand: React.FC<ActivePlayerHandProps> = ({
  hand,
  isBusted,
  isLocked,
  hasStayed,
}) => {
  const { specialCards, numberCards } = useMemo(() => {
    const special: CardModel[] = [];
    const numbers: CardModel[] = [];

    // Deduplicate hand to prevent React key warnings
    const uniqueHandMap = new Map();
    hand.forEach((c) => uniqueHandMap.set(c.id, c));
    const uniqueHand = Array.from(uniqueHandMap.values());

    uniqueHand.forEach((card) => {
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
    <div className="active-player-hand" style={{ position: 'relative' }}>
      <AnimatePresence>
        {isBusted && (
          <motion.div
            key="busted"
            className="busted-overlay"
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              fontSize: '4rem',
              fontWeight: 'bold',
              color: '#ef4444',
              textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff',
              pointerEvents: 'none',
            }}
          >
            BUSTED!
          </motion.div>
        )}
        {!isBusted && isLocked && (
          <motion.div
            key="locked"
            className="locked-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#3b82f6',
              textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff',
              pointerEvents: 'none',
            }}
          >
            LOCKED 🔒
          </motion.div>
        )}
        {!isBusted && !isLocked && hasStayed && (
          <motion.div
            key="stayed"
            className="stayed-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#ef4444',
              textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff',
              pointerEvents: 'none',
            }}
          >
            STAYED 🛑
          </motion.div>
        )}
      </AnimatePresence>

      {specialCards.length > 0 && (
        <div className="hand-row special-row">
          <div className="cards-container">
            <AnimatePresence>
              {specialCards.map((card) => (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.5, y: -50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Card card={{ ...card, isFaceUp: true }} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="hand-row number-row">
        <div className="cards-container">
          <AnimatePresence>
            {numberCards.length > 0
              ? numberCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layoutId={card.id}
                    initial={{ opacity: 0, scale: 0.5, y: -50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card card={{ ...card, isFaceUp: true }} />
                  </motion.div>
                ))
              : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
