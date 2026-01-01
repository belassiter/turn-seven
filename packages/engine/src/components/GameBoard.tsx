import React from 'react';
import { PlayerHand } from './PlayerHand';
import { computeHandScore } from '../logic/scoring';
import { Card } from './Card';
import { PlayerModel, CardModel } from '../types';

export interface GameBoardProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  deck: CardModel[]; // or just a number
  discardPile: CardModel[];
  roundNumber?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayerId,
  deck,
  discardPile,
  roundNumber,
}) => {
  // computeHandScore imported from engine's logic/scoring

  return (
    <div className="game-board">
      <div className="players-area">
        {players.map((player) => (
          <div key={player.id} className="player-area">
            <h2>
              <span className="player-name">{player.name}</span>
              {player.hasBusted ? (
                <span>{` - Busted!`}</span>
              ) : (
                <span>{` - ${computeHandScore(player.hand)}${
                  player.isLocked ? ' (Locked)' : ''
                }`}</span>
              )}
            </h2>
            <PlayerHand cards={player.hand} isCurrentPlayer={player.id === currentPlayerId} />
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
            {discardPile.length > 0 ? (
              <Card card={{ ...discardPile[discardPile.length - 1], isFaceUp: true }} />
            ) : (
              <div className="card-placeholder"></div>
            )}
            <span>Discard: {discardPile.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
