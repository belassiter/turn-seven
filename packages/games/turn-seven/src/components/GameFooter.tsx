import React from 'react';

export const GameFooter: React.FC = () => {
  return (
    <footer className="game-footer">
      <div className="footer-links">
        <span>Turn Seven © {new Date().getFullYear()}</span>
        <a href="https://github.com/belassiter/turn-seven" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://theop.games/products/flip-7" target="_blank" rel="noopener noreferrer">Buy the Flip 7 card game!</a>
      </div>
    </footer>
  );
};
