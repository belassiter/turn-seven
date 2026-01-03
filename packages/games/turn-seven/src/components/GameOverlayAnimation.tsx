import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export type OverlayAnimationType = 'bust' | 'lifesaver' | 'lock' | 'turn3' | 'turn7';

interface GameOverlayAnimationProps {
  type: OverlayAnimationType;
  onComplete: () => void;
}

export const GameOverlayAnimation: React.FC<GameOverlayAnimationProps> = ({ type, onComplete }) => {
  const DURATION = import.meta.env.MODE === 'test' ? 100 : 2500;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, DURATION); // Total duration
    return () => {
      clearTimeout(timer);
    };
  }, [onComplete, DURATION]);

  const content = (() => {
    switch (type) {
      case 'bust':
        return (
          <span
            style={{
              color: '#ef4444',
              fontFamily: 'Inter, sans-serif',
              fontSize: 'min(15vw, 6rem)',
              whiteSpace: 'nowrap',
            }}
          >
            💥 BUST 💥
          </span>
        );
      case 'lifesaver':
        return (
          <span
            style={{
              color: '#f97316',
              fontFamily: 'Inter, sans-serif',
              fontSize: 'min(10vw, 4rem)',
              whiteSpace: 'nowrap',
            }}
          >
            🛟 LIFE SAVED 🛟
          </span>
        );
      case 'lock':
        return (
          <img src="/lock.png" alt="Locked" style={{ width: 'min(200px, 50vw)', height: 'auto' }} />
        );
      case 'turn3':
        return (
          <img
            src="/turn3.png"
            alt="Turn Three"
            style={{ width: 'min(200px, 50vw)', height: 'auto' }}
          />
        );
      case 'turn7':
        return (
          <img
            src="/logo.png"
            alt="Turn Seven"
            style={{ width: 'min(300px, 70vw)', height: 'auto' }}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <motion.div
      className="game-overlay-animation"
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.2, 1.5, 1.8, 2], // Grow large
      }}
      transition={{
        duration: DURATION / 1000,
        times: [0, 0.2, 0.8, 1], // Fast in, hold, fade out
        ease: 'easeInOut',
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
        fontWeight: 900,
        textShadow:
          '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      {content}
    </motion.div>
  );
};
