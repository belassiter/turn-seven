import React from 'react';

interface GameHeaderProps {
  roundNumber: number;
  deckCount: number;
  discardCount: number;
  showOdds: boolean;
  onToggleOdds: () => void;
}

interface GameHeaderExtra {
  onOpenRules?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps & GameHeaderExtra> = ({
  showOdds,
  onToggleOdds,
  onOpenRules,
}) => {
  return (
    <header className="game-header">
      <div className="header-left">
        <div className="logo-container">
          <img src="/logo.png" alt="Turn Seven Logo" className="game-logo" />
        </div>
      </div>
      <div className="header-center">{/* Round number moved to main area */}</div>
      <div className="header-right">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className={`btn-icon-toggle ${showOdds ? 'active' : ''}`}
            onClick={onToggleOdds}
            title={showOdds ? 'Hide Odds' : 'Show Odds'}
            aria-label={showOdds ? 'Hide Odds' : 'Show Odds'}
          >
            🎲
          </button>
          <button
            className="btn-icon-toggle"
            onClick={onOpenRules}
            title="Show Rules"
            aria-label="Show Rules"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  );
};
