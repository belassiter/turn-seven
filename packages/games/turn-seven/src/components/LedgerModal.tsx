import React from 'react';
import { LedgerEntry } from '@turn-seven/engine';

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledger: LedgerEntry[];
}

export const LedgerModal: React.FC<LedgerModalProps> = ({ isOpen, onClose, ledger }) => {
  if (!isOpen) return null;

  // Sort by timestamp descending (newest first)
  const sortedLedger = [...ledger].sort((a, b) => b.timestamp - a.timestamp);

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
                  <td style={{ padding: '8px' }}>{entry.playerName}</td>
                  <td style={{ padding: '8px' }}>{entry.action}</td>
                  <td style={{ padding: '8px' }}>
                    {entry.result}
                    {entry.targetName && ` (on ${entry.targetName})`}
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
