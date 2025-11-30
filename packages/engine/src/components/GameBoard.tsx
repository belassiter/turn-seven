import React from 'react';
import { PlayerHand } from './PlayerHand';
import { Card, CardModel } from './Card';

export interface PlayerModel {
  id: string;
  name: string;
  hand: CardModel[];
  // Optional flags useful for games: whether the player has chosen to stay or is active
  hasStayed?: boolean;
  isActive?: boolean;
  hasBusted?: boolean;
  // per-round and cumulative scores
  roundScore?: number;
  totalScore?: number;
}

export interface GameBoardProps {
  players: PlayerModel[];
  currentPlayerId?: string;
  deck: CardModel[]; // or just a number
  discardPile: CardModel[];
}

export const GameBoard: React.FC<GameBoardProps> = ({ players, currentPlayerId, deck, discardPile }) => {
  return (
    <div className="game-board">
      <div className="players-area">
        {players.map(player => (
          <div key={player.id} className="player-area">
            <h2>{player.name}</h2>
            <PlayerHand
              cards={player.hand}
              isCurrentPlayer={player.id === currentPlayerId}
            />
          </div>
        ))}
      </div>
      <div className="common-area">
        <div className="deck-area">
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
