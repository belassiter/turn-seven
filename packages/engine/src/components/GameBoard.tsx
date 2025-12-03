import React from 'react';
import { PlayerHand } from './PlayerHand';
import { Card, CardModel } from './Card';

export interface PlayerModel {
  id: string;
  name: string;
  hand: CardModel[];
  // Optional flags useful for games: whether the player has chosen to stay or is active
  hasStayed?: boolean;
  isFrozen?: boolean;
  isActive?: boolean;
  hasBusted?: boolean;
  // Whether the player is holding a Second Chance action
  hasSecondChance?: boolean;
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
}

export const GameBoard: React.FC<GameBoardProps> = ({ players, currentPlayerId, deck, discardPile }) => {
  const computeHandScore = (hand: CardModel[] = []) => {
    let numberSum = 0;
    let multiplierCount = 0;
    let plusModifiers = 0;

    for (const c of hand) {
      if (!c.suit || c.suit === 'number') {
        const v = parseInt(String(c.rank), 10);
        if (!isNaN(v)) numberSum += v;
      } else if (c.suit === 'modifier') {
        const r = String(c.rank);
        if (r.startsWith('x')) {
          const mult = parseInt(r.slice(1), 10);
          if (!isNaN(mult) && mult === 2) multiplierCount += 1;
        } else if (r.startsWith('+')) {
          const add = parseInt(r.slice(1), 10);
          if (!isNaN(add)) plusModifiers += add;
        }
      }
      // action cards do not affect scoring
    }

    const multiplier = Math.pow(2, multiplierCount);
    let roundTotal = numberSum * multiplier + plusModifiers;

    const uniqueNumbers = new Set(hand.filter(h => !h.suit || h.suit === 'number').map(h => h.rank));
    if (uniqueNumbers.size >= 7) roundTotal += 15;
    return roundTotal;
  };

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
                <span>{` - ${computeHandScore(player.hand)}${player.isFrozen ? ' (Frozen)' : ''}`}</span>
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
