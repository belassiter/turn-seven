import React from 'react';
import { LedgerEntry, PlayerModel } from '@turn-seven/engine';
import { getPlayerColor, getDifficultyColor } from '../utils/colors';

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledger: LedgerEntry[];
  players: PlayerModel[];
}

export const LedgerModal: React.FC<LedgerModalProps> = ({ isOpen, onClose, ledger, players }) => {
  if (!isOpen) return null;

  // Sort by timestamp descending (newest first).
  // If timestamps are equal, use the original index (reversed) to maintain Newest First for simultaneous events.
  const sortedLedger = [...ledger]
    .map((entry, index) => ({ ...entry, originalIndex: index }))
    .sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return b.originalIndex - a.originalIndex;
    });

  const getColorForName = (name: string) => {
    const p = players.find((p) => p.name === name);
    if (p?.isBot && p.botDifficulty) {
      return getDifficultyColor(p.botDifficulty);
    }
    return getPlayerColor(name, p?.isBot || false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ledger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Game Ledger</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <table className="ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Round</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Action</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {sortedLedger.map((entry, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{entry.roundNumber}</td>
                  <td
                    style={{
                      padding: '8px',
                      color: getColorForName(entry.playerName),
                    }}
                  >
                    {entry.playerName}
                  </td>
                  <td style={{ padding: '8px' }}>{entry.action}</td>
                  <td style={{ padding: '8px' }}>
                    {entry.result}
                    {entry.targetName && (
                      <>
                        {' (on '}
                        <span
                          style={{
                            color: getColorForName(entry.targetName),
                          }}
                        >
                          {entry.targetName}
                        </span>
                        {')'}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {sortedLedger.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '16px' }}>
                    No actions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
