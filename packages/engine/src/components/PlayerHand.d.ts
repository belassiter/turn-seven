import React from 'react';
import { CardModel } from './Card';
export interface PlayerHandProps {
    cards: CardModel[];
    isCurrentPlayer?: boolean;
}
export declare const PlayerHand: React.FC<PlayerHandProps>;
