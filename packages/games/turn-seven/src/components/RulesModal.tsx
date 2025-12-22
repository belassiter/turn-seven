import React from 'react';
import { ReactComponent as RulesContent } from '../player-rules.md';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rules-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rules</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="markdown-body">
            <RulesContent />
          </div>
        </div>
      </div>
    </div>
  );
};
