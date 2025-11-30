import React from 'react';
import { CardModel } from './Card';
export interface PlayerModel {
    id: string;
    name: string;
    hand: CardModel[];
}
export interface GameBoardProps {
    players: PlayerModel[];
    currentPlayerId?: string;
    deck: CardModel[];
    discardPile: CardModel[];
}
export declare const GameBoard: React.FC<GameBoardProps>;
