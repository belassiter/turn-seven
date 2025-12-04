import React from 'react';

interface GameHeaderProps {
  roundNumber: number;
  deckCount: number;
  discardCount: number;
  showOdds: boolean;
  onToggleOdds: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ roundNumber, deckCount, discardCount, showOdds, onToggleOdds }) => {
  return (
    <header className="game-header">
      <div className="header-left">
        <div className="logo-container">
          <img src="/logo.png" alt="Turn Seven Logo" className="game-logo" />
        </div>
      </div>
      <div className="header-center">
        {/* Round number moved to main area */}
      </div>
      <div className="header-right">
        <button 
          className={`btn-icon-toggle ${showOdds ? 'active' : ''}`}
          onClick={onToggleOdds}
          title={showOdds ? 'Hide Odds' : 'Show Odds'}
        >
          {showOdds ? '🎲 Hide Odds' : '🎲 Odds'}
        </button>
      </div>
    </header>
  );
};
