import React from 'react';
import { PlayerHand } from './PlayerHand';
import { computeHandScore } from '../logic/scoring';
import { Card, CardModel } from './Card';

export interface PlayerModel {
  id: string;
  name: string;
  hand: CardModel[];
  // Optional flags useful for games: whether the player has chosen to stay or is active
  hasStayed?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  hasBusted?: boolean;
  // Whether the player is holding a Life Saver action
  hasLifeSaver?: boolean;
  // Action cards held for later play (action cards drawn during play)
  reservedActions?: CardModel[];
  // IDs of action cards that must be resolved immediately (cannot HIT or STAY until resolved)
  pendingImmediateActionIds?: string[];
  // per-round and cumulative scores
  roundScore?: number;
  totalScore?: number;
}

export interface GameBoardProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  deck: CardModel[]; // or just a number
  discardPile: CardModel[];
  roundNumber?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({ players, currentPlayerId, deck, discardPile, roundNumber }) => {
  // computeHandScore imported from engine's logic/scoring

  return (
    <div className="game-board">
      <div className="players-area">
        {players.map(player => (
          <div key={player.id} className="player-area">
            <h2>
              <span className="player-name">{player.name}</span>
              {player.hasBusted ? (
                <span>{` - Busted!`}</span>
              ) : (
                <span>{` - ${computeHandScore(player.hand)}${player.isLocked ? ' (Locked)' : ''}`}</span>
              )}
            </h2>
            <PlayerHand
              cards={player.hand}
              isCurrentPlayer={player.id === currentPlayerId}
            />
          </div>
        ))}
      </div>
      <div className="common-area">
        <div className="deck-area">
          {roundNumber && <div className="round-number">Round {roundNumber}</div>}
          <div className="card-pile">
            <div className="card-back"></div>
            <span>Deck: {deck.length}</span>
          </div>
        </div>
        <div className="discard-pile-area">
           <div className="card-pile">
            {discardPile.length > 0 ? <Card card={{...discardPile[discardPile.length - 1], isFaceUp: true}} /> : <div className="card-placeholder"></div>}
            <span>Discard: {discardPile.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
